// Route handler catch-all do NextAuth.
// Cobre /api/auth/signin, /api/auth/signout, /api/auth/callback/google,
// /api/auth/session, /api/auth/csrf — sem precisar escrever cada uma.

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export async function GET(request, context) {
  console.log(`Accessed GET ${request.nextUrl.pathname}`);
  return handler(request, context);
}

export async function POST(request, context) {
  console.log(`Accessed POST ${request.nextUrl.pathname}`);
  return handler(request, context);
}
