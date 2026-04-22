"use client";

// Wrapper client-side pros contextos de alto nível. Hoje só o SessionProvider
// do NextAuth; se um dia colocarmos ThemeProvider, QueryClient etc., é aqui.

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
