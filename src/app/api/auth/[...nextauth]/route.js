// Route handler catch-all do NextAuth.
// Cobre /api/auth/signin, /api/auth/signout, /api/auth/callback/google,
// /api/auth/session, /api/auth/csrf — sem precisar escrever cada uma.

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
