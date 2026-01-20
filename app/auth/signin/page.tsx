"use client";

import { signIn } from "next-auth/react";
import { Linkedin } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Astral Remix
          </h1>
          <p className="text-gray-600">
            Transform your ideas into engaging LinkedIn posts
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-6 shadow rounded-lg">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center mb-6">
              Sign in with your LinkedIn account to get started.
            </p>

            <button
              onClick={() =>
                signIn("linkedin", { callbackUrl: "/dashboard" })
              }
              className="w-full flex items-center justify-center gap-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              <Linkedin className="w-5 h-5" />
              Sign in with LinkedIn
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center">
              We request access to your LinkedIn profile and social publishing
              rights to post your remixes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
