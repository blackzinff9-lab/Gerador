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

    // seedTitles: extrai os títulos de todos os variants de todas as
    // plataformas (até 9) — assim o Gemini tem o panorama dos ângulos
    // que o usuário já viu e as 10 ideias novas não repetem.
    // Compat: se o payload ainda estiver no formato antigo (titles[]),
    // aceita também.
    const allTitles = (result.platforms ?? [])
      .flatMap((p) => {
        if (Array.isArray(p.variants) && p.variants.length > 0) {
          return p.variants.map((v) => v?.title).filter(Boolean);
        }
        if (Array.isArray(p.titles)) return p.titles.filter(Boolean);
        return [];
      })
      .filter((t) => typeof t === "string" && t.trim().length > 0);

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

            {/* Conteúdo infinito — bloco chamativo com explicação do que o botão faz. */}
            {!ideas && !ideasLoading && !ideasError && (
              <InfiniteContentCTA onClick={handleGenerateIdeas} />
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

/**
 * Bloco "Conteúdo Infinito".
 * Precisa ser CHAMATIVO (o usuário tende a não clicar se parecer botão
 * secundário) e trazer uma explicação curta do que ele faz logo abaixo
 * do título. Visual: fundo com gradiente leve da cor da marca, borda
 * destacada, botão com gradient e micro-interação no hover.
 */
function InfiniteContentCTA({ onClick }) {
  return (
    <section
      aria-labelledby="infinite-title"
      className="relative overflow-hidden rounded-2xl border-2 border-brand-primary/40 bg-gradient-to-br from-brand-primary/10 via-white to-brand-accent/10 p-5 shadow-sm sm:p-6 animate-fade-in"
    >
      {/* Marca d'água sutil do símbolo infinito pra reforçar a ideia */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -top-2 select-none font-display text-[110px] font-extrabold leading-none text-brand-primary/5"
      >
        ∞
      </span>

      <div className="relative flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white shadow-md">
          <span aria-hidden="true" className="text-2xl font-bold leading-none">
            ∞
          </span>
        </div>
        <div className="flex-1">
          <h3
            id="infinite-title"
            className="font-display text-lg font-extrabold text-brand-dark sm:text-xl"
          >
            Conteúdo infinito
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-brand-dark/80">
            Gera <strong>10 ideias de próximos vídeos</strong> interligadas com
            o tema que você acabou de criar. São vídeos do mesmo nicho que
            formam uma <strong>série</strong> — o algoritmo entende que quem
            assiste um provavelmente vai querer ver os outros e passa a
            recomendar o seu canal em sequência. Resultado: mais retenção, mais
            views e crescimento mais rápido sem precisar pensar no que postar
            depois.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="group relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-brand-primary to-emerald-500 px-5 py-3.5 font-display text-base font-extrabold text-white shadow-md transition hover:shadow-lg hover:brightness-110 active:scale-[0.99]"
      >
        <span aria-hidden="true" className="text-xl leading-none">
          ∞
        </span>
        <span>Gerar 10 próximos vídeos</span>
      </button>

      <p className="mt-2 text-center text-[11px] text-brand-muted">
        Grátis — funciona igual ao gerador principal, leva ~5 segundos.
      </p>
    </section>
  );
}
