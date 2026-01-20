"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RemixEditor } from "@/components/RemixEditor";
import { RemixHistory } from "@/components/RemixHistory";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import { getUserRemixes } from "@/app/actions";
import type { RemixRecord } from "@/app/actions";
import "@/lib/auth-types";
import { LogOut, RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [remixes, setRemixes] = useState<RemixRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRemixId, setSelectedRemixId] = useState<string | null>(null);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Load user remixes
  const loadRemixes = useCallback(async () => {
    if (!session?.user?.email) return;

    setIsLoading(true);
    setError(null);
    try {
      console.log("[Dashboard] Loading remixes for:", session.user.email);
      const data = await getUserRemixes(session.user.email);
      console.log("[Dashboard] Remixes loaded:", data);
      setRemixes(data);
    } catch (err) {
      console.error("[Dashboard] Failed to load remixes:", err);
      setError("Failed to load remixes. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.email]);

  // Initial load
  useEffect(() => {
    loadRemixes();
  }, [loadRemixes]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Astral Remix
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome, {session.user?.name || session.user?.email}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadRemixes}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Remix Editor - Left Column */}
          <div className="lg:col-span-1">
            <RemixEditor 
              userId={session.user?.email || ""} 
              onRemixCreated={() => {
                console.log("[Dashboard] Remix created, reloading...");
                loadRemixes();
              }} 
            />
            <div className="mt-6">
              <ScheduleCalendar
                remixes={remixes}
                onSelectScheduledItem={(remixId, variationId) => {
                  setSelectedRemixId(remixId);
                  setSelectedVariationId(variationId);
                }}
              />
            </div>
          </div>

          {/* Remix History - Right Column */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Your Remixes ({remixes.length})
            </h2>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}
            
            <RemixHistory
              remixes={remixes}
              userId={session.user?.email || ""}
              accessToken={session.accessToken}
              onRefresh={loadRemixes}
              selectedRemixId={selectedRemixId}
              selectedVariationId={selectedVariationId}
              onSelectVariation={(remixId, variationId) => {
                setSelectedRemixId(variationId ? remixId : null);
                setSelectedVariationId(variationId);
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
