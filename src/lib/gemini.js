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
 * Gera ideias virais estruturadas.
 * Lança erro se a chave não estiver configurada ou se o Gemini falhar.
 * O consumidor deve tratar a exceção e traduzir para HTTP amigável.
 */
export async function generate({ system, user }) {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: user }] }],
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.85,
      maxOutputTokens: 2048,
    },
  });

  const text = response?.text;
  if (!text) {
    throw new Error("Gemini retornou resposta vazia.");
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("[gemini] JSON parse failed. Raw text:", text);
    throw new Error("Resposta do Gemini não é JSON válido.");
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
