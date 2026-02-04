"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SuggestedPath {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedHours: number;
  lessonCount: number;
  reason: string;
}

export function SuggestedPaths() {
  const [suggestions, setSuggestions] = useState<SuggestedPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSuggestions = useCallback(async () => {
    try {
      const response = await fetch("/api/paths/suggestions");
      const data = await response.json();

      if (data.success) {
        setSuggestions(data.data);
      }
    } catch {
      console.error("Failed to load suggestions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Suggested Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Loading suggestions...</p>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested Next Steps</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((path) => (
            <div
              key={path.id}
              className="flex items-start justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/paths/${path.slug}`}
                    className="font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                  >
                    {path.title}
                  </Link>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      path.difficulty === "BEGINNER"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : path.difficulty === "INTERMEDIATE"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {path.difficulty}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {path.description.substring(0, 100)}
                  {path.description.length > 100 ? "..." : ""}
                </p>
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span>{path.lessonCount} lessons</span>
                  <span>{path.estimatedHours}h estimated</span>
                  <span className="text-blue-600 dark:text-blue-400">{path.reason}</span>
                </div>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`/paths/${path.slug}`}>View</Link>
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <Button asChild variant="link">
            <Link href="/paths">Browse all paths →</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
