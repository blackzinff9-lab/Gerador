"use client";

import { useState } from "react";

const MAX_TOPIC = 200;
const MIN_TOPIC = 3;

function CreationStagePicker({ value, onChange, disabled }) {
  const options = [
    {
      id: "ready",
      label: "Já tenho o vídeo pronto",
      hint: "Preciso de títulos, descrições e hashtags.",
    },
    {
      id: "script_ready",
      label: "Tenho o roteiro pronto",
      hint: "Preciso de títulos, descrições e hashtags.",
    },
    {
      id: "from_scratch",
      label: "Quero tudo do zero",
      hint: "Preciso de um roteiro, títulos, descrições e hashtags.",
    },
  ];

  return (
    <fieldset className="space-y-2">
      <div className="grid grid-cols-1 gap-2">
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
                name="creationStage"
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

export default function VideoDetails({ platform, onNext }) {
  const [topic, setTopic] = useState("");
  const [creationStage, setCreationStage] = useState("ready");
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
    onNext({
      topic: trimmed,
      platform,
      hasVideo: creationStage !== "from_scratch",
      wantsScript: creationStage === "from_scratch",
    });
  }

  const remaining = MAX_TOPIC - topic.length;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-8 sm:py-12">
      <form onSubmit={handleSubmit} className="w-full space-y-5">
        <h2 className="text-center font-display text-2xl font-bold text-brand-dark">
          Rede social: <span className="text-brand-primary">{platform}</span>
        </h2>
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
            rows={3}
            placeholder="ex: como fazer bolo de chocolate fofinho em 10 minutos"
            className="block w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-brand-dark shadow-sm transition placeholder:text-slate-400 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
          />
          <p className="flex items-center justify-between text-xs text-brand-muted">
            <span>Seja específico — quanto mais detalhe, melhor o resultado.</span>
            <span aria-live="polite">{remaining} caracteres</span>
          </p>
        </div>

        <CreationStagePicker value={creationStage} onChange={setCreationStage} />
        
        {localError && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {localError}
          </p>
        )}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3.5 font-display font-bold text-white shadow-md transition hover:bg-brand-primary/90"
        >
          Próximo
        </button>
      </form>
    </main>
  );
}