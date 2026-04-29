"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import ResultCard from "@/components/ResultCard";
import ScriptCard from "@/components/ScriptCard";
import IdeasList from "@/components/IdeasList";
import LoadingState from "@/components/LoadingState";
import ErrorMessage from "@/components/ErrorMessage";
import Footer from "@/components/Footer";
import AuthButton from "@/components/AuthButton";
import HistoryDrawer from "@/components/HistoryDrawer";
import { saveEntry } from "@/lib/history";

export default function ResultsPage({ payload }) {
  const { data: session } = useSession();
  const user = session?.user ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [lastPayload, setLastPayload] = useState(payload);

  const [ideas, setIdeas] = useState(null);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState(null);

  const [historyOpen, setHistoryOpen] = useState(false);

  async function handleGenerate(payload) {
    setLoading(true);
    setError(null);
    setResult(null);
    setLastPayload(payload);
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
      console.log(json.data)
      setResult(json.data);

      if (user) {
        saveEntry(user, {
          topic: payload.topic,
          platform: payload.platform,
          language: payload.language,
          hasVideo: payload.hasVideo,
          wantsScript: payload.wantsScript,
          data: json.data,
        });
      }
    } catch (e) {
      console.error("[ResultsPage] fetch failed", e);
      setError(
        "Sem conexão agora. Verifique sua internet e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (payload) {
      handleGenerate(payload);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  function handleRetry() {
    if (lastPayload) handleGenerate(lastPayload);
  }

  async function handleGenerateIdeas() {
    if (!result || !lastPayload) return;

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
      console.error("[ResultsPage] ideas fetch failed", e);
      setIdeasError(
        "Sem conexão agora. Verifique sua internet e tente novamente."
      );
    } finally {
      setIdeasLoading(false);
    }
  }

  function handleRestore(entry) {
    if (!entry?.data) return;
    setError(null);
    setIdeas(null);
    setIdeasError(null);
    setResult(entry.data);
    setLastPayload({
      topic: entry.topic,
      platform: entry.platform,
      language: entry.language ?? "pt-BR",
      hasVideo: entry.hasVideo ?? "ready",
      wantsScript: entry.wantsScript ?? false,
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const hasResults =
    !!result && Array.isArray(result.platforms) && result.platforms.length > 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8 sm:py-12">
      <div className="mb-4 flex items-center justify-end">
        <AuthButton onOpenHistory={() => setHistoryOpen(true)} />
      </div>

      <header className="mb-8 text-center animate-fade-in">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-brand-dark sm:text-5xl">
          ENGAJA<span className="text-brand-primary">Í</span>
        </h1>
      </header>

      <section className="flex-1 space-y-4" aria-live="polite">
        {loading && <LoadingState />}

        {error && !loading && (
          <ErrorMessage message={error} onRetry={handleRetry} />
        )}

        {hasResults && !loading && (
          <div className="space-y-4 animate-fade-in">
            {result.script && <ScriptCard script={result.script} />}

            {result.platforms.map((platform) => (
              <ResultCard key={platform.name} platform={platform} />
            ))}

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

      <Footer />

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        user={user}
        onRestore={handleRestore}
      />
    </main>
  );
}

function InfiniteContentCTA({ onClick }) {
  return (
    <section
      aria-labelledby="infinite-title"
      className="relative overflow-hidden rounded-2xl border-2 border-brand-primary/40 bg-gradient-to-br from-brand-primary/10 via-white to-brand-accent/10 p-5 shadow-sm sm:p-6 animate-fade-in"
    >
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
            o tema que você acabou de criar.
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
