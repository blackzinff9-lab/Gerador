// Schema de resposta estruturada do Gemini.
// Formato OpenAPI-like aceito pelo @google/genai.
// Garante que todo retorno seja um JSON parseável com os campos certos.

export const responseSchema = {
  type: "OBJECT",
  properties: {
    platforms: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: {
            type: "STRING",
            enum: ["youtube", "tiktok", "instagram"],
          },
          hashtags: {
            type: "ARRAY",
            items: { type: "STRING" },
            minItems: 10,
            maxItems: 15,
          },
          title: { type: "STRING" },
          description: { type: "STRING" },
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
          "hashtags",
          "title",
          "description",
          "editingStyle",
        ],
        propertyOrdering: [
          "name",
          "hashtags",
          "title",
          "description",
          "editingStyle",
        ],
      },
    },
  },
  required: ["platforms"],
};
