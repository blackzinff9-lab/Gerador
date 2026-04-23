// Wrapper do SDK @google/genai.
// Uma única função: generate({ system, user }) → JSON parseado.

import { GoogleGenAI } from "@google/genai";
import { responseSchema } from "./schema.js";

let clientInstance = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
 * Gera JSON estruturado via Gemini com retentativas.
 * Lança erro se a chave não estiver configurada ou se o Gemini falhar após todas as tentativas.
 * O consumidor deve tratar a exceção e traduzir para HTTP amigável.
 *
 * @param {object} params
 * @param {string} params.system       - system instruction
 * @param {string} params.user         - user prompt
 * @param {object} [params.schema]     - response schema (OpenAPI-like). Default: responseSchema do gerador principal.
 * @param {number} [params.maxTokens]  - limite de tokens da saída. Default 2048 (gerador principal). O endpoint /api/ideas pode precisar mais porque são 10 itens.
 * @param {number} [params.temperature] - criatividade. Default 0.85.
 * @param {number} [params.retries] - número de tentativas. Default 3.
 */
export async function generate({
  system,
  user,
  schema = responseSchema,
  maxTokens = 8192,
  temperature = 0.85,
  retries = 3,
}) {
  const ai = getClient();
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: system,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature,
          maxOutputTokens: maxTokens,
        },
      }).generateContent(user);

      const text = response.response.text();
      if (!text) {
        const finishReason = response.response.candidates?.[0]?.finishReason;
        const safetyRatings = response.response.candidates?.[0]?.safetyRatings;
        console.error(
          `[gemini] empty response on attempt ${attempt}/${retries}. finishReason: ${finishReason}`,
          "safetyRatings:",
          safetyRatings
        );
        throw new Error(`Gemini retornou resposta vazia (${finishReason}).`);
      }

      try {
        return JSON.parse(text);
      } catch (err) {
        const head = text.slice(0, 200);
        const tail = text.slice(-200);
        console.error(
          `[gemini] JSON parse failed on attempt ${attempt}/${retries}. length:`,
          text.length,
          "head:",
          head,
          "tail:",
          tail
        );
        throw new Error("Resposta do Gemini não é JSON válido (possivelmente truncada).");
      }
    } catch (error) {
      lastError = error;

      if (isQuotaError(error)) {
        console.error("[gemini] Quota error, not retrying.", error.message);
        throw error; // Falha imediata para erros de cota
      }

      if (attempt < retries) {
        const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
        console.warn(
          `[gemini] Attempt ${attempt}/${retries} failed. Retrying in ${delay}ms...`,
          error.message
        );
        await sleep(delay);
      }
    }
  }

  console.error(`[gemini] All ${retries} retries failed.`);
  throw lastError; // Lança o último erro após todas as tentativas falharem
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