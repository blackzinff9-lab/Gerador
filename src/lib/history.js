// Armazenamento de histórico de gerações por usuário.
//
// Decisão de arquitetura: localStorage no navegador, chaveado por email
// da conta Google. Motivos:
//
//   1. Zero custo: sem DB, sem Redis, sem serverless function extra
//      (mantém o "100% grátis pra rodar" do projeto).
//   2. Privacidade: os dados não saem do dispositivo do usuário.
//   3. Suficiente pro caso de uso: histórico é pra "eu ver de novo o que
//      acabei de pedir", não algo que precisa sincronizar.
//
// Limitações conhecidas (deliberadas):
//   • Não sincroniza entre dispositivos.
//   • Se o usuário limpar o localStorage, perde o histórico.
//   • Limite de 5-10MB por origem no localStorage — suficiente pra 200+
//     gerações típicas, mas fazemos cap em MAX_ITEMS pra ter certeza.
//
// Migração futura: quando tivermos DB (Vercel KV / Upstash Redis), este
// módulo vira um thin client que chama /api/history (mesma interface).

const STORAGE_KEY_PREFIX = "engajai:history:v1:";
const MAX_ITEMS = 50; // caba num user típico, segura o localStorage
const MAX_ITEM_SIZE = 50 * 1024; // 50KB por item — defesa contra payload absurdo

/**
 * Retorna a chave localStorage pro usuário. Falls-back pra "anonymous" se
 * não houver email (não devia acontecer no fluxo normal mas evita crash).
 */
function keyFor(user) {
  const email = user?.email ?? "anonymous";
  return `${STORAGE_KEY_PREFIX}${email.toLowerCase()}`;
}

/**
 * Lê a lista de histórico do usuário (array, mais recentes primeiro).
 * Retorna [] se não houver nada, se o JSON estiver corrompido ou se
 * rodarmos no server (localStorage não existe em SSR).
 */
export function readHistory(user) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(user));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error("[history] read failed", e);
    return [];
  }
}

/**
 * Adiciona uma entrada ao topo do histórico do usuário.
 * Faz deduplicação pelo par (topic + platform) — regerar o mesmo tema
 * substitui a entrada antiga em vez de duplicar.
 *
 * @param {object} user   - session.user do NextAuth ({ email, ... })
 * @param {object} entry  - { topic, platform, language, hasVideo, wantsScript, data }
 */
export function saveEntry(user, entry) {
  if (typeof window === "undefined") return;
  if (!entry || !entry.topic || !entry.platform) return;

  try {
    const serialized = JSON.stringify(entry);
    if (serialized.length > MAX_ITEM_SIZE) {
      // Histórico não devia ter item tão grande, mas se o payload vier
      // anormal (ex.: data corrompida), evita encher o storage.
      console.warn("[history] entry too large, skipped:", serialized.length);
      return;
    }

    const list = readHistory(user);

    // Dedup: se já existia (mesmo tema + mesma plataforma principal),
    // remove a versão antiga pra a nova ir pro topo.
    const normalizedTopic = entry.topic.trim().toLowerCase();
    const deduped = list.filter(
      (it) =>
        !(
          it?.topic?.trim().toLowerCase() === normalizedTopic &&
          it?.platform === entry.platform
        )
    );

    const next = [
      {
        id: entry.id ?? crypto.randomUUID?.() ?? String(Date.now()),
        savedAt: Date.now(),
        ...entry,
      },
      ...deduped,
    ].slice(0, MAX_ITEMS);

    window.localStorage.setItem(keyFor(user), JSON.stringify(next));
  } catch (e) {
    // QuotaExceededError é o mais provável — localStorage cheio.
    // A gente loga e continua; melhor perder o save do que derrubar o app.
    console.error("[history] save failed", e);
  }
}

/**
 * Remove uma entrada específica pelo id.
 */
export function removeEntry(user, id) {
  if (typeof window === "undefined") return;
  try {
    const list = readHistory(user);
    const next = list.filter((it) => it.id !== id);
    window.localStorage.setItem(keyFor(user), JSON.stringify(next));
  } catch (e) {
    console.error("[history] remove failed", e);
  }
}

/**
 * Limpa o histórico do usuário. Pedimos confirmação na UI antes.
 */
export function clearHistory(user) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(user));
  } catch (e) {
    console.error("[history] clear failed", e);
  }
}

/**
 * Label amigável pra uma entrada de histórico (usado na drawer).
 */
export function summarize(entry) {
  if (!entry) return "";
  const platform =
    entry.platform === "all"
      ? "Todas"
      : entry.platform === "instagram"
      ? "Reels"
      : entry.platform?.[0]?.toUpperCase() + entry.platform?.slice(1);
  return `${platform} • ${entry.topic}`;
}
