import NextAuth from "next-auth";
import "@/lib/auth-types";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
