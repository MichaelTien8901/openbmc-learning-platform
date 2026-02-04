"use client";

/**
 * Import Conflict Resolver
 *
 * Modal component for resolving conflicts when importing content.
 */

import { useState } from "react";
import {
  AlertTriangle,
  X,
  FileText,
  FolderOpen,
  Check,
  SkipForward,
  RefreshCw,
} from "lucide-react";

export interface ConflictInfo {
  slug: string;
  type: "lesson" | "path";
  existingId: string;
  existingTitle: string;
  newTitle: string;
  conflictType: "slug" | "title";
}

export type ResolutionAction = "skip" | "rename" | "replace" | "keep_both";

export interface ConflictResolution {
  slug: string;
  action: ResolutionAction;
  newSlug?: string; // For rename action
}

interface ImportConflictResolverProps {
  conflicts: ConflictInfo[];
  onResolve: (resolutions: ConflictResolution[]) => void;
  onCancel: () => void;
}

export function ImportConflictResolver({
  conflicts,
  onResolve,
  onCancel,
}: ImportConflictResolverProps) {
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(
    () => new Map(conflicts.map((c) => [c.slug, { slug: c.slug, action: "skip" }]))
  );
  const [customSlugs, setCustomSlugs] = useState<Map<string, string>>(new Map());

  const setResolution = (slug: string, action: ResolutionAction) => {
    setResolutions((prev) => {
      const newMap = new Map(prev);
      const resolution: ConflictResolution = { slug, action };
      if (action === "rename" || action === "keep_both") {
        resolution.newSlug = customSlugs.get(slug) || `${slug}-imported`;
      }
      newMap.set(slug, resolution);
      return newMap;
    });
  };

  const setCustomSlug = (slug: string, newSlug: string) => {
    setCustomSlugs((prev) => {
      const newMap = new Map(prev);
      newMap.set(slug, newSlug);
      return newMap;
    });

    // Update resolution if action is rename
    const currentResolution = resolutions.get(slug);
    if (currentResolution?.action === "rename" || currentResolution?.action === "keep_both") {
      setResolutions((prev) => {
        const newMap = new Map(prev);
        newMap.set(slug, { ...currentResolution, newSlug });
        return newMap;
      });
    }
  };

  const handleApplyAll = (action: ResolutionAction) => {
    setResolutions((prev) => {
      const newMap = new Map(prev);
      conflicts.forEach((c) => {
        const resolution: ConflictResolution = { slug: c.slug, action };
        if (action === "rename" || action === "keep_both") {
          resolution.newSlug = customSlugs.get(c.slug) || `${c.slug}-imported`;
        }
        newMap.set(c.slug, resolution);
      });
      return newMap;
    });
  };

  const handleSubmit = () => {
    onResolve(Array.from(resolutions.values()));
  };

  const skippedCount = Array.from(resolutions.values()).filter((r) => r.action === "skip").length;
  const willImportCount = conflicts.length - skippedCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-yellow-50 px-6 py-4 dark:border-gray-700 dark:bg-yellow-900/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Resolve Import Conflicts
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-900">
          <span className="mr-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Apply to all:
          </span>
          <button
            onClick={() => handleApplyAll("skip")}
            className="rounded-md bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Skip All
          </button>
          <button
            onClick={() => handleApplyAll("replace")}
            className="rounded-md bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300"
          >
            Replace All
          </button>
          <button
            onClick={() => handleApplyAll("keep_both")}
            className="rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
          >
            Keep Both
          </button>
        </div>

        {/* Conflicts List */}
        <div className="max-h-[50vh] overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {conflicts.map((conflict) => {
              const resolution = resolutions.get(conflict.slug);
              const customSlug = customSlugs.get(conflict.slug) || `${conflict.slug}-imported`;

              return (
                <div
                  key={conflict.slug}
                  className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  {/* Conflict Info */}
                  <div className="mb-3 flex items-start gap-3">
                    {conflict.type === "lesson" ? (
                      <FileText className="h-5 w-5 flex-shrink-0 text-blue-500" />
                    ) : (
                      <FolderOpen className="h-5 w-5 flex-shrink-0 text-yellow-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {conflict.newTitle}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        <span className="font-medium text-red-600 dark:text-red-400">
                          Conflicts with:
                        </span>{" "}
                        &quot;{conflict.existingTitle}&quot;
                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                          {conflict.conflictType === "slug" ? "Same URL slug" : "Similar title"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Resolution Options */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setResolution(conflict.slug, "skip")}
                      className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        resolution?.action === "skip"
                          ? "bg-gray-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <SkipForward className="h-4 w-4" />
                      Skip
                    </button>

                    <button
                      onClick={() => setResolution(conflict.slug, "replace")}
                      className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        resolution?.action === "replace"
                          ? "bg-orange-600 text-white"
                          : "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300"
                      }`}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Replace Existing
                    </button>

                    <button
                      onClick={() => setResolution(conflict.slug, "keep_both")}
                      className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        resolution?.action === "keep_both"
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                      }`}
                    >
                      <Check className="h-4 w-4" />
                      Keep Both
                    </button>
                  </div>

                  {/* Custom Slug Input (for keep_both) */}
                  {resolution?.action === "keep_both" && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        New URL slug for imported item:
                      </label>
                      <input
                        type="text"
                        value={customSlug}
                        onChange={(e) => setCustomSlug(conflict.slug, e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                        placeholder="Enter new slug..."
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {willImportCount} will be imported, {skippedCount} will be skipped
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Apply Resolutions & Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for checking conflicts before import
 */
export function useConflictCheck() {
  const [checking, setChecking] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const checkConflicts = async (
    items: Array<{ title: string; slug: string; type: "lesson" | "path" }>
  ): Promise<{
    conflicts: ConflictInfo[];
    clean: Array<{ slug: string; type: "lesson" | "path" }>;
  } | null> => {
    setChecking(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/import/check-conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to check conflicts");
      }

      setConflicts(data.data.conflicts);
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Conflict check failed";
      setError(message);
      return null;
    } finally {
      setChecking(false);
    }
  };

  const clearConflicts = () => {
    setConflicts([]);
    setError(null);
  };

  return {
    checking,
    conflicts,
    error,
    checkConflicts,
    clearConflicts,
  };
}
