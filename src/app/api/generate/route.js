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
export const maxDuration = 60;         // Vercel Hobby permite até 60s — damos folga pro Gemini.

const FINAL_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

// Prefixo v3: novo schema (variants por plataforma — título/descrição/hashtags
// passam a vir por variant). Troca de prefixo invalida automaticamente qualquer
// cache antigo em warm instances sem precisar limpar nada manualmente.
const CACHE_PREFIX = "gen3";

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
  //    cached response não consome quota do Gemini, então não faz sentido
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
    hasVideo,
    wantsScript,
  });

  // 6) Chamar Gemini
  //    maxTokens bem maior (6144) porque agora cada plataforma traz 3 variants
  //    COMPLETOS (título + descrição + 10-15 hashtags) em vez de 1 conjunto
  //    compartilhado. 3 plataformas × 3 variants = 9 blocos + editingStyle +
  //    possível roteiro com profundidade. Melhor dar folga do que cortar JSON.
  let generated;
  try {
    generated = await generate({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 6144,
    });
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
      "GEMINI_FAILED",
      "A IA não retornou resultados válidos. Tente de novo."
    );
  }

  // 7.5) Roteiro (opcional): só repassa se o user pediu E se o Gemini devolveu.
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
  cache.set(cacheKey, payload, FINAL_CACHE_TTL_MS);

  return Response.json(payload);
}

function errorResponse(status, code, message) {
  return Response.json(
    { ok: false, error: { code, message } },
    { status }
  );
}

/**
 * Extrai o IP do cliente priorizando headers que NÃO são spoofáveis.
 *
 * Ordem:
 *   1. `x-vercel-forwarded-for` — a Vercel injeta esse header ela mesma e
 *      sobrescreve qualquer valor vindo do cliente, então não é spoofável
 *      enquanto o app roda atrás da edge da Vercel.
 *   2. `x-forwarded-for` — fallback pra self-host atrás de proxy confiável
 *      ou dev local. ATENÇÃO: se o app estiver exposto diretamente sem um
 *      proxy que normalize este header, ele É spoofável. Por isso só entra
 *      depois do header específico da Vercel.
 *   3. `x-real-ip` — último recurso.
 */
function getClientIp(request) {
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();

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
 * Garante que a plataforma tenha EXATAMENTE 3 variants válidos, cada
 * um com título + descrição + hashtags sanitizadas.
 *
 * O schema pede 3; este é o fallback defensivo:
 *   - menos que 3 variants válidos: completa com cópias do primeiro válido
 *     (UI mostra os 3 mesmo que duas tenham o mesmo conteúdo — o usuário
 *     pelo menos consegue interagir sem quebrar a renderização).
 *   - mais que 3: trunca nos 3 primeiros.
 *   - nenhum variant válido: devolve array vazio e o chamador decide.
 */
function normalizeVariants(raw) {
  if (!Array.isArray(raw)) return [];

  const clean = raw
    .map((v) => {
      if (!v || typeof v !== "object") return null;
      const title = typeof v.title === "string" ? v.title.trim() : "";
      const description =
        typeof v.description === "string" ? v.description.trim() : "";
      const hashtags = sanitizeHashtags(v.hashtags);
      if (!title || !description || hashtags.length === 0) return null;
      return { title, description, hashtags };
    })
    .filter(Boolean);

  if (clean.length === 0) return [];

  while (clean.length < 3) clean.push(clean[0]);
  return clean.slice(0, 3);
}

/**
 * Sanitiza hashtags vindas do Gemini no formato {tag, level}.
 * - Garante que todas as tags começam com '#'.
 * - Remove duplicadas (case-insensitive), vazias, com espaço interno.
 * - Valida level ∈ {"green","yellow","red"} (default "yellow" se inválido).
 * - Limita a 15.
 */
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
