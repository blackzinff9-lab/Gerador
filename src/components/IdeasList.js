"use client";

import CopyButton from "./CopyButton";

// Card "Conteúdo Infinito" — 10 ideias de próximos vídeos interligados.
// Mostra título + 1 linha de gancho. Cada título é copiável individualmente.

export default function IdeasList({ ideas, loading, error, onRetry }) {
  if (loading) {
    return (
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <header className="mb-4">
          <h2 className="font-display text-xl font-bold text-brand-dark">
            Conteúdo infinito
          </h2>
          <p className="text-xs text-brand-muted">
            Gerando 10 próximos vídeos interligados…
          </p>
        </header>
        <ol className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <li
              key={i}
              className="skeleton h-14 w-full rounded-lg"
              aria-hidden="true"
            />
          ))}
        </ol>
      </article>
    );
  }

  if (error) {
    return (
      <article
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm sm:p-6"
      >
        <h2 className="font-display text-lg font-bold text-red-700">
          Não deu pra gerar as ideias
        </h2>
        <p className="mt-1 text-sm text-red-700">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Tentar novamente
          </button>
        )}
      </article>
    );
  }

  if (!Array.isArray(ideas) || ideas.length === 0) return null;

  const allText = ideas
    .map((it, i) => `${i + 1}. ${it.title}\n   ${it.hook}`)
    .join("\n\n");

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 animate-fade-in">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-bold text-brand-dark">
            Conteúdo infinito
          </h2>
          <p className="text-xs text-brand-muted">
            10 próximos vídeos interligados com o tema — monte sua série.
          </p>
        </div>
        <CopyButton text={allText} label="Copiar lista" />
      </header>

      <ol className="space-y-2">
        {ideas.map((idea, idx) => (
          <li
            key={`${idx}-${idea.title.slice(0, 16)}`}
            className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
          >
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="inline-block shrink-0 rounded-full bg-brand-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-primary">
                  {idx + 1}
                </span>
                <span className="text-sm font-semibold leading-snug text-brand-dark">
                  {idea.title}
                </span>
              </div>
              <p className="mt-1 pl-8 text-xs leading-relaxed text-brand-muted">
                {idea.hook}
              </p>
            </div>
            <CopyButton text={idea.title} label="Copiar título" />
          </li>
        ))}
      </ol>
    </article>
  );
}
