"use client";

import { useState } from "react";
import PlatformPicker from "./PlatformPicker";

const LANGUAGES = [
  { id: "pt-BR", label: "Português (Brasil)" },
  { id: "en-US", label: "English (US)" },
  { id: "es-ES", label: "Español" },
];

const MAX_TOPIC = 200;
const MIN_TOPIC = 3;

export default function GeneratorForm({ onSubmit, loading }) {
  const [platform, setPlatform] = useState("all");
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("pt-BR");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [localError, setLocalError] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = topic.trim();

    if (trimmed.length < MIN_TOPIC) {
      setLocalError(`Descreva o tema do vídeo (mínimo ${MIN_TOPIC} caracteres).`);
      return;
    }
    if (trimmed.length > MAX_TOPIC) {
      setLocalError(`O tema precisa ter até ${MAX_TOPIC} caracteres.`);
      return;
    }

    setLocalError(null);
    onSubmit({ platform, topic: trimmed, language });
  }

  const remaining = MAX_TOPIC - topic.length;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <PlatformPicker
        value={platform}
        onChange={setPlatform}
        disabled={loading}
      />

      <div className="space-y-2">
        <label
          htmlFor="topic"
          className="block text-sm font-semibold text-brand-dark"
        >
          Sobre o que é seu vídeo?
        </label>
        <textarea
          id="topic"
          name="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={MAX_TOPIC}
          disabled={loading}
          rows={3}
          placeholder="ex: como fazer bolo de chocolate fofinho em 10 minutos"
          className="block w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-brand-dark shadow-sm transition placeholder:text-slate-400 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary disabled:cursor-not-allowed disabled:bg-slate-50"
        />
        <p className="flex items-center justify-between text-xs text-brand-muted">
          <span>Seja específico — quanto mais detalhe, melhor o resultado.</span>
          <span aria-live="polite">{remaining} caracteres</span>
        </p>
      </div>

      <details
        className="rounded-lg bg-slate-50 px-3 py-2"
        open={advancedOpen}
        onToggle={(e) => setAdvancedOpen(e.currentTarget.open)}
      >
        <summary className="cursor-pointer text-xs font-semibold text-brand-muted">
          Opções avançadas
        </summary>
        <div className="mt-3">
          <label
            htmlFor="language"
            className="mb-1 block text-xs font-semibold text-brand-dark"
          >
            Idioma / região
          </label>
          <select
            id="language"
            name="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={loading}
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-brand-dark focus:border-brand-primary focus:ring-1 focus:ring-brand-primary disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </details>

      {localError && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {localError}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3.5 font-display font-bold text-white shadow-md transition hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:bg-brand-primary/60"
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Gerando ideias…
          </>
        ) : (
          <>🚀 Gerar ideias virais</>
        )}
      </button>
    </form>
  );
}
