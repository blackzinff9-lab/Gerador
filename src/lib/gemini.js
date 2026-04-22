// Wrapper do SDK @google/genai.
// Uma única função: generate({ system, user }) → JSON parseado.

import { GoogleGenAI } from "@google/genai";
import { responseSchema } from "./schema.js";

let clientInstance = null;

function getClient() {
  if (clientInstance) return clientInstance;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY não configurado. Adicione no .env.local ou nas Environment Variables do Vercel."
    );
  }
  clientInstance = new GoogleGenAI({ apiKey });
  return clientInstance;
}

/**
 * Gera JSON estruturado via Gemini.
 * Lança erro se a chave não estiver configurada ou se o Gemini falhar.
 * O consumidor deve tratar a exceção e traduzir para HTTP amigável.
 *
 * @param {object} params
 * @param {string} params.system       - system instruction
 * @param {string} params.user         - user prompt
 * @param {object} [params.schema]     - response schema (OpenAPI-like). Default: responseSchema do gerador principal.
 * @param {number} [params.maxTokens]  - limite de tokens da saída. Default 2048 (gerador principal). O endpoint /api/ideas pode precisar mais porque são 10 itens.
 * @param {number} [params.temperature] - criatividade. Default 0.85.
 */
export async function generate({
  system,
  user,
  schema = responseSchema,
  maxTokens = 2048,
  temperature = 0.85,
}) {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: user }] }],
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature,
      maxOutputTokens: maxTokens,
    },
  });

  const text = response?.text;
  if (!text) {
    // Alguns fracassos "silenciosos" do Gemini vêm como texto vazio com um
    // finishReason indicativo (MAX_TOKENS, SAFETY, etc). Logar isso ajuda
    // a diagnosticar em prod sem precisar reproduzir.
    const finish =
      response?.candidates?.[0]?.finishReason ??
      response?.promptFeedback?.blockReason ??
      "unknown";
    console.error(
      "[gemini] empty response. finishReason:",
      finish,
      "usageMetadata:",
      response?.usageMetadata
    );
    throw new Error(`Gemini retornou resposta vazia (${finish}).`);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    // Log do começo/fim pra detectar truncamento (MAX_TOKENS) sem inundar
    // o log com o JSON inteiro.
    const head = text.slice(0, 200);
    const tail = text.slice(-200);
    console.error(
      "[gemini] JSON parse failed. length:",
      text.length,
      "head:",
      head,
      "tail:",
      tail
    );
    throw new Error("Resposta do Gemini não é JSON válido (possivelmente truncada).");
  }
}

/**
 * Detecta se um erro do Gemini é de cota esgotada (429 / RESOURCE_EXHAUSTED).
 * Usado para mostrar mensagem "volte amanhã" ao usuário.
 */
export function isQuotaError(err) {
  const msg = String(err?.message ?? "").toLowerCase();
  return (
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("resource_exhausted") ||
    msg.includes("429")
  );
}
