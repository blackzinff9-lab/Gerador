"use client";

import CopyButton from "./CopyButton";

// Card do roteiro sugerido. Aparece só quando o usuário marcou
// "ainda estou fazendo o vídeo" + "sim, quero roteiro".
//
// Três blocos copiáveis separadamente (é como o criador filma):
//   Hook         = os primeiros 0-3 segundos
//   Desenvolvimento = o miolo
//   CTA          = chamada pra ação final

export default function ScriptCard({ script }) {
  if (!script) return null;

  const blocks = [
    {
      key: "hook",
      title: "Gancho (0–3 segundos)",
      value: script.hook,
      hint: "A primeira coisa que o espectador vê/ouve. Faz ou quebra a retenção.",
    },
    {
      key: "body",
      title: "Desenvolvimento",
      value: script.body,
      hint: "O miolo do vídeo — história, tutorial, informação principal.",
    },
    {
      key: "cta",
      title: "Chamada pra ação (final)",
      value: script.cta,
      hint: "Seu pedido final ao espectador: seguir, comentar, salvar.",
    },
  ];

  const fullText = blocks
    .filter((b) => typeof b.value === "string" && b.value.trim().length > 0)
    .map((b) => `${b.title.toUpperCase()}\n${b.value}`)
    .join("\n\n");

  if (!fullText) return null;

  return (
    <article className="rounded-2xl border-2 border-brand-primary/30 bg-brand-primary/5 p-5 shadow-sm sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-bold text-brand-primary">
            Roteiro sugerido
          </h2>
          <p className="text-xs text-brand-muted">
            Baseado no tema do seu vídeo. Adapte à sua voz.
          </p>
        </div>
        <CopyButton text={fullText} label="Copiar tudo" />
      </header>

      <div className="space-y-4">
        {blocks.map((b) =>
          typeof b.value === "string" && b.value.trim().length > 0 ? (
            <ScriptBlock key={b.key} block={b} />
          ) : null
        )}
      </div>
    </article>
  );
}

function ScriptBlock({ block }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
            {block.title}
          </h3>
          <p className="text-[11px] text-brand-muted">{block.hint}</p>
        </div>
        <CopyButton text={block.value} label="Copiar" />
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-dark">
        {block.value}
      </p>
    </div>
  );
}
