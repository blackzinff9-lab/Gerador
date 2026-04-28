// Wrapper for the Groq SDK.
// Provides a single function: generate({ system, user }) → parsed JSON.

import Groq from "groq-sdk";
import { responseSchema } from "./schema.js";

let groq = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getClient() {
  if (groq) return groq;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not configured. Add it to your Vercel/Railway Environment Variables."
    );
  }
  groq = new Groq({ apiKey });
  return groq;
}

/**
 * Generates structured JSON via Groq with retries.
 * Throws an error if the key is not configured or if Groq fails after all retries.
 * The consumer should handle the exception and translate it to a user-friendly HTTP response.
 *
 * @param {object} params
 * @param {string} params.system       - system instruction
 * @param {string} params.user         - user prompt
 * @param {object} [params.schema]     - response schema (not directly used by Groq but kept for compatibility).
 * @param {number} [params.maxTokens]  - output token limit. Default 8192.
 * @param {number} [params.temperature] - creativity. Default 0.85.
 * @param {number} [params.retries] - number of retries. Default 3.
 */
export async function generate({
  system,
  user,
  schema = responseSchema, // schema is not used by Groq but we keep it for now.
  maxTokens = 8192,
  temperature = 0.85,
  retries = 3,
}) {
  const ai = getClient();
  
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const chatCompletion = await ai.chat.completions.create({
        messages: [
            {
                role: "system",
                content: system,
            },
            {
                role: "user",
                content: user,
            },
        ],
        model: "llama3-70b-8192", // Or other model like "mixtral-8x7b-32768"
        temperature,
        max_tokens: maxTokens,
        top_p: 1,
        stream: false,
        response_format: { type: "json_object" },
      });

      const text = chatCompletion.choices[0]?.message?.content;

      if (!text) {
        console.error(
          `[groq] empty response on attempt ${attempt}/${retries}.`
        );
        throw new Error(`Groq returned an empty response.`);
      }

      try {
        return JSON.parse(text);
      } catch (err) {
        const head = text.slice(0, 200);
        const tail = text.slice(-200);
        console.error(
          `[groq] JSON parse failed on attempt ${attempt}/${retries}. length:`,
          text.length,
          "head:",
          head,
          "tail:",
          tail
        );
        throw new Error("Groq's response is not valid JSON (possibly truncated).");
      }
    } catch (error) {
      lastError = error;

      if (isQuotaError(error)) {
        console.error("[groq] Quota error, not retrying.", error.message);
        throw error; // Fail immediately on quota errors
      }

      if (attempt < retries) {
        const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
        console.warn(
          `[groq] Attempt ${attempt}/${retries} failed. Retrying in ${delay}ms...`,
          error.message
        );
        await sleep(delay);
      }
    }
  }

  console.error(`[groq] All ${retries} retries failed.`);
  throw lastError; // Throw the last error after all retries have failed
}

/**
 * Detects if a Groq error is due to an exhausted quota (429).
 * Used to show a "come back tomorrow" message to the user.
 */
export function isQuotaError(err) {
  const msg = String(err?.message ?? "").toLowerCase();
  const status = err?.status;
  return (
    status === 429 ||
    msg.includes("quota") ||
    msg.includes("rate limit")
  );
}