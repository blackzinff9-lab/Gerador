"use client";

import { useState } from "react";
import GeneratorForm from "@/components/GeneratorForm";
import ResultCard from "@/components/ResultCard";
import LoadingState from "@/components/LoadingState";
import ErrorMessage from "@/components/ErrorMessage";
import Footer from "@/components/Footer";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [lastPayload, setLastPayload] = useState(null);

  async function handleGenerate(payload) {
    setLoading(true);
    setError(null);
    setResult(null);
    setLastPayload(payload);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(
          json?.error?.message ??
            "Algo deu errado do nosso lado. Tente de novo em instantes."
        );
        return;
      }

      setResult(json.data);
    } catch (e) {
      console.error("[page] fetch failed", e);
      setError(
        "Sem conexão agora. Verifique sua internet e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleRetry() {
    if (lastPayload) handleGenerate(lastPayload);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8 sm:py-12">
      <header className="mb-8 text-center animate-fade-in">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-brand-dark sm:text-5xl">
          ENGAJA<span className="text-brand-primary">Í</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-brand-muted sm:text-base">
          Títulos, hashtags, descrições e roteiros virais em segundos.
          <span className="font-semibold text-brand-dark"> Grátis.</span>
        </p>
      </header>

      <section className="mb-8">
        <GeneratorForm onSubmit={handleGenerate} loading={loading} />
      </section>

      <section className="flex-1 space-y-4" aria-live="polite">
        {loading && <LoadingState />}

        {error && !loading && (
          <ErrorMessage message={error} onRetry={handleRetry} />
        )}

        {result?.platforms?.length > 0 && !loading && (
          <div className="space-y-4 animate-fade-in">
            {result.platforms.map((platform) => (
              <ResultCard key={platform.name} platform={platform} />
            ))}
          </div>
        )}
      </section>

      {/* TODO: Monetização — slot AdSense banner horizontal (728x90 desktop / 320x50 mobile) aqui */}

      <Footer />
    </main>
  );
}
