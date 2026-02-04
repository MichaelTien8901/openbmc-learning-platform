"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Bookmark {
  id: string;
  lessonId: string;
  note: string | null;
  createdAt: string;
  lesson: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    difficulty: string;
    estimatedMinutes: number;
  };
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBookmarks();
  }, []);

  async function loadBookmarks() {
    try {
      const response = await fetch("/api/bookmarks");
      const data = await response.json();

      if (data.success) {
        setBookmarks(data.data);
      }
    } catch {
      console.error("Failed to load bookmarks");
    } finally {
      setIsLoading(false);
    }
  }

  async function removeBookmark(id: string) {
    try {
      const response = await fetch(`/api/bookmarks/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setBookmarks(bookmarks.filter((b) => b.id !== id));
      }
    } catch {
      console.error("Failed to remove bookmark");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading bookmarks...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bookmarks</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Lessons you&apos;ve saved for later</p>
      </div>

      {bookmarks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">You haven&apos;t bookmarked any lessons yet.</p>
            <Button asChild className="mt-4">
              <Link href="/paths">Browse Learning Paths</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((bookmark) => (
            <Card key={bookmark.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      <Link
                        href={`/lessons/${bookmark.lesson.slug}`}
                        className="hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {bookmark.lesson.title}
                      </Link>
                    </CardTitle>
                    {bookmark.lesson.description && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {bookmark.lesson.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBookmark(bookmark.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    Remove
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      bookmark.lesson.difficulty === "BEGINNER"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : bookmark.lesson.difficulty === "INTERMEDIATE"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {bookmark.lesson.difficulty}
                  </span>
                  <span>{bookmark.lesson.estimatedMinutes} min</span>
                  <span>Saved {new Date(bookmark.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
