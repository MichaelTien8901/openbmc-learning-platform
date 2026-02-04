"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface BookmarkButtonProps {
  lessonId: string;
}

export function BookmarkButton({ lessonId }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const checkBookmarkStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/bookmarks");
      const data = await response.json();

      if (data.success) {
        const bookmark = data.data.find(
          (b: { lessonId: string; id: string }) => b.lessonId === lessonId
        );
        if (bookmark) {
          setIsBookmarked(true);
          setBookmarkId(bookmark.id);
        } else {
          setIsBookmarked(false);
          setBookmarkId(null);
        }
      }
    } catch {
      console.error("Failed to check bookmark status");
    } finally {
      setIsLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    checkBookmarkStatus();
  }, [checkBookmarkStatus]);

  async function toggleBookmark() {
    setIsSaving(true);

    try {
      if (isBookmarked && bookmarkId) {
        // Remove bookmark
        const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
          method: "DELETE",
        });
        const data = await response.json();

        if (data.success) {
          setIsBookmarked(false);
          setBookmarkId(null);
        }
      } else {
        // Add bookmark
        const response = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId }),
        });
        const data = await response.json();

        if (data.success) {
          setIsBookmarked(true);
          setBookmarkId(data.data.id);
        }
      }
    } catch {
      console.error("Failed to toggle bookmark");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        ...
      </Button>
    );
  }

  return (
    <Button
      variant={isBookmarked ? "default" : "outline"}
      size="sm"
      onClick={toggleBookmark}
      disabled={isSaving}
      title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      {isSaving ? "..." : isBookmarked ? "★ Bookmarked" : "☆ Bookmark"}
    </Button>
  );
}
