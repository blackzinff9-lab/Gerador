// Schema de resposta estruturada do Gemini.
// Formato OpenAPI-like aceito pelo @google/genai.
// Garante que todo retorno seja um JSON parseável com os campos certos.
//
// Mudanças v3:
//   • Título, descrição e hashtags agora vêm POR VARIANT:
//     `platforms[].variants[]` onde cada variant = { title, description, hashtags }.
//     O usuário escolhe 1 variant e publica — por isso cada um vem com
//     descrição e hashtags específicas pro seu ângulo.
//   • `editingStyle` continua UMA vez por plataforma (é do formato, não do ângulo).
//
// Mudanças v2 (histórico):
//   • `title` (string única) → `titles` (array de EXATAMENTE 3 strings).
//   • `hashtags` (array<string>) → `hashtags` (array<{tag, level}>).
//   • Top-level opcional `script` ({hook, body, cta}).

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
          variants: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
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
                  },
                  // 8 min (antes 10) — 3 variants × 3 plataformas × 10 tags
                  // explodia o output. 8 já é suficiente pra cobrir mix
                  // amplas+nicho+long-tail e segura o JSON dentro do teto
                  // de tokens sem truncar.
                  minItems: 8,
                  maxItems: 12,
                },
              },
              required: ["title", "description", "hashtags"],
              propertyOrdering: ["title", "description", "hashtags"],
            },
            minItems: 3,
            maxItems: 3,
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
        required: ["name", "variants", "editingStyle"],
        propertyOrdering: ["name", "variants", "editingStyle"],
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
