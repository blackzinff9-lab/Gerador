// Integração com YouTube Data API v3 (FREE tier, 10k unidades/dia).
// Busca vídeos populares relacionados ao tema, com cache de 24h.
//
// Por que search.list em vez de mostPopular?
// Desde jul/2025, videos.list?chart=mostPopular só retorna Music/Movies/Gaming.
// search.list com order=viewCount + regionCode=BR dá o trending real por tema.
//
// Custo: search.list = 100 unidades; videos.list (enriquecimento) = 1 unidade.
// Com cache 24h e ~100 tópicos únicos/dia, dá ~10k unidades → exatamente o limite.

import { cache } from "./cache.js";

const TTL_MS = 24 * 60 * 60 * 1000; // 24h
const FETCH_TIMEOUT_MS = 5000; // 5s máximo para não estourar Vercel timeout

/**
 * Mapeia idioma do app para regionCode e relevanceLanguage do YouTube.
 */
function regionFromLanguage(language) {
  if (language === "en-US") return { region: "US", relLang: "en" };
  if (language === "es-ES") return { region: "ES", relLang: "es" };
  return { region: "BR", relLang: "pt" }; // pt-BR default
}

/**
 * Retorna array de { title, tags[], viewCount } ou array vazio em caso de falha.
 * Nunca lança — falha graciosa.
 */
export async function fetchYouTubeTrends(topic, language = "pt-BR") {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("[youtube] YOUTUBE_API_KEY não configurado — pulando.");
    return [];
  }

  const { region, relLang } = regionFromLanguage(language);
  const cacheKey = `yt:${region}:${topic.toLowerCase()}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    // 1) Busca IDs dos top 5 vídeos por viewCount no tema
    const searchUrl = new URL(
      "https://www.googleapis.com/youtube/v3/search"
    );
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", topic);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("order", "viewCount");
    searchUrl.searchParams.set("maxResults", "5");
    searchUrl.searchParams.set("regionCode", region);
    searchUrl.searchParams.set("relevanceLanguage", relLang);
    searchUrl.searchParams.set("key", apiKey);

    const searchRes = await fetchWithTimeout(searchUrl.toString());
    if (!searchRes.ok) {
      console.error(
        "[youtube] search.list failed:",
        searchRes.status,
        await safeText(searchRes)
      );
      return [];
    }
    const searchJson = await searchRes.json();
    const ids = (searchJson.items ?? [])
      .map((it) => it?.id?.videoId)
      .filter(Boolean);

    if (ids.length === 0) {
      cache.set(cacheKey, [], TTL_MS); // cacheia vazio para não re-consultar
      return [];
    }

    // 2) Enriquecer com tags e estatísticas (1 unidade, batch)
    const videosUrl = new URL(
      "https://www.googleapis.com/youtube/v3/videos"
    );
    videosUrl.searchParams.set("part", "snippet,statistics");
    videosUrl.searchParams.set("id", ids.join(","));
    videosUrl.searchParams.set("key", apiKey);

    const videosRes = await fetchWithTimeout(videosUrl.toString());
    if (!videosRes.ok) {
      // Se enriquecimento falha, retorna só títulos da busca
      const fallback = (searchJson.items ?? []).map((it) => ({
        title: it?.snippet?.title ?? "",
        tags: [],
        viewCount: null,
      }));
      cache.set(cacheKey, fallback, TTL_MS);
      return fallback;
    }
    const videosJson = await videosRes.json();
    const result = (videosJson.items ?? []).map((it) => ({
      title: it?.snippet?.title ?? "",
      tags: Array.isArray(it?.snippet?.tags) ? it.snippet.tags : [],
      viewCount: it?.statistics?.viewCount ?? null,
    }));

    cache.set(cacheKey, result, TTL_MS);
    return result;
  } catch (err) {
    console.error("[youtube] unexpected error:", err?.message);
    return [];
  }
}

async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "(no body)";
  }
}
