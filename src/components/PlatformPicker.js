"use client";

const PLATFORMS = [
  { id: "all", label: "Todas", emoji: "🌐", hint: "YT + TikTok + Reels" },
  { id: "youtube", label: "YouTube", emoji: "▶️", hint: "Shorts e longo" },
  { id: "tiktok", label: "TikTok", emoji: "🎵", hint: "For You Page" },
  { id: "instagram", label: "Reels", emoji: "📸", hint: "Instagram Reels" },
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
                "flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-center transition",
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
              <span className="text-2xl" aria-hidden="true">
                {p.emoji}
              </span>
              <span className="text-sm font-semibold text-brand-dark">
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
