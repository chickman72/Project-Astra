"use client";

import { useEffect, useRef, useState } from "react";
import {
  publishToLinkedIn,
  deleteRemix,
  updateVariationContent,
  deleteVariation,
  scheduleVariation,
} from "@/app/actions";
import {
  Linkedin,
  Trash2,
  CheckCircle,
  Clock,
  X,
  Maximize2,
  Send,
  Pencil,
  MessageCircle,
  BookOpen,
  Lightbulb,
  CheckSquare,
} from "lucide-react";
import type { RemixRecord, RemixVariation } from "@/app/actions";

interface RemixHistoryProps {
  remixes: RemixRecord[];
  userId: string;
  accessToken?: string;
  onRefresh?: () => void;
  selectedRemixId?: string | null;
  selectedVariationId?: string | null;
  onSelectVariation?: (remixId: string, variationId: string | null) => void;
}

// Helper function to get icon for angle
function getAngleIcon(angle: RemixVariation["angle"]) {
  switch (angle) {
    case "narrative":
      return <Lightbulb className="w-4 h-4" />;
    case "educational":
      return <BookOpen className="w-4 h-4" />;
    case "question":
      return <MessageCircle className="w-4 h-4" />;
    case "practical":
      return <CheckSquare className="w-4 h-4" />;
    case "story":
      return <Lightbulb className="w-4 h-4" />;
    default:
      return null;
  }
}

