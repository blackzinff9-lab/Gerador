"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";
import HashtagList from "./HashtagList";

// Sem emojis — visual mais profissional. A cor e o label identificam.
const PLATFORM_META = {
  youtube: { label: "YouTube", color: "text-red-600" },
  tiktok: { label: "TikTok", color: "text-brand-dark" },
  instagram: {
    label: "Instagram Reels",
    color: "text-pink-600",
  },
};

export default function ResultCard({ platform }) {
  const meta = PLATFORM_META[platform.name] ?? {
    label: platform.name,
    color: "text-brand-dark",
  };

  // Backwards-compat: se ainda chegar um payload antigo com
  // `titles/description/hashtags` no nível da plataforma (cache velho ou
  // fallback), converte em variants[] pra UI não quebrar.
  const variants = normalizeVariants(platform);

  // O usuário escolhe um dos 3 variants clicando — descrição + hashtags
  // mostradas abaixo são sempre do variant selecionado.
  const [selected, setSelected] = useState(0);
  const current = variants[selected] ?? variants[0] ?? null;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-4">
        <h2 className={`font-display text-xl font-bold ${meta.color}`}>
          {meta.label}
        </h2>
      </header>

      <div className="space-y-5">
        <Section
          title="Títulos virais (3 opções)"
          hint="Clique no título que você mais gostar — a descrição e as hashtags abaixo se ajustam a ele."
        >
          <ol className="space-y-2">
            {variants.map((v, idx) => {
              const isActive = idx === selected;
              // Wrapper é <div role="button"> (não <button>) pra permitir
              // aninhar o <button> do CopyButton dentro sem HTML inválido.
              return (
                <li key={`${idx}-${v.title.slice(0, 16)}`}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(idx);
                      }
                    }}
                    aria-pressed={isActive}
                    className={[
                      "flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg border-2 px-3 py-2 text-left transition",
                      isActive
                        ? "border-brand-primary bg-brand-primary/10 shadow-sm"
                        : "border-slate-200 bg-slate-50 hover:border-brand-primary/40 hover:bg-white",
                    ].join(" ")}
                  >
                    <div className="flex-1">
                      <span
                        className={[
                          "mr-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          isActive
                            ? "bg-brand-primary text-white"
                            : "bg-brand-primary/15 text-brand-primary",
                        ].join(" ")}
                      >
                        {isActive ? `Escolhido • Opção ${idx + 1}` : `Opção ${idx + 1}`}
                      </span>
                      <span className="text-base font-semibold leading-snug text-brand-dark">
                        {v.title}
                      </span>
                    </div>
                    {/* stopPropagation pra não selecionar o variant quando
                        o usuário só queria copiar o título. */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <CopyButton text={v.title} label="Copiar" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Section>

        {current && (
          <>
            <Section
              title="Descrição"
              copyText={current.description}
              hint={`Personalizada pro título "${truncate(current.title, 40)}".`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-dark">
                {current.description}
              </p>
            </Section>

            <Section
              title="Hashtags em alta"
              hint="Combinam com o título escolhido acima."
            >
              <HashtagList hashtags={current.hashtags} />
            </Section>
          </>
        )}

        <Section title="Estilo de edição sugerido">
          <EditingStyle style={platform.editingStyle} />
        </Section>

        {/* TODO: Monetização — link afiliado (CapCut Pro, Premiere, etc) pode entrar aqui */}
      </div>
    </article>
  );
}

function Section({ title, children, copyText, hint }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
          {title}
        </h3>
        {copyText && <CopyButton text={copyText} />}
      </div>
      {hint && <p className="mb-2 text-[11px] text-brand-muted">{hint}</p>}
      {!hint && <div className="mb-1" />}
      {children}
    </div>
  );
}

function EditingStyle({ style }) {
  if (!style) return null;

  const rows = [
    { label: "Ritmo", value: style.pacing },
    { label: "Gancho (3 primeiros segundos)", value: style.hook },
    { label: "Tipo de cortes", value: style.cuts },
    { label: "Estilo de música", value: style.music },
    { label: "Duração recomendada", value: style.duration },
  ];

  return (
    <div className="space-y-3 text-sm">
      <dl className="space-y-2">
        {rows.map((r) =>
          r.value ? (
            <div key={r.label}>
              <dt className="text-xs font-semibold text-brand-muted">
                {r.label}
              </dt>
              <dd className="text-brand-dark">{r.value}</dd>
            </div>
          ) : null
        )}
      </dl>

      {Array.isArray(style.tips) && style.tips.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-brand-muted">
            Dicas práticas
          </p>
          <ul className="list-disc space-y-1 pl-5 text-brand-dark">
            {style.tips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Converte o shape da plataforma em variants[].
 * Fonte canônica: `platform.variants`. Em caso de payload antigo em cache
 * (titles[] + description + hashtags no nível da plataforma), constrói
 * 3 variants usando a mesma descrição/hashtags — mantém a UI funcional
 * até o cache antigo expirar.
 */
function normalizeVariants(platform) {
  if (Array.isArray(platform?.variants) && platform.variants.length > 0) {
    return platform.variants.filter(
      (v) => v && typeof v.title === "string" && v.title.trim().length > 0
    );
  }

  const legacyTitles = Array.isArray(platform?.titles) ? platform.titles : [];
  if (legacyTitles.length === 0) return [];
  return legacyTitles.map((t) => ({
    title: String(t),
    description:
      typeof platform.description === "string" ? platform.description : "",
    hashtags: Array.isArray(platform.hashtags) ? platform.hashtags : [],
  }));
}

function truncate(text, n) {
  const s = String(text ?? "");
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}
