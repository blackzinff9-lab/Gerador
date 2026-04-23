"use client";

import PlatformPicker from "../components/PlatformPicker";

export default function PlatformSelection({ onSelect }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-8 sm:py-12">
      <header className="mb-8 text-center animate-fade-in">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-brand-dark sm:text-5xl">
          Crie vídeos completos pra suas redes sociais
        </h1>
      </header>
      <PlatformPicker onChange={onSelect} />
    </main>
  );
}
