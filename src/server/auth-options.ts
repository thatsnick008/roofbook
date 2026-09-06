import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "./db/client";
import { users } from "./db/schema";

if (!process.env.NEXTAUTH_SECRET) {
  // Surfaces in Vercel function logs instead of a bare "Server error" page.
  console.error("[auth] NEXTAUTH_SECRET is missing — required in production or NextAuth will refuse to start.");
}
if (!isDatabaseConfigured()) {
  console.error("[auth] DATABASE_URL is missing — accounts cannot be created or verified without it.");
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !isDatabaseConfigured()) return null;

        const email = credentials.email.trim().toLowerCase();
        const db = getDb();
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) return null;

        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name || user.email };
      }
    })
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/", error: "/" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.name = (token.name as string) ?? session.user.name;
      }
      return session;
    }
  }
};
