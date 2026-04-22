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

  // Novo fluxo: o usuário indica se já filmou ou ainda vai filmar.
  // Se ainda vai filmar, opcionalmente pede um roteiro pronto.
  const [hasVideo, setHasVideo] = useState("ready"); // "ready" | "making"
  const [wantsScript, setWantsScript] = useState(false);

  function handleHasVideoChange(next) {
    setHasVideo(next);
    // Vídeo "pronto" não precisa de roteiro — reseta o sub-estado
    // pra manter o submit coerente.
    if (next === "ready") setWantsScript(false);
  }

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
    onSubmit({
      platform,
      topic: trimmed,
      language,
      hasVideo,
      wantsScript: hasVideo === "making" ? wantsScript : false,
    });
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

      <VideoStatusPicker
        value={hasVideo}
        onChange={handleHasVideoChange}
        disabled={loading}
      />

      {hasVideo === "making" && (
        <ScriptPicker
          value={wantsScript}
          onChange={setWantsScript}
          disabled={loading}
        />
      )}

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
          "Gerar ideias virais"
        )}
      </button>
    </form>
  );
}

/**
 * 2 cards lado a lado: "Já está pronto" vs. "Ainda estou fazendo".
 * Essa pergunta muda o que o app vai gerar (com ou sem roteiro).
 */
function VideoStatusPicker({ value, onChange, disabled }) {
  const options = [
    {
      id: "ready",
      label: "Já está pronto",
      hint: "Só preciso do título, descrição e hashtags",
    },
    {
      id: "making",
      label: "Ainda estou fazendo",
      hint: "Posso precisar de ajuda com o roteiro",
    },
  ];
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 block text-sm font-semibold text-brand-dark">
        Seu vídeo
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const isActive = value === o.id;
          return (
            <label
              key={o.id}
              className={[
                "flex cursor-pointer flex-col items-start gap-0.5 rounded-xl border-2 px-3 py-3 text-left transition",
                isActive
                  ? "border-brand-primary bg-brand-primary/10 shadow-sm"
                  : "border-slate-200 bg-white hover:border-brand-primary/40",
                disabled && "cursor-not-allowed opacity-50",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <input
                type="radio"
                name="hasVideo"
                value={o.id}
                checked={isActive}
                onChange={() => onChange(o.id)}
                disabled={disabled}
                className="sr-only"
              />
              <span className="text-sm font-semibold text-brand-dark">
                {o.label}
              </span>
              <span className="text-xs text-brand-muted">{o.hint}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Aparece só quando `hasVideo === "making"`.
 * 2 opções: "Sim, me ajuda" / "Não, só os títulos".
 */
function ScriptPicker({ value, onChange, disabled }) {
  const options = [
    {
      id: true,
      label: "Sim, me ajuda",
      hint: "Gera um roteiro (hook, desenvolvimento, CTA)",
    },
    {
      id: false,
      label: "Não, só os títulos",
      hint: "Vou escrever o roteiro sozinho",
    },
  ];
  return (
    <fieldset className="space-y-2 rounded-xl bg-slate-50 p-3">
      <legend className="mb-2 block text-sm font-semibold text-brand-dark">
        Quer uma sugestão de roteiro?
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const isActive = value === o.id;
          return (
            <label
              key={String(o.id)}
              className={[
                "flex cursor-pointer flex-col items-start gap-0.5 rounded-lg border-2 bg-white px-3 py-2.5 text-left transition",
                isActive
                  ? "border-brand-primary bg-brand-primary/10 shadow-sm"
                  : "border-slate-200 hover:border-brand-primary/40",
                disabled && "cursor-not-allowed opacity-50",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <input
                type="radio"
                name="wantsScript"
                checked={isActive}
                onChange={() => onChange(o.id)}
                disabled={disabled}
                className="sr-only"
              />
              <span className="text-sm font-semibold text-brand-dark">
                {o.label}
              </span>
              <span className="text-xs text-brand-muted">{o.hint}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
