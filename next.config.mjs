/** @type {import('next').NextConfig} */

// Headers de segurança aplicados a TODAS as rotas.
// Objetivos:
//   • CSP: reduzir superfície de XSS caso algum dia um sink inseguro entre.
//   • HSTS: forçar HTTPS (a Vercel serve via HTTPS por padrão).
//   • X-Frame-Options + frame-ancestors: anti-clickjacking.
//   • Referrer-Policy: não vazar URL interna em navegação externa.
//   • Permissions-Policy: desligar APIs do browser que o app não usa.
//
// Sobre o CSP:
//   Next.js 15 injeta scripts inline pra hydration/bootstrap. Sem um
//   middleware que gere nonce por request, precisamos de 'unsafe-inline'
//   em script-src e style-src. É a abordagem padrão recomendada pelo Next
//   até que adotemos nonces dinâmicos. Ainda assim, travar `default-src`,
//   `connect-src`, `frame-ancestors` e `object-src` já corta a maior parte
//   dos vetores de exfiltração e embed malicioso.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "browsing-topics=()",
      "interest-cohort=()",
      "payment=()",
      "usb=()",
    ].join(", "),
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // não vazar "X-Powered-By: Next.js"
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
