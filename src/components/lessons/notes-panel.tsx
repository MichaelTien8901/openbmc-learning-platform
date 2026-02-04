"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NotesPanelProps {
  lessonId: string;
  lessonTitle: string;
}

export function NotesPanel({ lessonId, lessonTitle }: NotesPanelProps) {
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasUnsavedChanges = content !== savedContent;

  const loadNote = useCallback(async () => {
    try {
      const response = await fetch(`/api/notes?lessonId=${lessonId}`);
      const data = await response.json();

      if (data.success && data.data.length > 0) {
        const note = data.data[0];
        setContent(note.content);
        setSavedContent(note.content);
        setLastSaved(new Date(note.updatedAt));
      }
    } catch {
      console.error("Failed to load note");
    } finally {
      setIsLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  const saveNote = useCallback(async () => {
    if (!content.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, content }),
      });
      const data = await response.json();

      if (data.success) {
        setSavedContent(content);
        setLastSaved(new Date());
      }
    } catch {
      console.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  }, [lessonId, content]);

  async function deleteNote() {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const response = await fetch(`/api/notes?lessonId=${lessonId}`);
      const data = await response.json();

      if (data.success && data.data.length > 0) {
        const noteId = data.data[0].id;
        await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
        setContent("");
        setSavedContent("");
        setLastSaved(null);
      }
    } catch {
      console.error("Failed to delete note");
    }
  }

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!hasUnsavedChanges || !content.trim()) return;

    const timer = setTimeout(() => {
      saveNote();
    }, 2000);

    return () => clearTimeout(timer);
  }, [content, hasUnsavedChanges, saveNote]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4 text-center">
          <p className="text-sm text-gray-500">Loading notes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2">
              <span>{isExpanded ? "▼" : "▶"}</span>
              Notes
            </button>
          </CardTitle>
          {lastSaved && (
            <span className="text-xs text-gray-500">Saved {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Take notes for "${lessonTitle}"...`}
            className="h-40 w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />

          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-2">
              <Button size="sm" onClick={saveNote} disabled={isSaving || !hasUnsavedChanges}>
                {isSaving ? "Saving..." : hasUnsavedChanges ? "Save" : "Saved"}
              </Button>
              {savedContent && (
                <Button size="sm" variant="outline" onClick={deleteNote}>
                  Delete
                </Button>
              )}
            </div>

            {}
            <a
              href="/api/notes/export"
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              download
            >
              Export all notes
            </a>
          </div>

          {hasUnsavedChanges && (
            <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
              You have unsaved changes (auto-saves after 2 seconds)
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
