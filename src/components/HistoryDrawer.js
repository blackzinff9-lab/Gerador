"use client";

// Drawer lateral com o histórico do usuário logado.
//   • Lista as últimas gerações (tema + plataforma + data).
//   • Clique em "Reabrir" restaura o resultado sem gastar nova chamada.
//   • Clique em "×" remove aquela entrada.
//   • Botão "Limpar tudo" apaga o histórico todo (com confirmação).

import { useEffect, useState } from "react";
import {
  readHistory,
  removeEntry,
  clearHistory,
  summarize,
} from "@/lib/history";

export default function HistoryDrawer({ open, onClose, user, onRestore }) {
  const [entries, setEntries] = useState([]);

  // Recarrega a lista toda vez que a drawer abre — assim novas gerações
  // feitas enquanto a drawer estava fechada aparecem ao reabrir.
  useEffect(() => {
    if (!open || !user) return;
    setEntries(readHistory(user));
  }, [open, user]);

  if (!open) return null;

  function handleRemove(id) {
    removeEntry(user, id);
    setEntries(readHistory(user));
  }

  function handleClear() {
    if (!window.confirm("Apagar todo o seu histórico? Essa ação não pode ser desfeita.")) {
      return;
    }
    clearHistory(user);
    setEntries([]);
  }

  function handleRestore(entry) {
    onRestore?.(entry);
    onClose?.();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-title"
      className="fixed inset-0 z-30"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fechar histórico"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 transition"
      />

      {/* Painel */}
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2
              id="history-title"
              className="font-display text-lg font-bold text-brand-dark"
            >
              Histórico
            </h2>
            <p className="text-[11px] text-brand-muted">
              {entries.length === 0
                ? "Nenhuma geração salva ainda."
                : `${entries.length} geração${entries.length === 1 ? "" : "ões"} salva${entries.length === 1 ? "" : "s"} neste dispositivo.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1.5 text-brand-muted transition hover:bg-slate-100 hover:text-brand-dark"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10 text-2xl text-brand-primary">
                🗂️
              </div>
              <p className="text-sm font-semibold text-brand-dark">
                Nada por aqui ainda
              </p>
              <p className="mt-1 text-xs text-brand-muted">
                Cada tema que você gerar aparece aqui — clique em qualquer um
                pra reabrir os resultados sem gerar de novo.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <li key={entry.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-brand-dark">
                        {entry.topic}
                      </p>
                      <p className="mt-0.5 text-[11px] text-brand-muted">
                        {summarize(entry)} · {formatDate(entry.savedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Remover do histórico"
                      onClick={() => handleRemove(entry.id)}
                      className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                        <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestore(entry)}
                    className="mt-2 inline-flex items-center gap-1 rounded-md bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-primary transition hover:bg-brand-primary hover:text-white"
                  >
                    Reabrir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {entries.length > 0 && (
          <footer className="border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-red-600 transition hover:text-red-700"
            >
              Limpar histórico
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}

function formatDate(ts) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
