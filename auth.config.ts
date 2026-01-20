import type { NextAuthConfig } from "next-auth";
import LinkedIn from "next-auth/providers/linkedin";

export const authConfig = {
  providers: [
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      // Request specific scopes including w_member_social for publishing capability
      authorization: {
        params: {
          // OpenID Connect scopes + publishing scope supported by the app products
          scope: "openid profile email w_member_social",
        },
      },
    }),
  ],
  callbacks: {
    /**
     * JWT callback: capture LinkedIn access token and add to JWT
     */
    async jwt({ token, account }) {
      if (account) {
        // Store the access token from the provider
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      return token;
    },

    /**
     * Session callback: pass token info to session object
     */
    async session({ session, token }) {
      // Add custom properties to session
      session.accessToken = token.accessToken as string | undefined;
      session.provider = token.provider as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
} satisfies NextAuthConfig;
