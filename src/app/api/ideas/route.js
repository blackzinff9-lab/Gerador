// Endpoint "Conteúdo Infinito" — gera 10 próximos vídeos interligados
// a partir de um tema-semente e opcionalmente dos títulos já gerados.
//
// Justificativa: depois que o usuário vê os resultados iniciais, oferecer
// 10 ideias de continuação cria "playlist de algoritmo" — vídeos do mesmo
// nicho que puxam o mesmo público, aumentando retenção do canal.
//
// Fluxo idêntico ao /api/generate:
//   validação → cache → rate limit → Gemini → sanitização → resposta.

import { validateIdeasBody } from "@/lib/validation";
import { checkRateLimit } from "@/lib/ratelimit";
import { cache } from "@/lib/cache";
import { generate, isQuotaError } from "@/lib/gemini";
import { IDEAS_SYSTEM_PROMPT, buildIdeasPrompt } from "@/lib/prompts";
import { ideasResponseSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel Hobby permite até 60s. Ficamos longe desse limite na prática, mas 30s
// era apertado quando o Gemini demorava um pouco e causava 504 no front —
// chega como "erro" genérico pro usuário. 60s dá folga.
export const maxDuration = 60;

const IDEAS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const CACHE_PREFIX = "ideas3";                 // v3 — após hardening do endpoint

export async function POST(request) {
  // 1) Parse + validação
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      400,
      "INVALID_INPUT",
      "Requisição inválida (JSON malformado)."
    );
  }

  const validation = validateIdeasBody(body);
  if (!validation.ok) {
    return errorResponse(400, validation.error.code, validation.error.message);
  }
  const { topic, language, platform, seedTitles } = validation.data;

  const ip = getClientIp(request);

  // 2) Cache — não inclui seedTitles na chave porque o próprio tema já
  //    determina a "série". Reutilizar entre usuários que pedirem ideias
  //    sobre o mesmo tema é desejável.
  const cacheKey = [
    CACHE_PREFIX,
    platform,
    topic.toLowerCase(),
    language,
  ].join(":");
  const cached = cache.get(cacheKey);
  if (cached) {
    return Response.json({ ...cached, fromCache: true });
  }

  // 3) Rate limit — mesma conta do /api/generate (é uma chamada Gemini).
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return errorResponse(
      429,
      "RATE_LIMITED",
      buildRateLimitMessage(rl.retryAfterSeconds)
    );
  }

  // 4) Prompt + chamada
  const userPrompt = buildIdeasPrompt({ topic, language, platform, seedTitles });

  let generated;
  try {
    generated = await generate({
      system: IDEAS_SYSTEM_PROMPT,
      user: userPrompt,
      schema: ideasResponseSchema,
      // 8192 em vez de 4096. O schema pede EXATAMENTE 10 itens e, se o
      // modelo "caprichar" em ganchos mais descritivos, um token limit
      // baixo podia cortar o JSON no meio. 8192 é uma folga gigantesca que
      // não custa nada a mais no free-tier do Gemini 1.5 Flash.
      maxTokens: 8192,
      temperature: 0.9, // ligeiramente mais criativo pra variedade entre as 10
    });
  } catch (err) {
    console.error("[api/ideas] Gemini error:", err?.message);
    if (isQuotaError(err)) {
      return errorResponse(
        503,
        "GEMINI_QUOTA_EXHAUSTED",
        "Atingimos o limite diário de gerações. Volte amanhã ou tente mais tarde."
      );
    }
    return errorResponse(
      502,
      "GEMINI_FAILED",
      "A IA demorou demais ou falhou ao gerar as 10 ideias. Tente de novo em alguns segundos."
    );
  }

  // 5) Sanitização defensiva — aceita quantas ideias vierem bem-formadas
  //    (pelo menos 5) em vez de exigir 10 perfeitas. Melhor entregar 7 válidas
  //    do que quebrar tudo porque 1 item veio com campo faltando.
  const ideas = sanitizeIdeas(generated?.ideas);
  if (ideas.length < 5) {
    console.error(
      "[api/ideas] too few valid ideas after sanitize:",
      ideas.length,
      "raw:",
      Array.isArray(generated?.ideas) ? generated.ideas.length : "not-array"
    );
    return errorResponse(
      502,
      "GEMINI_FAILED",
      "A IA não retornou ideias suficientes. Tente de novo."
    );
  }

  // 6) Cache + resposta
  const payload = { ok: true, data: { ideas } };
  cache.set(cacheKey, payload, IDEAS_CACHE_TTL_MS);

  return Response.json(payload);
}

function errorResponse(status, code, message) {
  return Response.json(
    { ok: false, error: { code, message } },
    { status }
  );
}

function getClientIp(request) {
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function buildRateLimitMessage(retryAfterSeconds) {
  const s = Number(retryAfterSeconds) || 60;
  if (s < 120) return `Você está gerando rápido demais! Tente de novo em ${s}s.`;
  if (s < 3600) {
    const minutes = Math.ceil(s / 60);
    return `Você está gerando rápido demais! Tente de novo em ${minutes} min.`;
  }
  const hours = Math.ceil(s / 3600);
  return `Você atingiu o limite diário de gerações. Volte em ~${hours}h.`;
}

/**
 * Remove ideias vazias/duplicadas e limita a 10.
 */
function sanitizeIdeas(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const result = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const hook = typeof item.hook === "string" ? item.hook.trim() : "";
    if (!title || !hook) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ title, hook });
    if (result.length >= 10) break;
  }
  return result;
}
