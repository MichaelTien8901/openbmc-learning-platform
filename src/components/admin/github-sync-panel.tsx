"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Check, AlertCircle, ExternalLink } from "lucide-react";

interface SyncPreview {
  categories: {
    category: string;
    title: string;
    lessons: {
      slug: string;
      title: string;
      sourceUrl: string;
      exists: boolean;
    }[];
  }[];
  summary: {
    totalCategories: number;
    totalLessons: number;
    newLessons: number;
    existingLessons: number;
  };
  config: {
    owner: string;
    repo: string;
    pagesBaseUrl: string;
  };
}

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  categories: string[];
}

export function GitHubSyncPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPreview() {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/sync-github");
      const data = await response.json();

      if (data.success) {
        setPreview(data.data);
      } else {
        setError(data.error || "Failed to load preview");
      }
    } catch {
      setError("Failed to connect to GitHub");
    } finally {
      setIsLoading(false);
    }
  }

  async function runSync(overwrite: boolean = false) {
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/sync-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overwrite }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        setPreview(null); // Clear preview after sync
      } else {
        setError(data.error || "Sync failed");
      }
    } catch {
      setError("Sync request failed");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          GitHub Content Sync
        </CardTitle>
        <CardDescription>
          Sync lessons from openbmc-guide-tutorial GitHub repository
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Sync result */}
        {result && (
          <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Check className="h-5 w-5" />
              <span className="font-medium">Sync Complete</span>
            </div>
            <div className="mt-2 text-sm text-green-700 dark:text-green-300">
              <p>Created: {result.created} lessons</p>
              <p>Updated: {result.updated} lessons</p>
              <p>Skipped: {result.skipped} lessons (already exist)</p>
              {result.errors.length > 0 && (
                <p className="text-red-600 dark:text-red-400">Errors: {result.errors.length}</p>
              )}
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-4">
            <div className="bg-muted rounded-md p-4">
              <p className="text-sm font-medium">Source Repository</p>
              <a
                href={preview.config.pagesBaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                {preview.config.owner}/{preview.config.repo}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-muted rounded-md p-3">
                <p className="text-2xl font-bold">{preview.summary.totalLessons}</p>
                <p className="text-muted-foreground">Total Lessons</p>
              </div>
              <div className="bg-muted rounded-md p-3">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {preview.summary.newLessons}
                </p>
                <p className="text-muted-foreground">New Lessons</p>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto rounded-md border">
              {preview.categories.map((category) => (
                <div key={category.category} className="border-b last:border-b-0">
                  <div className="bg-muted px-3 py-2 font-medium">
                    {category.title} ({category.lessons.length})
                  </div>
                  <div className="divide-y">
                    {category.lessons.slice(0, 5).map((lesson) => (
                      <div
                        key={lesson.slug}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <span className="truncate">{lesson.title}</span>
                        {lesson.exists ? (
                          <span className="text-muted-foreground text-xs">exists</span>
                        ) : (
                          <span className="text-xs text-green-600 dark:text-green-400">new</span>
                        )}
                      </div>
                    ))}
                    {category.lessons.length > 5 && (
                      <div className="text-muted-foreground px-3 py-2 text-xs">
                        +{category.lessons.length - 5} more...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!preview ? (
            <Button onClick={loadPreview} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Preview Sync"
              )}
            </Button>
          ) : (
            <>
              <Button onClick={() => runSync(false)} disabled={isSyncing}>
                {isSyncing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  `Sync ${preview.summary.newLessons} New Lessons`
                )}
              </Button>
              <Button variant="outline" onClick={() => runSync(true)} disabled={isSyncing}>
                Sync All (Overwrite)
              </Button>
              <Button variant="ghost" onClick={() => setPreview(null)}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
