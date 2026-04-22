"use client";

// Seleção de plataforma. Sem emojis — linguagem mais profissional, o
// nome da plataforma por si só já identifica (e a marca da plataforma
// tem mais peso visual que um emoji genérico).
const PLATFORMS = [
  { id: "all", label: "Todas", hint: "YT + TikTok + Reels" },
  { id: "youtube", label: "YouTube", hint: "Shorts e longo" },
  { id: "tiktok", label: "TikTok", hint: "For You Page" },
  { id: "instagram", label: "Reels", hint: "Instagram Reels" },
];

export default function PlatformPicker({ value, onChange, disabled }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 block text-sm font-semibold text-brand-dark">
        Qual rede social?
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PLATFORMS.map((p) => {
          const isActive = value === p.id;
          return (
            <label
              key={p.id}
              className={[
                "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 px-3 py-4 text-center transition",
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
                name="platform"
                value={p.id}
                checked={isActive}
                onChange={() => onChange(p.id)}
                disabled={disabled}
                className="sr-only"
              />
              <span className="font-display text-base font-bold text-brand-dark">
                {p.label}
              </span>
              <span className="text-xs text-brand-muted">{p.hint}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
