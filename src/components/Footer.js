export default function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-200 pt-6 text-center text-xs text-brand-muted">
      {/* TODO: Monetização — captura de email (newsletter via Resend grátis) aqui */}
      <p>
        Feito com 💚 no Brasil — 100% gratuito. Apoie compartilhando com
        outros criadores.
      </p>
      <p className="mt-1">
        ENGAJAÍ &copy; {new Date().getFullYear()}. Nenhum dado é armazenado.
      </p>
    </footer>
  );
}
