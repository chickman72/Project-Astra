"use client";

import { useState } from "react";
import { generateRemix } from "@/app/actions";
import { Sparkles, AlertCircle } from "lucide-react";

interface RemixEditorProps {
  userId: string;
  onRemixCreated?: () => void;
}

export function RemixEditor({ userId, onRemixCreated }: RemixEditorProps) {
  const [sourceContent, setSourceContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGenerateRemix = async () => {
    if (!sourceContent.trim()) {
      setError("Please enter some content to remix");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log("Starting remix generation...");
      const result = await generateRemix(sourceContent, userId);
      console.log("Remix generated:", result);
      
      setSourceContent("");
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
      
      // Refresh the remixes list
      onRemixCreated?.();
    } catch (err) {
      console.error("Error generating remix:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate remix. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-blue-600" />
        Create a New Remix
      </h2>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="source"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Source Content
          </label>
          <textarea
            id="source"
            value={sourceContent}
            onChange={(e) => setSourceContent(e.target.value)}
            placeholder="Paste your transcript, notes, or raw content here..."
            className="w-full h-40 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            disabled={isLoading}
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter a transcript, notes, or any raw content you&apos;d like to
            transform into a LinkedIn post.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Error</p>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">✓ Remix created successfully!</p>
          </div>
        )}

        <button
          onClick={handleGenerateRemix}
          disabled={isLoading || !sourceContent.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Remix
            </>
          )}
        </button>
      </div>
    </div>
  );
}
