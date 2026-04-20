"use client";

export default function ErrorBoundary({ error, reset }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <h2 className="mb-2 text-xl font-semibold text-brand-dark">
        Algo deu errado
      </h2>
      <p className="mb-6 text-sm text-brand-muted">
        Encontramos um problema inesperado. Você pode tentar de novo.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-brand-primary px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-primary/90"
      >
        Tentar novamente
      </button>
    </main>
  );
}
