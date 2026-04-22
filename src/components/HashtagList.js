"use client";

import CopyButton from "./CopyButton";

// Cores por nível de recomendação (combinam com a semântica pedida):
//   green  = altamente recomendada  → verde
//   yellow = mediana                → âmbar/amarelo
//   red    = evitar                 → vermelho
const LEVEL_STYLES = {
  green:
    "bg-green-100 text-green-800 border border-green-300 hover:bg-green-200",
  yellow:
    "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200",
  red:
    "bg-red-100 text-red-800 border border-red-300 hover:bg-red-200",
};

const DOT_STYLES = {
  green: "bg-green-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

export default function HashtagList({ hashtags = [] }) {
  if (!hashtags.length) return null;

  // Backwards-compat: se vier array de strings (formato antigo em cache),
  // normaliza pra {tag, level:"yellow"} pra não quebrar a UI.
  const normalized = hashtags
    .map((h) => {
      if (typeof h === "string") return { tag: h, level: "yellow" };
      if (h && typeof h === "object" && typeof h.tag === "string") {
        return {
          tag: h.tag,
          level: LEVEL_STYLES[h.level] ? h.level : "yellow",
        };
      }
      return null;
    })
    .filter(Boolean);

  if (!normalized.length) return null;

  const allText = normalized.map((h) => h.tag).join(" ");

  async function copyOne(tag) {
    try {
      await navigator.clipboard?.writeText(tag);
    } catch (e) {
      console.error("[HashtagList] copy one failed", e);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {normalized.map((h, idx) => (
          <button
            key={`${h.tag}-${idx}`}
            type="button"
            onClick={() => copyOne(h.tag)}
            title={`Clique para copiar — ${levelLabel(h.level)}`}
            className={[
              "rounded-full px-2.5 py-1 text-xs font-medium transition",
              LEVEL_STYLES[h.level] ?? LEVEL_STYLES.yellow,
            ].join(" ")}
          >
            {h.tag}
          </button>
        ))}
      </div>

      <Legend />

      <CopyButton text={allText} label="Copiar todas as hashtags" />
    </div>
  );
}

function Legend() {
  const items = [
    { level: "green", label: "Recomendadas" },
    { level: "yellow", label: "Medianas" },
    { level: "red", label: "Evite" },
  ];
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-brand-muted"
      aria-label="Legenda de cores das hashtags"
    >
      {items.map((it) => (
        <span key={it.level} className="inline-flex items-center gap-1">
          <span
            className={[
              "inline-block h-2 w-2 rounded-full",
              DOT_STYLES[it.level],
            ].join(" ")}
            aria-hidden="true"
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function levelLabel(level) {
  if (level === "green") return "recomendada";
  if (level === "red") return "evite";
  return "mediana";
}
