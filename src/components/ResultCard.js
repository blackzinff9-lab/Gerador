"use client";

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

  const titles = Array.isArray(platform.titles) ? platform.titles : [];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-4">
        <h2 className={`font-display text-xl font-bold ${meta.color}`}>
          {meta.label}
        </h2>
      </header>

      <div className="space-y-5">
        <Section title="Títulos virais (3 opções)">
          <ol className="space-y-2">
            {titles.map((t, idx) => (
              <li
                key={`${idx}-${t.slice(0, 16)}`}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex-1">
                  <span className="mr-2 inline-block rounded-full bg-brand-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-primary">
                    Opção {idx + 1}
                  </span>
                  <span className="text-base font-semibold leading-snug text-brand-dark">
                    {t}
                  </span>
                </div>
                <CopyButton text={t} label="Copiar" />
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Descrição" copyText={platform.description}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-dark">
            {platform.description}
          </p>
        </Section>

        <Section title="Hashtags em alta">
          <HashtagList hashtags={platform.hashtags} />
        </Section>

        <Section title="Estilo de edição sugerido">
          <EditingStyle style={platform.editingStyle} />
        </Section>

        {/* TODO: Monetização — link afiliado (CapCut Pro, Premiere, etc) pode entrar aqui */}
      </div>
    </article>
  );
}

function Section({ title, children, copyText }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
          {title}
        </h3>
        {copyText && <CopyButton text={copyText} />}
      </div>
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
