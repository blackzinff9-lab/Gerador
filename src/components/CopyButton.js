"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "Copiar", className = "" }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback para contextos sem clipboard (raros em HTTPS)
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.error("[CopyButton] failed", e);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={[
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition",
        copied
          ? "bg-brand-primary text-white"
          : "bg-slate-100 text-brand-dark hover:bg-slate-200",
        className,
      ].join(" ")}
      aria-live="polite"
    >
      {copied ? (
        <>
          <span aria-hidden="true">✓</span> Copiado!
        </>
      ) : (
        <>
          <span aria-hidden="true">📋</span> {label}
        </>
      )}
    </button>
  );
}
