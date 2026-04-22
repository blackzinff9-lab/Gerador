// Schema de resposta estruturada do Gemini.
// Formato OpenAPI-like aceito pelo @google/genai.
// Garante que todo retorno seja um JSON parseável com os campos certos.
//
// Mudanças v2:
//   • `title` (string única) → `titles` (array de EXATAMENTE 3 strings):
//     permite que o usuário teste ângulos diferentes (algoritmos virais
//     recompensam quem testa variações de hook).
//   • `hashtags` (array<string>) → `hashtags` (array<{tag, level}>):
//     cada tag vem classificada como "green" (recomendada), "yellow"
//     (mediana) ou "red" (evitar), pra sinalizar risco/saturação.
//   • Top-level opcional `script` ({hook, body, cta}): preenchido só
//     quando o request pede roteiro (fluxo "ainda estou fazendo o vídeo").

export const responseSchema = {
  type: "OBJECT",
  properties: {
    script: {
      type: "OBJECT",
      properties: {
        hook: { type: "STRING" },
        body: { type: "STRING" },
        cta: { type: "STRING" },
      },
      // Todos opcionais — o campo `script` inteiro só aparece se pedido,
      // mas quando aparece os três sub-campos devem vir juntos.
      required: ["hook", "body", "cta"],
      propertyOrdering: ["hook", "body", "cta"],
    },
    platforms: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: {
            type: "STRING",
            enum: ["youtube", "tiktok", "instagram"],
          },
          titles: {
            type: "ARRAY",
            items: { type: "STRING" },
            minItems: 3,
            maxItems: 3,
          },
          description: { type: "STRING" },
          hashtags: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                tag: { type: "STRING" },
                level: {
                  type: "STRING",
                  enum: ["green", "yellow", "red"],
                },
              },
              required: ["tag", "level"],
              propertyOrdering: ["tag", "level"],
            },
            minItems: 10,
            maxItems: 15,
          },
          editingStyle: {
            type: "OBJECT",
            properties: {
              pacing: { type: "STRING" },
              hook: { type: "STRING" },
              cuts: { type: "STRING" },
              music: { type: "STRING" },
              duration: { type: "STRING" },
              tips: {
                type: "ARRAY",
                items: { type: "STRING" },
                minItems: 3,
                maxItems: 6,
              },
            },
            required: ["pacing", "hook", "cuts", "music", "duration", "tips"],
            propertyOrdering: [
              "pacing",
              "hook",
              "cuts",
              "music",
              "duration",
              "tips",
            ],
          },
        },
        required: [
          "name",
          "titles",
          "description",
          "hashtags",
          "editingStyle",
        ],
        propertyOrdering: [
          "name",
          "titles",
          "description",
          "hashtags",
          "editingStyle",
        ],
      },
    },
  },
  required: ["platforms"],
};

/**
 * Schema do endpoint `/api/ideas` — o botão "Conteúdo Infinito" que gera
 * 10 ideias de próximos vídeos "interligados" com o tema original.
 *
 * Formato minimalista: cada ideia = título sugerido + 1 linha de gancho
 * explicando o ângulo. Fácil de escanear, fácil de copiar.
 */
export const ideasResponseSchema = {
  type: "OBJECT",
  properties: {
    ideas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          hook: { type: "STRING" },
        },
        required: ["title", "hook"],
        propertyOrdering: ["title", "hook"],
      },
      minItems: 10,
      maxItems: 10,
    },
  },
  required: ["ideas"],
};
