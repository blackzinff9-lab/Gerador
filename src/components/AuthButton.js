"use client";

// Botão único que assume os 3 estados de sessão:
//   loading → skeleton discreto (sem flicker de "Entrar" → "Olá")
//   unauthenticated → "Entrar com Google" (abre popup/redirect do NextAuth)
//   authenticated → avatar + nome + dropdown com "Histórico" e "Sair"
//
// Fica no canto superior do header da home.

import { useState, useRef, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton({ onOpenHistory }) {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Fecha o menu ao clicar fora.
  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  if (status === "loading") {
    return (
      <div
        aria-hidden="true"
        className="skeleton h-9 w-28 rounded-full"
      />
    );
  }

  if (status !== "authenticated") {
    return (
      <button
        type="button"
        onClick={() => signIn("google")}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-brand-dark shadow-sm transition hover:border-brand-primary/40 hover:shadow"
      >
        <GoogleIcon />
        Entrar com Google
      </button>
    );
  }

  const user = session.user ?? {};
  const firstName = (user.name ?? "").split(" ")[0] || "Você";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 pr-3 text-sm font-semibold text-brand-dark shadow-sm transition hover:border-brand-primary/40 hover:shadow"
      >
        <Avatar user={user} />
        <span className="max-w-[120px] truncate">{firstName}</span>
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`transition ${menuOpen ? "rotate-180" : ""}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="truncate text-xs font-semibold text-brand-dark">
              {user.name ?? "Usuário"}
            </p>
            <p className="truncate text-[11px] text-brand-muted">
              {user.email ?? ""}
            </p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              onOpenHistory?.();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-brand-dark transition hover:bg-slate-50"
          >
            <span aria-hidden="true">🗂️</span>
            Histórico de gerações
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-brand-dark transition hover:bg-slate-50"
          >
            <span aria-hidden="true">↪</span>
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

function Avatar({ user }) {
  if (user.image) {
    // Usa <img> cru em vez de next/image — a foto do Google tem URL dinâmica
    // e não vale a pena configurar domínios remotos no next.config.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 rounded-full object-cover"
      />
    );
  }
  const initial = (user.name ?? user.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">
      {initial}
    </span>
  );
}

function GoogleIcon() {
  // Logo oficial simplificada. 16x16 inline SVG — sem precisar CDN.
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A9 9 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A9 9 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" />
    </svg>
  );
}
