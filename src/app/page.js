"use client";

import { useState } from "react";
import GeneratorForm from "@/components/GeneratorForm";
import ResultCard from "@/components/ResultCard";
import ScriptCard from "@/components/ScriptCard";
import IdeasList from "@/components/IdeasList";
import LoadingState from "@/components/LoadingState";
import ErrorMessage from "@/components/ErrorMessage";
import Footer from "@/components/Footer";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [lastPayload, setLastPayload] = useState(null);

  // "Conteúdo infinito" — estado separado porque é uma chamada secundária
  // feita depois do resultado principal e não queremos resetar o resultado
  // ao fazê-la.
  const [ideas, setIdeas] = useState(null);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState(null);

  async function handleGenerate(payload) {
    setLoading(true);
    setError(null);
    setResult(null);
    setLastPayload(payload);
    // Reset também as ideias — uma nova geração representa um novo tema,
    // faria sentido revogar a lista anterior.
    setIdeas(null);
    setIdeasError(null);

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

  async function handleGenerateIdeas() {
    if (!result || !lastPayload) return;

    // seedTitles: pega o primeiro título de cada plataforma + os 3 da
    // primeira (o máximo de variedade pro Gemini ter contexto da série).
    const allTitles = (result.platforms ?? [])
      .flatMap((p) => (Array.isArray(p.titles) ? p.titles : []))
      .filter(Boolean);

    const seedTitles = Array.from(new Set(allTitles)).slice(0, 9);

    setIdeasLoading(true);
    setIdeasError(null);

    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: lastPayload.topic,
          language: lastPayload.language,
          platform: lastPayload.platform,
          seedTitles,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setIdeasError(
          json?.error?.message ??
            "Não conseguimos gerar ideias agora. Tente de novo."
        );
        return;
      }

      setIdeas(json.data?.ideas ?? []);
    } catch (e) {
      console.error("[page] ideas fetch failed", e);
      setIdeasError(
        "Sem conexão agora. Verifique sua internet e tente novamente."
      );
    } finally {
      setIdeasLoading(false);
    }
  }

  const hasResults =
    !!result && Array.isArray(result.platforms) && result.platforms.length > 0;

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

        {hasResults && !loading && (
          <div className="space-y-4 animate-fade-in">
            {/* Roteiro aparece UMA vez no topo — é transversal às plataformas */}
            {result.script && <ScriptCard script={result.script} />}

            {result.platforms.map((platform) => (
              <ResultCard key={platform.name} platform={platform} />
            ))}

            {/* Conteúdo infinito — só oferece depois que já tem resultado */}
            {!ideas && !ideasLoading && !ideasError && (
              <button
                type="button"
                onClick={handleGenerateIdeas}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-brand-primary bg-white px-5 py-3.5 font-display font-bold text-brand-primary shadow-sm transition hover:bg-brand-primary hover:text-white"
              >
                Gerar conteúdo infinito (10 próximos vídeos)
              </button>
            )}

            {(ideasLoading || ideasError || ideas) && (
              <IdeasList
                ideas={ideas}
                loading={ideasLoading}
                error={ideasError}
                onRetry={handleGenerateIdeas}
              />
            )}
          </div>
        )}
      </section>

      {/* TODO: Monetização — slot AdSense banner horizontal (728x90 desktop / 320x50 mobile) aqui */}

      <Footer />
    </main>
  );
}
