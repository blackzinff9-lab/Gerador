// Validação de entrada dos endpoints /api/generate e /api/ideas.
// Pensado para ser simples e ler como prosa — iniciante consegue entender.

const ALLOWED_PLATFORMS = ["all", "youtube", "tiktok", "instagram"];
const ALLOWED_LANGUAGES = ["pt-BR", "en-US", "es-ES"];
const ALLOWED_HAS_VIDEO = ["ready", "making"];

const MIN_TOPIC = 3;
const MAX_TOPIC = 200;
const MAX_SEED_TITLES = 9;    // 3 plataformas × 3 títulos = até 9
const MAX_TITLE_LEN = 200;    // defesa contra payload inflado vindo do client

export function validateGenerateBody(body) {
  if (!body || typeof body !== "object") {
    return fail("Requisição inválida. Envie um JSON com platform e topic.");
  }

  // platform
  const platform = String(body.platform ?? "").toLowerCase().trim();
  if (!ALLOWED_PLATFORMS.includes(platform)) {
    return fail(
      "Escolha uma rede social válida (YouTube, TikTok, Reels ou Todas)."
    );
  }

  // topic
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (topic.length < MIN_TOPIC) {
    return fail(
      `Descreva o tema do vídeo (mínimo ${MIN_TOPIC} caracteres).`
    );
  }
  if (topic.length > MAX_TOPIC) {
    return fail(`O tema precisa ter até ${MAX_TOPIC} caracteres.`);
  }

  // language
  const rawLang = typeof body.language === "string" ? body.language : "pt-BR";
  const language = ALLOWED_LANGUAGES.includes(rawLang) ? rawLang : "pt-BR";

  // hasVideo (opcional, default "ready" = retrocompatível)
  const rawHasVideo = String(body.hasVideo ?? "ready").toLowerCase().trim();
  const hasVideo = ALLOWED_HAS_VIDEO.includes(rawHasVideo)
    ? rawHasVideo
    : "ready";

  // wantsScript: só faz sentido quando hasVideo === "making".
  // Se o vídeo já está pronto, ignoramos o campo (coerência).
  const wantsScript = hasVideo === "making" && body.wantsScript === true;

  // platforms expandido (array de plataformas finais a retornar)
  const platforms =
    platform === "all" ? ["youtube", "tiktok", "instagram"] : [platform];

  return {
    ok: true,
    data: {
      platform,        // escolha bruta ("all" ou específica)
      platforms,       // lista expandida para a Groq
      topic,
      language,
      hasVideo,
      wantsScript,
    },
  };
}

/**
 * Valida o body do endpoint /api/ideas (Conteúdo Infinito).
 * Body esperado: { topic, language, platform, seedTitles }.
 */
export function validateIdeasBody(body) {
  if (!body || typeof body !== "object") {
    return fail("Requisição inválida. Envie um JSON com topic.");
  }

  // topic — mesma regra do gerador principal
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (topic.length < MIN_TOPIC) {
    return fail(
      `Descreva o tema do vídeo (mínimo ${MIN_TOPIC} caracteres).`
    );
  }
  if (topic.length > MAX_TOPIC) {
    return fail(`O tema precisa ter até ${MAX_TOPIC} caracteres.`);
  }

  // language
  const rawLang = typeof body.language === "string" ? body.language : "pt-BR";
  const language = ALLOWED_LANGUAGES.includes(rawLang) ? rawLang : "pt-BR";

  // platform — aqui aceita "all" como fallback pra quando o usuário gerou
  // pra várias plataformas e o botão "Conteúdo Infinito" não sabe de qual
  // tirar o "foco"; o prompt usa isso só como pista.
  const platform = String(body.platform ?? "all").toLowerCase().trim();
  const safePlatform = ALLOWED_PLATFORMS.includes(platform) ? platform : "all";

  // seedTitles — array de strings opcional. Se veio, sanitizamos.
  const rawSeed = Array.isArray(body.seedTitles) ? body.seedTitles : [];
  const seedTitles = rawSeed
    .filter((t) => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= MAX_TITLE_LEN)
    .slice(0, MAX_SEED_TITLES);

  return {
    ok: true,
    data: {
      topic,
      language,
      platform: safePlatform,
      seedTitles,
    },
  };
}

function fail(message) {
  return { ok: false, error: { code: "INVALID_INPUT", message } };
}
