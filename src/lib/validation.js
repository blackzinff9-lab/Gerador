// Validação de entrada do endpoint /api/generate.
// Pensado para ser simples e ler como prosa — iniciante consegue entender.

const ALLOWED_PLATFORMS = ["all", "youtube", "tiktok", "instagram"];
const ALLOWED_LANGUAGES = ["pt-BR", "en-US", "es-ES"];

const MIN_TOPIC = 3;
const MAX_TOPIC = 200;

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

  // platforms expandido (array de plataformas finais a retornar)
  const platforms =
    platform === "all" ? ["youtube", "tiktok", "instagram"] : [platform];

  return {
    ok: true,
    data: {
      platform,        // escolha bruta ("all" ou específica)
      platforms,       // lista expandida para o Gemini
      topic,
      language,
    },
  };
}

function fail(message) {
  return { ok: false, error: { code: "INVALID_INPUT", message } };
}
