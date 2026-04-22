// Config do NextAuth (v4).
//
// Escolhas:
//   • Provider único: Google OAuth. É o fluxo mais simples e familiar pro
//     usuário — 2 cliques e está logado. Nenhuma senha pra gerenciar.
//   • Session strategy: JWT. Não precisamos de banco de dados pra armazenar
//     sessões — o token assinado (HS256 com NEXTAUTH_SECRET) viaja em cookie
//     HttpOnly. Funciona no Vercel Hobby de graça, sem infra extra.
//   • Callbacks: copia sub (Google user id) e email pro JWT, assim dá pra
//     chavear dados do usuário (histórico em localStorage, no caso) pelo
//     email sem depender do Google API a cada request.

import GoogleProvider from "next-auth/providers/google";

/**
 * authOptions é exportado pra ser usado pelo route handler E pelo
 * getServerSession quando precisarmos checar a sessão em outros endpoints
 * (ex.: rate limit diferenciado pra usuário logado).
 */
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // Pedindo só o escopo básico (openid + email + profile). Nada mais
      // é necessário e é mais fácil de aprovar no Google Cloud.
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "select_account", // sempre deixa o usuário escolher conta
        },
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias — OK pra um app grátis
  },

  // Cookies default já são sane (HttpOnly, SameSite=lax, secure em prod).

  callbacks: {
    /**
     * No primeiro sign-in, o parâmetro `profile` vem do Google.
     * Copiamos sub (id estável do usuário Google) e picture pro JWT, assim
     * ficam acessíveis no client via useSession sem chamar o Google de novo.
     */
    async jwt({ token, profile }) {
      if (profile) {
        token.sub = profile.sub ?? token.sub;
        token.picture = profile.picture ?? token.picture;
      }
      return token;
    },

    /**
     * Session callback expõe no client o que o JWT tem.
     * Mantemos superficial: nome, email, imagem. Nada sensível.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? null;
        session.user.image = token.picture ?? session.user.image ?? null;
      }
      return session;
    },
  },

  pages: {
    // Usa a tela padrão do NextAuth. Se um dia quisermos UI custom,
    // apontamos pra uma rota nossa aqui.
  },
};
