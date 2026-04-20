// Rate limit por IP (token bucket simples em memória).
//
// v1 — stub: sempre retorna { allowed: true }.
// Descomente o código abaixo quando quiser limitar (ex: viralizou e precisa
// proteger a quota do Gemini free tier).
//
// Mesmo na v1, mantemos a interface para não ter que mexer no route.js depois.

/**
 * Verifica se um IP pode fazer mais uma requisição.
 * @param {string} ip
 * @returns {{ allowed: boolean, retryAfterSeconds?: number }}
 */
export function checkRateLimit(ip) {
  // v1 stub — sempre permite
  return { allowed: true };

  /*
  // v1.1 — descomente para ativar
  const WINDOW_MS = 10 * 60 * 1000;      // 10 min
  const MAX_REQUESTS = 10;               // 10 req / 10 min
  const now = Date.now();

  const entry = buckets.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil(
      (WINDOW_MS - (now - entry.windowStart)) / 1000
    );
    return { allowed: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true };
  */
}

// const buckets = new Map(); // ativar com v1.1
