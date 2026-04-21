// Rate limit por IP — sliding window em memória, dois níveis.
//
// Estratégia:
//   • Janela curta (1 min): protege contra burst / cliques repetidos.
//   • Janela longa (24h):   impede que um IP queime a quota do Gemini
//                           mandando request lento e contínuo o dia todo.
//
// Limitações IMPORTANTES (deixadas explícitas pra não criar falsa sensação
// de segurança):
//   1. Cada instância serverless do Vercel mantém seu PRÓPRIO Map. Um IP
//      pode pegar instâncias diferentes e ganhar contadores fresh. É uma
//      proteção "melhor que nada", não um WAF.
//   2. Reseta a cada cold start (esperado, e até ajuda usuário legítimo
//      que ficou bloqueado por engano).
//   3. Em caso de abuso real em escala, upgrade para Upstash Redis /
//      Vercel KV (mesma interface, troca só este arquivo).
//
// Por que este arquivo é checado DEPOIS do cache em route.js:
//   Respostas servidas pelo cache NÃO consomem quota do Gemini, então não
//   faz sentido penalizar o usuário por buscar um tema popular. O rate
//   limit só importa antes da chamada ao Gemini (o recurso caro).

const SHORT_WINDOW_MS = 60 * 1000;         // 1 min
const SHORT_MAX = 8;                        // 8 req/min por IP (burst)

const LONG_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const LONG_MAX = 40;                        // 40 req/dia por IP

const PRUNE_THRESHOLD = 1000;               // quando limpar IPs antigos

/** @type {Map<string, number[]>} ip → array de timestamps (ms) */
const buckets = new Map();

/**
 * Verifica se um IP pode fazer mais uma requisição que CONSOME recurso caro.
 * Deve ser chamado ANTES da chamada ao Gemini, mas DEPOIS do cache check.
 *
 * @param {string} ip
 * @returns {{ allowed: boolean, retryAfterSeconds?: number }}
 */
export function checkRateLimit(ip) {
  // Sem IP identificável (alguns proxies/ambientes locais): permite.
  // Melhor deixar passar do que bloquear usuário legítimo por IP ausente.
  if (!ip || ip === "unknown") {
    return { allowed: true };
  }

  const now = Date.now();
  const longCutoff = now - LONG_WINDOW_MS;
  const shortCutoff = now - SHORT_WINDOW_MS;

  // Pega o bucket do IP, criando se não existir, e poda timestamps antigos.
  let hits = buckets.get(ip) ?? [];
  hits = hits.filter((t) => t > longCutoff);

  // Contagem nas duas janelas
  const shortHits = hits.filter((t) => t > shortCutoff).length;
  const longHits = hits.length;

  // Limite curto: burst de cliques
  if (shortHits >= SHORT_MAX) {
    const oldestShort = hits.find((t) => t > shortCutoff) ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldestShort + SHORT_WINDOW_MS - now) / 1000)
    );
    // Persiste bucket podado pra próxima chamada não refazer o trabalho
    buckets.set(ip, hits);
    return { allowed: false, retryAfterSeconds };
  }

  // Limite diário: abuso de baixa intensidade
  if (longHits >= LONG_MAX) {
    const oldestLong = hits[0] ?? now;
    const retryAfterSeconds = Math.max(
      60,
      Math.ceil((oldestLong + LONG_WINDOW_MS - now) / 1000)
    );
    buckets.set(ip, hits);
    return { allowed: false, retryAfterSeconds };
  }

  // Permite: registra hit
  hits.push(now);
  buckets.set(ip, hits);

  // Limpeza preguiçosa pra não crescer sem limite em produção
  if (buckets.size > PRUNE_THRESHOLD) {
    pruneExpired(longCutoff);
  }

  return { allowed: true };
}

/**
 * Remove IPs sem hits recentes. Chamado quando o Map passa do threshold.
 */
function pruneExpired(longCutoff) {
  for (const [ip, hits] of buckets.entries()) {
    const fresh = hits.filter((t) => t > longCutoff);
    if (fresh.length === 0) {
      buckets.delete(ip);
    } else if (fresh.length !== hits.length) {
      buckets.set(ip, fresh);
    }
  }
}
