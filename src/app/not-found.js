import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <h2 className="mb-2 font-display text-3xl font-bold text-brand-dark">
        Página não encontrada
      </h2>
      <p className="mb-6 text-sm text-brand-muted">
        A página que você procura não existe ou foi movida.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-brand-primary px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-primary/90"
      >
        Voltar para o início
      </Link>
    </main>
  );
}
