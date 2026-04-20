// Integração com TikTok via @tobyg74/tiktok-api-dl (scraping).
// Método Tiktok.Trending() não requer cookie — único viável em 2026 free tier.
//
// TikTok muda anti-bot constantemente — esta integração PODE QUEBRAR a qualquer hora.
// Design é fail-soft: qualquer falha retorna [] e o app continua funcionando.

import { cache } from "./cache.js";

const TTL_MS = 12 * 60 * 60 * 1000; // 12h — trending global muda devagar

/**
 * Retorna array de hashtags (strings como "#fyp", "#receita") em alta no TikTok.
 * Array vazio se falhar — nunca lança.
 */
export async function fetchTikTokTrends() {
  const cacheKey = "tt:trending:global";
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    // Import dinâmico para que o build do Next.js não tente pré-carregar
    // dependências de Node (o pacote usa axios/cheerio internamente).
    const mod = await import("@tobyg74/tiktok-api-dl");
    const Tiktok = mod.default ?? mod;

    if (typeof Tiktok?.Trending !== "function") {
      console.warn("[tiktok] Tiktok.Trending não disponível no pacote.");
      cache.set(cacheKey, [], TTL_MS);
      return [];
    }

    // Timeout de 5s para não estourar o orçamento da rota
    const trendingPromise = Tiktok.Trending();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TikTok timeout")), 5000)
    );
    const trending = await Promise.race([trendingPromise, timeoutPromise]);

    // Estrutura de resposta pode variar; extrai hashtags de forma defensiva
    const hashtags = extractHashtags(trending);

    cache.set(cacheKey, hashtags, TTL_MS);
    return hashtags;
  } catch (err) {
    console.error("[tiktok] Trending failed:", err?.message);
    cache.set(cacheKey, [], TTL_MS); // cacheia vazio para não tentar de novo
    return [];
  }
}

/**
 * Vasculha a resposta do scraper procurando por hashtags no corpo dos vídeos.
 * @tobyg74 retorna algo como { status, result: [{ desc, hashtag: [...] }] }
 * ou { status, result: { videos: [...] } } — depende da versão.
 */
function extractHashtags(raw) {
  if (!raw) return [];

  const found = new Set();
  const addTag = (t) => {
    if (typeof t !== "string") return;
    const clean = t.trim();
    if (!clean) return;
    const withHash = clean.startsWith("#") ? clean : `#${clean}`;
    // filtra só alfanumérico + underscore
    if (!/^#[\w\u00C0-\u017F]+$/u.test(withHash)) return;
    if (withHash.length < 2 || withHash.length > 40) return;
    found.add(withHash.toLowerCase());
  };

  // BFS nos objetos
  const stack = [raw];
  let safety = 0;
  while (stack.length && safety < 2000) {
    safety++;
    const node = stack.pop();
    if (node == null) continue;
    if (typeof node === "string") {
      // Extrai #hashtag de qualquer string
      const matches = node.match(/#[\p{L}\p{N}_]+/gu);
      if (matches) matches.forEach(addTag);
      continue;
    }
    if (Array.isArray(node)) {
      node.forEach((item) => stack.push(item));
      continue;
    }
    if (typeof node === "object") {
      for (const [key, val] of Object.entries(node)) {
        if (key.toLowerCase().includes("hashtag") && Array.isArray(val)) {
          val.forEach((h) => {
            if (typeof h === "string") addTag(h);
            else if (h?.name) addTag(h.name);
            else if (h?.title) addTag(h.title);
          });
        } else {
          stack.push(val);
        }
      }
    }
  }

  // Top 15 hashtags
  return Array.from(found).slice(0, 15);
}
