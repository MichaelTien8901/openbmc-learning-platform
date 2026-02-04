"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LessonData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  contentType: string;
  difficulty: string;
  estimatedMinutes: number;
  hasCodeExercise: boolean;
  published: boolean;
  // GitHub Content Delivery fields
  sourceUrl: string | null;
  repositoryPath: string | null;
  displayMode: "IFRAME" | "RENDER";
}

export default function AdminLessonEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";

  const [lesson, setLesson] = useState<LessonData>({
    id: "",
    slug: "",
    title: "",
    description: "",
    content: "",
    contentType: "ARTICLE",
    difficulty: "BEGINNER",
    estimatedMinutes: 10,
    hasCodeExercise: false,
    published: false,
    sourceUrl: null,
    repositoryPath: null,
    displayMode: "RENDER",
  });

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const loadLesson = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/lessons/${id}`);
      const data = await response.json();

      if (data.success) {
        setLesson(data.data);
      } else {
        setError(data.error || "Failed to load lesson");
      }
    } catch {
      setError("Failed to load lesson");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isNew) {
      loadLesson();
    }
  }, [isNew, loadLesson]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    try {
      const url = isNew ? "/api/admin/lessons" : `/api/admin/lessons/${id}`;
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lesson),
      });

      const data = await response.json();

      if (data.success) {
        if (isNew) {
          router.push(`/admin/lessons/${data.data.id}`);
        } else {
          setLesson(data.data);
        }
      } else {
        setError(data.error || "Failed to save lesson");
      }
    } catch {
      setError("Failed to save lesson");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this lesson? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/lessons/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        router.push("/admin/lessons");
      } else {
        setError(data.error || "Failed to delete lesson");
      }
    } catch {
      setError("Failed to delete lesson");
    }
  }

  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading lesson...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isNew ? "Create Lesson" : "Edit Lesson"}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {isNew ? "Create a new lesson" : `Editing: ${lesson.title}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/lessons">Cancel</Link>
          </Button>
          {!isNew && (
            <Button variant="outline" onClick={handleDelete} className="text-red-600">
              Delete
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={lesson.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setLesson({
                      ...lesson,
                      title,
                      slug: isNew ? generateSlug(title) : lesson.slug,
                    });
                  }}
                  placeholder="Lesson title"
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={lesson.slug}
                  onChange={(e) => setLesson({ ...lesson, slug: e.target.value })}
                  placeholder="lesson-slug"
                />
                <p className="mt-1 text-xs text-gray-500">URL: /lessons/{lesson.slug || "..."}</p>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={lesson.description || ""}
                  onChange={(e) => setLesson({ ...lesson, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  rows={3}
                  placeholder="Brief description of the lesson"
                />
              </div>
            </CardContent>
          </Card>

          {/* Content Editor */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                  {showPreview ? "Edit" : "Preview"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showPreview ? (
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownPreview(lesson.content),
                    }}
                  />
                </div>
              ) : (
                <textarea
                  value={lesson.content}
                  onChange={(e) => setLesson({ ...lesson, content: e.target.value })}
                  className="h-[500px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-800"
                  placeholder="Write your lesson content in Markdown..."
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="contentType">Content Type</Label>
                <select
                  id="contentType"
                  value={lesson.contentType}
                  onChange={(e) => setLesson({ ...lesson, contentType: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="ARTICLE">Article</option>
                  <option value="VIDEO">Video</option>
                  <option value="INTERACTIVE">Interactive</option>
                </select>
              </div>

              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <select
                  id="difficulty"
                  value={lesson.difficulty}
                  onChange={(e) => setLesson({ ...lesson, difficulty: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>

              <div>
                <Label htmlFor="estimatedMinutes">Estimated Minutes</Label>
                <Input
                  id="estimatedMinutes"
                  type="number"
                  value={lesson.estimatedMinutes}
                  onChange={(e) =>
                    setLesson({ ...lesson, estimatedMinutes: parseInt(e.target.value) || 0 })
                  }
                  min={1}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="hasCodeExercise"
                  type="checkbox"
                  checked={lesson.hasCodeExercise}
                  onChange={(e) => setLesson({ ...lesson, hasCodeExercise: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="hasCodeExercise">Has Code Exercise</Label>
              </div>
            </CardContent>
          </Card>

          {/* GitHub Content Source */}
          <Card>
            <CardHeader>
              <CardTitle>GitHub Content Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sourceUrl">GitHub Pages URL</Label>
                <Input
                  id="sourceUrl"
                  value={lesson.sourceUrl || ""}
                  onChange={(e) => setLesson({ ...lesson, sourceUrl: e.target.value || null })}
                  placeholder="https://MichaelTien8901.github.io/openbmc-guide-tutorial/..."
                />
                <p className="mt-1 text-xs text-gray-500">Leave empty to use local content</p>
              </div>

              <div>
                <Label htmlFor="repositoryPath">Repository Path</Label>
                <Input
                  id="repositoryPath"
                  value={lesson.repositoryPath || ""}
                  onChange={(e) => setLesson({ ...lesson, repositoryPath: e.target.value || null })}
                  placeholder="docs/intro/what-is-openbmc.md"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Path to markdown file in openbmc-guide-tutorial repo
                </p>
              </div>

              <div>
                <Label htmlFor="displayMode">Display Mode</Label>
                <select
                  id="displayMode"
                  value={lesson.displayMode}
                  onChange={(e) =>
                    setLesson({ ...lesson, displayMode: e.target.value as "IFRAME" | "RENDER" })
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="RENDER">Render (fetch & display with platform styling)</option>
                  <option value="IFRAME">Iframe (embed GitHub Pages directly)</option>
                </select>
              </div>

              {lesson.sourceUrl && (
                <div className="pt-2">
                  <a
                    href={lesson.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Preview source →
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Publish */}
          <Card>
            <CardHeader>
              <CardTitle>Publish</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  id="published"
                  type="checkbox"
                  checked={lesson.published}
                  onChange={(e) => setLesson({ ...lesson, published: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="published">Published</Label>
              </div>
              <p className="text-xs text-gray-500">
                {lesson.published
                  ? "This lesson is visible to users"
                  : "This lesson is in draft mode"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Simple markdown preview renderer
function renderMarkdownPreview(markdown: string): string {
  return markdown
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^\- (.*$)/gim, "<li>$1</li>")
    .replace(/(<li>[\s\S]*<\/li>)/g, "<ul>$1</ul>")
    .replace(/^\d+\. (.*$)/gim, "<li>$1</li>")
    .replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>")
    .replace(/\n\n/g, "</p><p>");
}
