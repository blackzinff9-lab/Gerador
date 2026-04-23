"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";

// Card do roteiro. Por padrão, é "fechado" (só mostra o gancho).
// Ao clicar, abre um MODAL DE FOCO para ler/copiar o roteiro completo sem
// distrações, melhorando a UX em telas pequenas e reduzindo a poluição visual.

export default function ScriptCard({ script }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!script || !script.hook) return null;

  const blocks = [
    { key: "hook", title: "Gancho (0–3 segundos)", value: script.hook },
    { key: "body", title: "Desenvolvimento", value: script.body },
    { key: "cta", title: "Chamada pra ação (final)", value: script.cta },
  ].filter((b) => typeof b.value === "string" && b.value.trim().length > 0);

  if (blocks.length === 0) return null;

  const fullText = blocks
    .map((b) => `${b.title.toUpperCase()}\n${b.value}`)
    .join("\n\n");

  return (
    <>
      {/* O card "fechado" que fica na página principal */}
      <article className="rounded-2xl border-2 border-brand-primary/30 bg-brand-primary/5 p-5 shadow-sm sm:p-6">
        <header className="mb-4">
          <h2 className="font-display text-xl font-bold text-brand-primary">
            Roteiro sugerido
          </h2>
          <p className="text-xs text-brand-muted">
            Uma base para o seu vídeo. Adapte para a sua voz.
          </p>
        </header>

        {/* Preview do gancho */}
        <div className="relative mb-4 rounded-lg border border-slate-200 bg-white p-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-primary">
            Gancho (prévia)
          </h3>
          <p className="truncate text-sm leading-relaxed text-brand-dark">
            {script.hook}
          </p>
          <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-t from-white to-transparent" />
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary/90"
        >
          Ver Roteiro Completo
        </button>
      </article>

      {/* O Modal de Foco (renderizado fora do fluxo normal) */}
      {isModalOpen && (
        <FocusModal
          blocks={blocks}
          fullText={fullText}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

function FocusModal({ blocks, fullText, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      aria-labelledby="script-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-slate-50 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()} // Impede que o clique dentro do modal feche-o
      >
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              id="script-modal-title"
              className="font-display text-2xl font-bold text-brand-primary"
            >
              Roteiro Completo
            </h2>
            <p className="text-sm text-brand-muted">
              Use os botões para copiar cada trecho.
            </p>
          </div>
          <CopyButton text={fullText} label="Copiar Tudo" />
        </header>

        <div className="space-y-4">
          {blocks.map((b) => (
            <ScriptBlock key={b.key} block={b} />
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          aria-label="Fechar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ScriptBlock({ block }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-primary">
          {block.title}
        </h3>
        <CopyButton text={block.value} label="Copiar" />
      </div>
      <p className="whitespace-pre-wrap text-base leading-relaxed text-brand-dark">
        {block.value}
      </p>
    </div>
  );
}
