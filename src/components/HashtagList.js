"use client";

import CopyButton from "./CopyButton";

export default function HashtagList({ hashtags = [] }) {
  if (!hashtags.length) return null;

  const allText = hashtags.join(" ");

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
        {hashtags.map((tag, idx) => (
          <button
            key={`${tag}-${idx}`}
            type="button"
            onClick={() => copyOne(tag)}
            title="Clique para copiar"
            className="rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-medium text-brand-primary transition hover:bg-brand-primary/20"
          >
            {tag}
          </button>
        ))}
      </div>
      <CopyButton text={allText} label="Copiar todas as hashtags" />
    </div>
  );
}
