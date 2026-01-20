import Link from "next/link";
import { auth } from "@/auth";
import { Sparkles, Zap, Share2 } from "lucide-react";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  // Redirect to dashboard if already authenticated
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-blue-600">Astral Remix</h1>
            <Link
              href="/auth/signin"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Transform Your Ideas Into{" "}
          <span className="text-blue-600">LinkedIn Gold</span>
        </h2>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Use AI to convert your raw notes and transcripts into engaging,
          professional LinkedIn posts. Powered by GPT-4o and built for tech
          thought leaders.
        </p>

        <Link
          href="/auth/signin"
          className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-lg transition-colors"
        >
          Get Started with LinkedIn
        </Link>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Powerful Features
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
              <Sparkles className="w-12 h-12 text-blue-600 mb-4" />
              <h4 className="text-xl font-bold text-gray-900 mb-3">
                AI-Powered Remix Engine
              </h4>
              <p className="text-gray-600">
                Paste your raw notes or transcript, and our AI instantly
                transforms them into professional, engaging LinkedIn posts.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
              <Zap className="w-12 h-12 text-blue-600 mb-4" />
              <h4 className="text-xl font-bold text-gray-900 mb-3">
                Instant Publishing
              </h4>
              <p className="text-gray-600">
                Review and publish directly to LinkedIn with a single click. No
                copy-paste needed—seamless integration with your LinkedIn
                account.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
              <Share2 className="w-12 h-12 text-blue-600 mb-4" />
              <h4 className="text-xl font-bold text-gray-900 mb-3">
                Full History Management
              </h4>
              <p className="text-gray-600">
                Keep track of all your remixes—drafts and published posts.
                Manage your LinkedIn content library in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 py-16 text-center text-white">
        <h3 className="text-3xl font-bold mb-6">
          Ready to boost your LinkedIn presence?
        </h3>
        <Link
          href="/auth/signin"
          className="inline-block px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
        >
          Sign In with LinkedIn Now
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2025 Astral Remix. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
