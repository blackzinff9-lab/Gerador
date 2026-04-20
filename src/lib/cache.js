// Cache in-memory com TTL.
//
// IMPORTANTE: no Vercel Hobby, este Map persiste apenas enquanto a mesma
// instância warm do serverless estiver viva. Cold starts perdem o cache.
// Isso está OK para v1 — já reduz custo em tópicos populares sem adicionar
// dependências. Upgrade futuro: Vercel KV / Upstash Redis com mesma interface.

class MemoryCache {
  constructor() {
    /** @type {Map<string, { value: any, expiresAt: number }>} */
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs) {
    const expiresAt = Date.now() + (Number.isFinite(ttlMs) ? ttlMs : 60_000);
    this.store.set(key, { value, expiresAt });

    // Limpeza preguiçosa: se o map cresce demais, descarta entradas expiradas
    if (this.store.size > 500) {
      this.prune();
    }
  }

  delete(key) {
    this.store.delete(key);
  }

  prune() {
    const now = Date.now();
    for (const [k, v] of this.store.entries()) {
      if (now >= v.expiresAt) this.store.delete(k);
    }
  }

  clear() {
    this.store.clear();
  }
}

// Singleton exportado (um único Map por processo Node)
export const cache = new MemoryCache();
