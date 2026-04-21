// Backend orquestrador do ENGAJAÍ.
// Fluxo: validação → cache → rate limit → fetch de tendências do YouTube
//         → prompt → Gemini → filtragem por plataforma → cache → resposta.
// (Cache vem antes do rate limit: respostas em cache não queimam Gemini,
//  então não faz sentido contar contra o limite do usuário.)
//
// Estratégia de dados reais:
//   • YouTube Data API v3 (grátis) = fonte única de sinal real de tendências
//     por tema. Funciona como proxy da cultura viral — o que bomba no YouTube
//     em geral também bomba no TikTok/Reels (a cultura viral atravessa redes).
//   • TikTok / Instagram: sem API gratuita confiável. O Gemini adapta o sinal
//     do YouTube + conhecimento próprio para o estilo de cada plataforma.

import { validateGenerateBody } from "@/lib/validation";
import { checkRateLimit } from "@/lib/ratelimit";
import { cache } from "@/lib/cache";
import { fetchYouTubeTrends } from "@/lib/youtube";
import { generate, isQuotaError } from "@/lib/gemini";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // nunca pré-renderize
export const maxDuration = 30;         // Vercel Hobby permite até 60s

const FINAL_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

export async function POST(request) {
  // 1) Parse + validação
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_INPUT", "Requisição inválida (JSON malformado).");
  }

  const validation = validateGenerateBody(body);
  if (!validation.ok) {
    return errorResponse(400, validation.error.code, validation.error.message);
  }
  const { platform, platforms, topic, language } = validation.data;

  const ip = getClientIp(request);

  // 2) Cache check (resposta final) — vem ANTES do rate limit porque
  //    cached response não consome quota do Gemini, então não faz sentido
  //    contar contra o limite do usuário.
  const cacheKey = `gen:${platform}:${topic.toLowerCase()}:${language}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return Response.json({ ...cached, fromCache: true });
  }

  // 3) Rate limit — só agora, antes da chamada cara ao Gemini.
  //    Protege a quota do free tier contra abuso (scripts, spam).
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return errorResponse(
      429,
      "RATE_LIMITED",
      buildRateLimitMessage(rl.retryAfterSeconds)
    );
  }

  // TODO: Monetização — PRO GATE aqui
  //   Free: 3 requests/dia, max 1 plataforma
  //   Pro: ilimitado, todas plataformas, export CSV

  // 4) Fetch de tendências do YouTube (tolerante a falhas)
  let youtubeContext = [];
  try {
    const yt = await fetchYouTubeTrends(topic, language);
    if (Array.isArray(yt)) youtubeContext = yt;
  } catch (err) {
    console.error("[api/generate] YouTube fetch error:", err?.message);
  }

  // 5) Construir prompt
  const userPrompt = buildUserPrompt({
    topic,
    platforms,
    language,
    youtubeContext,
  });

  // 6) Chamar Gemini
  let generated;
  try {
    generated = await generate({ system: SYSTEM_PROMPT, user: userPrompt });
  } catch (err) {
    console.error("[api/generate] Gemini error:", err?.message);
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
      "Não conseguimos gerar ideias agora. Tente de novo em alguns segundos."
    );
  }

  // 7) Filtrar só as plataformas pedidas + sanitizar hashtags
  const wanted = new Set(platforms);
  const filtered = {
    platforms: (generated?.platforms ?? [])
      .filter((p) => wanted.has(p?.name))
      .map((p) => ({
        ...p,
        hashtags: sanitizeHashtags(p.hashtags),
      })),
  };

  if (filtered.platforms.length === 0) {
    return errorResponse(
      502,
      "GEMINI_FAILED",
      "A IA não retornou resultados válidos. Tente de novo."
    );
  }

  // 8) Cache + resposta
  const payload = {
    ok: true,
    data: filtered,
    usedRealData: {
      youtube: youtubeContext.length > 0,
    },
  };
  cache.set(cacheKey, payload, FINAL_CACHE_TTL_MS);

  return Response.json(payload);
}

function errorResponse(status, code, message) {
  return Response.json(
    { ok: false, error: { code, message } },
    { status }
  );
}

function getClientIp(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Mensagem de rate limit adaptada ao tempo de espera:
 *   < 2 min   → "tente em Xs"
 *   < 1 hora  → "tente em X minutos"
 *   >= 1 hora → "você atingiu o limite diário, volte em Xh"
 */
function buildRateLimitMessage(retryAfterSeconds) {
  const s = Number(retryAfterSeconds) || 60;
  if (s < 120) {
    return `Você está gerando rápido demais! Tente de novo em ${s}s.`;
  }
  if (s < 3600) {
    const minutes = Math.ceil(s / 60);
    return `Você está gerando rápido demais! Tente de novo em ${minutes} min.`;
  }
  const hours = Math.ceil(s / 3600);
  return `Você atingiu o limite diário de gerações. Volte em ~${hours}h.`;
}

/**
 * Garante que todas as hashtags começam com '#', removem duplicadas, vazias
 * e caracteres inválidos. Limita a 15.
 */
function sanitizeHashtags(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const result = [];
  for (const tag of raw) {
    if (typeof tag !== "string") continue;
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    // remove espaços internos e caracteres inválidos
    const clean = withHash.replace(/\s+/g, "");
    if (clean.length < 2 || clean.length > 40) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
    if (result.length >= 15) break;
  }
  return result;
}