function getAngleLabel(angle: RemixVariation["angle"]) {
  return angle.charAt(0).toUpperCase() + angle.slice(1);
}

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function getVariationStatus(variation: RemixVariation, remix: RemixRecord) {
  if (variation.status) {
    return variation.status;
  }
  if (remix.publishedVariationIds?.includes(variation.id)) {
    return "PUBLISHED";
  }
  return "DRAFT";
}

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function RemixHistory({
  remixes,
  userId,
  accessToken,
  onRefresh,
  selectedRemixId,
  selectedVariationId: selectedVariationIdProp,
  onSelectVariation,
}: RemixHistoryProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRemixInternal, setSelectedRemixInternal] = useState<RemixRecord | null>(null);
  const [selectedVariationIdInternal, setSelectedVariationIdInternal] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [scheduledForInput, setScheduledForInput] = useState("");
  const autoPublishInFlight = useRef(new Set<string>());

  const selectedRemix =
    selectedRemixId !== undefined
      ? remixes.find((remix) => remix.id === selectedRemixId) || null
      : selectedRemixInternal;
  const selectedVariationId =
    selectedVariationIdProp !== undefined ? selectedVariationIdProp : selectedVariationIdInternal;

  const handleSelect = (remix: RemixRecord, variationId: string | null) => {
    if (onSelectVariation) {
      onSelectVariation(remix.id, variationId);
      return;
    }
    setSelectedRemixInternal(remix);
    setSelectedVariationIdInternal(variationId);
  };

  const handlePublish = async (remixId: string, variationId: string) => {
    if (!accessToken) {
      setError("LinkedIn access token not available. Please sign in again.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await publishToLinkedIn(remixId, userId, variationId, accessToken);
      onRefresh?.();
      if (onSelectVariation) {
        onSelectVariation(remixId, null);
      } else {
        setSelectedRemixInternal(null);
        setSelectedVariationIdInternal(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to publish to LinkedIn"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateVariation = async (
    remixId: string,
    variationId: string,
    content: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      await updateVariationContent(remixId, userId, variationId, content);
      onRefresh?.();
      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update variation"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVariation = async (remixId: string, variationId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this variation? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await deleteVariation(remixId, userId, variationId);
      onRefresh?.();
      if (onSelectVariation) {
        onSelectVariation(remixId, null);
      } else {
        setSelectedVariationIdInternal(null);
      }
      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete variation"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedule = async (
    remixId: string,
    variationId: string,
    scheduledFor: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      await scheduleVariation(remixId, userId, variationId, scheduledFor);
      onRefresh?.();
      setScheduledForInput("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to schedule variation"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken || remixes.length === 0) {
      return;
    }

    const now = Date.now();
    const due: { remixId: string; variationId: string }[] = [];

    remixes.forEach((remix) => {
      remix.variations.forEach((variation) => {
        const status = getVariationStatus(variation, remix);
        if (status !== "SCHEDULED" || !variation.scheduledFor) {
          return;
        }
        const scheduledTime = new Date(variation.scheduledFor).getTime();
        if (!Number.isNaN(scheduledTime) && scheduledTime <= now) {
          const key = `${remix.id}:${variation.id}`;
          if (!autoPublishInFlight.current.has(key)) {
            due.push({ remixId: remix.id, variationId: variation.id });
            autoPublishInFlight.current.add(key);
          }
        }
      });
    });

    if (due.length === 0) {
      return;
    }

    const publishDue = async () => {
      for (const item of due) {
        try {
          await publishToLinkedIn(
            item.remixId,
            userId,
            item.variationId,
            accessToken
          );
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to publish scheduled post"
          );
        }
      }
      onRefresh?.();
    };

    void publishDue();
  }, [accessToken, onRefresh, remixes, userId]);

  const handleDelete = async (remixId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this draft? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await deleteRemix(remixId, userId);
      onRefresh?.();
      if (onSelectVariation) {
        onSelectVariation(remixId, null);
      } else {
        setSelectedRemixInternal(null);
        setSelectedVariationIdInternal(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete remix"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Get the selected variation
  const selectedVariation = selectedRemix?.variations.find(
    (v) => v.id === selectedVariationId
  );
  const selectedOverallStatus = selectedRemix
    ? selectedRemix.variations.some(
        (variation) => getVariationStatus(variation, selectedRemix) === "PUBLISHED"
      )
      ? "PUBLISHED"
      : selectedRemix.variations.some(
            (variation) => getVariationStatus(variation, selectedRemix) === "SCHEDULED"
          )
        ? "SCHEDULED"
        : "DRAFT"
    : "DRAFT";
  const selectedNextScheduled = selectedRemix
    ? selectedRemix.variations
        .map((variation) => variation.scheduledFor)
        .filter(Boolean)
        .sort()
        .slice(0, 1)[0]
    : undefined;

  useEffect(() => {
    if (selectedVariation) {
      setEditContent(selectedVariation.content);
      setScheduledForInput(toDateTimeLocal(selectedVariation.scheduledFor));
    } else {
      setEditContent("");
      setScheduledForInput("");
    }
    setIsEditing(false);
  }, [selectedVariation, selectedVariationId]);

  if (remixes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <p className="text-gray-500">
          No remixes yet. Create one to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {remixes.map((remix) => {
          // Handle both old format (generatedPost) and new format (variations)
          const variations = (remix as any).variations || [];
          const linkedinVariations = variations.filter(
            (v: RemixVariation) => v.platform === "linkedin"
          );
          const twitterVariations = variations.filter(
            (v: RemixVariation) => v.platform === "twitter"
          );
          const linkedinPublishedCount = linkedinVariations.filter(
            (variation: RemixVariation) => getVariationStatus(variation, remix) === "PUBLISHED"
          ).length;
          const linkedinScheduledCount = linkedinVariations.filter(
            (variation: RemixVariation) => getVariationStatus(variation, remix) === "SCHEDULED"
          ).length;
          const latestPublished = linkedinVariations
            .map((variation: RemixVariation) => variation.publishedAt)
            .filter(Boolean)
            .sort()
            .slice(-1)[0];
          const nextScheduled = linkedinVariations
            .map((variation: RemixVariation) => variation.scheduledFor)
            .filter(Boolean)
            .sort()
            .slice(0, 1)[0];
          const overallStatus =
            linkedinPublishedCount > 0
              ? "PUBLISHED"
              : linkedinScheduledCount > 0
                ? "SCHEDULED"
                : "DRAFT";
          const overallStatusLabel =
            overallStatus === "SCHEDULED" && nextScheduled
              ? `Scheduled - ${formatDate(nextScheduled)}`
              : overallStatus === "PUBLISHED"
                ? "Published"
                : "Draft";

          return (
            <div
              key={remix.id}
              onClick={() => {
                handleSelect(remix, linkedinVariations[0]?.id || null);
              }}
              className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-600 cursor-pointer hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {overallStatus === "PUBLISHED" ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-600">
                        Published
                      </span>
                    </>
                  ) : overallStatus === "SCHEDULED" ? (
                    <>
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-600">
                        {overallStatusLabel}
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-semibold text-yellow-600">
                        {overallStatusLabel}
                      </span>
                    </>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(remix.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Variation Preview */}
              <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  {linkedinVariations.length} LinkedIn + {twitterVariations.length} Twitter variations
                  {linkedinPublishedCount > 0 && ` - ${linkedinPublishedCount} posted`}
                  {linkedinScheduledCount > 0 && ` - ${linkedinScheduledCount} scheduled`}
                </p>
                <p className="text-sm text-gray-700 line-clamp-3">
                  {linkedinVariations[0]?.content || "No variations"}
                </p>
              </div>

              {/* Timestamps */}
              <div className="text-xs text-gray-500 space-y-1 mb-4">
                <p>Created: {new Date(remix.createdAt).toLocaleString()}</p>
                {latestPublished && (
                  <p>Last posted: {formatDate(latestPublished)}</p>
                )}
                {nextScheduled && (
                  <p>Next scheduled: {formatDate(nextScheduled)}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => {
                    handleSelect(remix, linkedinVariations[0]?.id || null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                  View All
                </button>
                {overallStatus === "DRAFT" && (
                  <button
                    onClick={() => handleDelete(remix.id)}
                    disabled={isLoading}
                    className="p-2 border border-red-300 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Variations Modal */}
      {selectedRemix && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            if (onSelectVariation) {
              onSelectVariation(selectedRemix.id, null);
            } else {
              setSelectedRemixInternal(null);
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedOverallStatus === "PUBLISHED" ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-lg font-semibold text-green-600">
                      Published
                    </span>
                  </>
                ) : selectedOverallStatus === "SCHEDULED" ? (
                  <>
                    <Clock className="w-6 h-6 text-blue-600" />
                    <span className="text-lg font-semibold text-blue-600">
                      {selectedNextScheduled
                        ? `Scheduled - ${formatDate(selectedNextScheduled)}`
                        : "Scheduled"}
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="w-6 h-6 text-yellow-600" />
                    <span className="text-lg font-semibold text-yellow-600">
                      Draft - {((selectedRemix as any).variations || []).length} Variations
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  if (onSelectVariation) {
                    onSelectVariation(selectedRemix.id, null);
                  } else {
                    setSelectedRemixInternal(null);
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Source Content */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Source Content
                </h3>
                <p className="text-gray-700 bg-gray-50 rounded p-4 border border-gray-200 max-h-[150px] overflow-y-auto">
                  {selectedRemix.sourceContent}
                </p>
              </div>

              {/* Tabs for LinkedIn vs Twitter */}
              <div>
                <div className="flex gap-2 border-b border-gray-200 mb-4">
                  {["linkedin", "twitter"].map((platform) => {
                    const platformVariations = ((selectedRemix as any).variations || []).filter(
                      (v: RemixVariation) => v.platform === (platform as any)
                    );
                    if (platformVariations.length === 0) return null;

                    return (
                      <button
                        key={platform}
                        onClick={() => {
                          if (onSelectVariation) {
                            onSelectVariation(selectedRemix.id, platformVariations[0].id);
                          } else {
                            setSelectedVariationIdInternal(platformVariations[0].id);
                          }
                        }}
                        className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                          selectedVariation?.platform === platform
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {platform === "linkedin" ? (
                          <>
                            <Linkedin className="w-4 h-4" />
                            LinkedIn ({platformVariations.length})
                          </>
                        ) : (
                          <>
                            <MessageCircle className="w-4 h-4" />
                            Twitter/X ({platformVariations.length})
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Variation Selection by Angle */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
                  {(((selectedRemix as any).variations || []) as RemixVariation[])
                    .filter(
                      (v) => v.platform === selectedVariation?.platform
                    )
                    .map((variation) => (
                      <button
                        key={variation.id}
                        onClick={() => {
                          if (onSelectVariation) {
                            onSelectVariation(selectedRemix.id, variation.id);
                          } else {
                            setSelectedVariationIdInternal(variation.id);
                          }
                        }}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedVariationId === variation.id
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {getAngleIcon(variation.angle)}
                          <span className="text-xs font-semibold text-gray-700">
                            {getAngleLabel(variation.angle)}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-gray-500">
                            {getVariationStatus(variation, selectedRemix)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {variation.content.substring(0, 60)}...
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {variation.characterCount} chars
                        </p>
                        {variation.publishedAt && (
                          <p className="text-[10px] text-green-700 mt-1">
                            Posted: {formatDate(variation.publishedAt)}
                          </p>
                        )}
                        {variation.scheduledFor && (
                          <p className="text-[10px] text-blue-700 mt-1">
                            Scheduled: {formatDate(variation.scheduledFor)}
                          </p>
                        )}
                      </button>
                    ))}
                </div>

                {/* Selected Variation Content */}
                {selectedVariation && (
                  <div>
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getAngleIcon(selectedVariation.angle)}
                        <h4 className="text-lg font-semibold text-gray-900">
                          {getAngleLabel(selectedVariation.angle)} Angle
                        </h4>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {selectedVariation.characterCount} chars
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {getVariationStatus(selectedVariation, selectedRemix) === "SCHEDULED" &&
                          selectedVariation.scheduledFor
                            ? `Scheduled - ${formatDate(selectedVariation.scheduledFor)}`
                            : getVariationStatus(selectedVariation, selectedRemix)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        {selectedVariation.publishedAt && (
                          <p>Posted: {formatDate(selectedVariation.publishedAt)}</p>
                        )}
                        {selectedVariation.scheduledFor && (
                          <p>Scheduled: {formatDate(selectedVariation.scheduledFor)}</p>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
                        className="w-full bg-white rounded-lg p-3 border border-gray-300 text-gray-800 mb-4 h-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 whitespace-pre-wrap text-gray-800 mb-4 max-h-[300px] overflow-y-auto">
                        {selectedVariation.content}
                      </div>
                    )}

                    {selectedVariation.hashtags && selectedVariation.hashtags.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Hashtags:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedVariation.hashtags.map((tag) => (
                            <span key={tag} className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedVariation.platform === "linkedin" &&
                      getVariationStatus(selectedVariation, selectedRemix) !== "PUBLISHED" && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-600 mb-2">
                            Schedule
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="datetime-local"
                              value={scheduledForInput}
                              onChange={(event) => setScheduledForInput(event.target.value)}
                              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                            <button
                              onClick={() => {
                                if (selectedRemix && selectedVariationId && scheduledForInput) {
                                  handleSchedule(
                                    selectedRemix.id,
                                    selectedVariationId,
                                    new Date(scheduledForInput).toISOString()
                                  );
                                }
                              }}
                              disabled={isLoading || !scheduledForInput}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              {getVariationStatus(selectedVariation, selectedRemix) === "SCHEDULED"
                                ? "Reschedule"
                                : "Schedule"}
                            </button>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-2">
                            Scheduled posts publish automatically while this dashboard is open.
                          </p>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Created
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {new Date(selectedRemix.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Status
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {selectedOverallStatus}
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (onSelectVariation) {
                      onSelectVariation(selectedRemix.id, null);
                    } else {
                      setSelectedRemixInternal(null);
                    }
                  }}
                  className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                {selectedVariation && (
                  <>
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => {
                            if (selectedRemix && selectedVariationId) {
                              handleUpdateVariation(
                                selectedRemix.id,
                                selectedVariationId,
                                editContent
                              );
                            }
                          }}
                          disabled={isLoading || !selectedVariationId}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium py-2 px-4 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setEditContent(selectedVariation.content);
                          }}
                          className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium py-2 px-4 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                    )}

                    {selectedVariation.platform === "linkedin" &&
                      getVariationStatus(selectedVariation, selectedRemix) !== "PUBLISHED" && (
                        <button
                          onClick={() => {
                            if (selectedVariationId) {
                              handlePublish(selectedRemix.id, selectedVariationId);
                            }
                          }}
                          disabled={isLoading || !accessToken || !selectedVariationId}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium py-2 px-4 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                          Post to LinkedIn
                        </button>
                      )}

                    {getVariationStatus(selectedVariation, selectedRemix) !== "PUBLISHED" && (
                      <button
                        onClick={() =>
                          handleDeleteVariation(selectedRemix.id, selectedVariation.id)
                        }
                        disabled={isLoading}
                        className="py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {selectedOverallStatus === "DRAFT" && (
                      <button
                        onClick={() => handleDelete(selectedRemix.id)}
                        disabled={isLoading}
                        className="py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
