// Backend orquestrador do ENGAJAÍ.
// Fluxo: validação → rate limit → cache → fetch paralelo de tendências
//         → prompt → Gemini → filtragem por plataforma → cache → resposta.

import { validateGenerateBody } from "@/lib/validation";
import { checkRateLimit } from "@/lib/ratelimit";
import { cache } from "@/lib/cache";
import { fetchYouTubeTrends } from "@/lib/youtube";
import { fetchTikTokTrends } from "@/lib/tiktok";
import { generate, isQuotaError } from "@/lib/gemini";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompts";

export const runtime = "nodejs";       // tiktok-api-dl usa libs Node-only
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

  // 2) Rate limit (v1: stub)
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return errorResponse(
      429,
      "RATE_LIMITED",
      `Você está usando rápido demais! Tente novamente em ${rl.retryAfterSeconds ?? 60}s.`
    );
  }

  // TODO: Monetização — PRO GATE aqui
  //   Free: 3 requests/dia, max 1 plataforma
  //   Pro: ilimitado, todas plataformas, export CSV

  // 3) Cache check (resposta final)
  const cacheKey = `gen:${platform}:${topic.toLowerCase()}:${language}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return Response.json({ ...cached, fromCache: true });
  }

  // 4) Fetch paralelo de tendências (tolerante a falhas)
  const [ytSettled, ttSettled] = await Promise.allSettled([
    fetchYouTubeTrends(topic, language),
    fetchTikTokTrends(),
  ]);

  const youtubeContext =
    ytSettled.status === "fulfilled" && Array.isArray(ytSettled.value)
      ? ytSettled.value
      : [];
  const tiktokContext =
    ttSettled.status === "fulfilled" && Array.isArray(ttSettled.value)
      ? ttSettled.value
      : [];

  // 5) Construir prompt
  const userPrompt = buildUserPrompt({
    topic,
    platforms,
    language,
    youtubeContext,
    tiktokContext,
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
      tiktok: tiktokContext.length > 0,
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
