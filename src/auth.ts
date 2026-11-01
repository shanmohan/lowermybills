import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

const hasGoogle = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

// Demo login is enabled explicitly, or automatically when Google isn't configured
// yet — so the app is usable tonight before the OAuth client exists.
const enableDemo = process.env.ENABLE_DEMO_LOGIN === "true" || !hasGoogle;

const providers: NextAuthConfig["providers"] = [];

if (hasGoogle) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

if (enableDemo) {
  providers.push(
    Credentials({
      id: "demo",
      name: "Demo",
      credentials: {
        name: { label: "Your name", type: "text" },
      },
      authorize: async (credentials) => {
        const name =
          typeof credentials?.name === "string" && credentials.name.trim()
            ? credentials.name.trim()
            : "Demo User";
        return {
          id: "demo-user",
          name,
          email: "demo@lowermybills.local",
        };
      },
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  trustHost: true,
});

export const authProviders = {
  google: hasGoogle,
  demo: enableDemo,
};
