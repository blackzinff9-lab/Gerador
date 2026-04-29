// Backend orquestrador do ENGAJAÍ.
// Fluxo: validação → cache → rate limit → fetch de tendências do YouTube
//         → prompt → Groq → filtragem por plataforma → cache → resposta.
// (Cache vem antes do rate limit: respostas em cache não queimam Groq,
//  então não faz sentido contar contra o limite do usuário.)
//
// Estratégia de dados reais:
//   • YouTube Data API v3 (grátis) = fonte única de sinal real de tendências
//     por tema. Funciona como proxy da cultura viral — o que bomba no YouTube
//     em geral também bomba no TikTok/Reels (a cultura viral atravessa redes).
//   • TikTok / Instagram: sem API gratuita confiável. O Groq adapta o sinal
//     do YouTube + conhecimento próprio para o estilo de cada plataforma.

import { validateGenerateBody } from "@/lib/validation";
import { checkRateLimit } from "@/lib/ratelimit";
import { cache } from "@/lib/cache";
import { fetchYouTubeTrends } from "@/lib/youtube";
import { generate, isQuotaError } from "@/lib/groq";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompts";
import { NextResponse } from 'next/server';

export const maxDuration = 60; // Aumenta o timeout da serverless function para 60s
export const dynamic = "force-dynamic"; // nunca pré-renderize

const FINAL_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

// Prefixo groq1: novo schema (variants por plataforma — título/descrição/hashtags
// passam a vir por variant). Troca de prefixo invalida automaticamente qualquer
// cache antigo em warm instances sem precisar limpar nada manualmente.
const CACHE_PREFIX = "groq1";

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
  const { platform, platforms, topic, language, hasVideo, wantsScript } =
    validation.data;

  const ip = getClientIp(request);

  // 2) Cache check (resposta final) — vem ANTES do rate limit porque
  //    cached response não consome quota do Groq, então não faz sentido
  //    contar contra o limite do usuário.
  //    A cache key inclui hasVideo/wantsScript pra não servir resposta sem
  //    script a quem pediu script (ou vice-versa).
  const cacheKey = [
    CACHE_PREFIX,
    platform,
    topic.toLowerCase(),
    language,
    hasVideo,
    wantsScript ? "1" : "0",
  ].join(":");
  const cached = await cache.get(cacheKey);
  if (cached) {
    return Response.json({ ...cached, fromCache: true });
  }

  // 3) Rate limit — só agora, antes da chamada cara ao Groq.
  //    Protege a quota do free tier contra abuso (scripts, spam).
  const rl = await checkRateLimit(ip);
  if (!rl.allowed) {
    return errorResponse(
      429,
      "RATE_LIMITED",
      buildRateLimitMessage(rl.retryAfterSeconds)
    );
  }

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
    hasVideo,
    wantsScript,
  });

  // 6) Chamar Groq
  let generated;
  try {
    generated = await generate({
      system: SYSTEM_PROMPT,
      user: userPrompt,
    });
  } catch (err) {
    console.error("Error details:", err);
    console.error("[api/generate] Groq error:", err);
    if (isQuotaError(err)) {
      return new NextResponse(JSON.stringify({ error: "Limite de processamento atingido. Por favor, aguarde um momento." }), { status: 429 });
    }
    return errorResponse(
      502,
      "GROQ_FAILED",
      "Não conseguimos gerar ideias agora. Tente de novo em alguns segundos."
    );
  }

  // 7) Filtrar só as plataformas pedidas + sanitizar variants (garantir 3
  //    variants válidos por plataforma, cada um com título + descrição +
  //    hashtags bem formadas).
  const wanted = new Set(platforms);
  const filtered = {
    platforms: (generated?.platforms ?? [])
      .filter((p) => wanted.has(p?.name))
      .map((p) => ({
        name: p.name,
        variants: normalizeVariants(p.variants),
        editingStyle: p.editingStyle ?? null,
      }))
      .filter((p) => p.variants.length > 0),
  };

  if (filtered.platforms.length === 0) {
    return errorResponse(
      502,
      "GROQ_FAILED",
      "A IA não retornou resultados válidos. Tente de novo."
    );
  }

  // 7.5) Roteiro (opcional): só repassa se o user pediu E se o Groq devolveu.
  let script = null;
  if (wantsScript && generated?.script && typeof generated.script === "object") {
    const s = generated.script;
    script = {
      hook: typeof s.hook === "string" ? s.hook : "",
      body: typeof s.body === "string" ? s.body : "",
      cta: typeof s.cta === "string" ? s.cta : "",
    };
  }

  // 8) Cache + resposta
  const payload = {
    ok: true,
    data: {
      ...filtered,
      script,
    },
    usedRealData: {
      youtube: youtubeContext.length > 0,
    },
  };
  
  await cache.set(cacheKey, payload, FINAL_CACHE_TTL_MS);

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

function normalizeVariants(raw) {
  if (!Array.isArray(raw)) return [];

  const partial = raw
    .map((v) => {
      if (!v || typeof v !== "object") return null;
      const title = typeof v.title === "string" ? v.title.trim() : "";
      if (!title) return null;
      const description =
        typeof v.description === "string" ? v.description.trim() : "";
      const hashtags = sanitizeHashtags(v.hashtags);
      return { title, description, hashtags };
    })
    .filter(Boolean);

  if (partial.length === 0) return [];

  const withDescription = partial.find((v) => v.description.length > 0);
  const withHashtags = partial.find((v) => v.hashtags.length > 0);

  const filled = partial.map((v) => ({
    title: v.title,
    description:
      v.description || withDescription?.description || "",
    hashtags: v.hashtags.length > 0 ? v.hashtags : withHashtags?.hashtags ?? [],
  }));

  while (filled.length < 3) filled.push(filled[0]);
  return filled.slice(0, 3);
}

function sanitizeHashtags(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const result = [];
  const allowedLevels = new Set(["green", "yellow", "red"]);

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;

    const tagRaw = typeof item.tag === "string" ? item.tag.trim() : "";
    if (!tagRaw) continue;

    const withHash = tagRaw.startsWith("#") ? tagRaw : `#${tagRaw}`;
    const clean = withHash.replace(/\s+/g, "");
    if (clean.length < 2 || clean.length > 40) continue;

    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const levelRaw = typeof item.level === "string" ? item.level.toLowerCase().trim() : "";
    const level = allowedLevels.has(levelRaw) ? levelRaw : "yellow";

    result.push({ tag: clean, level });
    if (result.length >= 15) break;
  }
  return result;
}