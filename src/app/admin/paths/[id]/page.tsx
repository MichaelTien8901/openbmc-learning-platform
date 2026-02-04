"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PathData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  difficulty: string;
  estimatedHours: number;
  published: boolean;
  order: number;
}

interface LessonData {
  id: string;
  title: string;
  slug: string;
}

interface PathLesson {
  lessonId: string;
  order: number;
  lesson: LessonData;
}

export default function AdminPathEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";

  const [path, setPath] = useState<PathData>({
    id: "",
    slug: "",
    title: "",
    description: "",
    difficulty: "BEGINNER",
    estimatedHours: 1,
    published: false,
    order: 0,
  });

  const [pathLessons, setPathLessons] = useState<PathLesson[]>([]);
  const [allLessons, setAllLessons] = useState<LessonData[]>([]);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPath = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/paths/${id}`);
      const data = await response.json();

      if (data.success) {
        setPath(data.data.path);
        setPathLessons(data.data.lessons);
      } else {
        setError(data.error || "Failed to load path");
      }
    } catch {
      setError("Failed to load path");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadAllLessons = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/lessons");
      const data = await response.json();

      if (data.success) {
        setAllLessons(data.data);
      }
    } catch {
      console.error("Failed to load lessons");
    }
  }, []);

  useEffect(() => {
    loadAllLessons();
    if (!isNew) {
      loadPath();
    }
  }, [isNew, loadPath, loadAllLessons]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    try {
      const url = isNew ? "/api/admin/paths" : `/api/admin/paths/${id}`;
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...path,
          lessons: pathLessons.map((pl, index) => ({
            lessonId: pl.lessonId,
            order: index,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (isNew) {
          router.push(`/admin/paths/${data.data.id}`);
        } else {
          setPath(data.data.path);
          setPathLessons(data.data.lessons);
        }
      } else {
        setError(data.error || "Failed to save path");
      }
    } catch {
      setError("Failed to save path");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm("Are you sure you want to delete this learning path? This action cannot be undone.")
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/paths/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        router.push("/admin/paths");
      } else {
        setError(data.error || "Failed to delete path");
      }
    } catch {
      setError("Failed to delete path");
    }
  }

  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function addLesson(lessonId: string) {
    const lesson = allLessons.find((l) => l.id === lessonId);
    if (!lesson) return;

    if (pathLessons.some((pl) => pl.lessonId === lessonId)) {
      return; // Already added
    }

    setPathLessons([
      ...pathLessons,
      {
        lessonId,
        order: pathLessons.length,
        lesson,
      },
    ]);
  }

  function removeLesson(lessonId: string) {
    setPathLessons(pathLessons.filter((pl) => pl.lessonId !== lessonId));
  }

  function moveLesson(index: number, direction: "up" | "down") {
    const newLessons = [...pathLessons];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newLessons.length) return;

    [newLessons[index], newLessons[targetIndex]] = [newLessons[targetIndex], newLessons[index]];
    setPathLessons(newLessons);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading path...</p>
      </div>
    );
  }

  const availableLessons = allLessons.filter(
    (l) => !pathLessons.some((pl) => pl.lessonId === l.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isNew ? "Create Learning Path" : "Edit Learning Path"}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {isNew ? "Create a new learning path" : `Editing: ${path.title}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/paths">Cancel</Link>
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

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Basic Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={path.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setPath({
                      ...path,
                      title,
                      slug: isNew ? generateSlug(title) : path.slug,
                    });
                  }}
                  placeholder="Path title"
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={path.slug}
                  onChange={(e) => setPath({ ...path, slug: e.target.value })}
                  placeholder="path-slug"
                />
                <p className="mt-1 text-xs text-gray-500">URL: /paths/{path.slug || "..."}</p>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={path.description || ""}
                  onChange={(e) => setPath({ ...path, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  rows={3}
                  placeholder="Brief description of the learning path"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <select
                    id="difficulty"
                    value={path.difficulty}
                    onChange={(e) => setPath({ ...path, difficulty: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="estimatedHours">Estimated Hours</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    value={path.estimatedHours}
                    onChange={(e) =>
                      setPath({ ...path, estimatedHours: parseInt(e.target.value) || 0 })
                    }
                    min={1}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="published"
                  type="checkbox"
                  checked={path.published}
                  onChange={(e) => setPath({ ...path, published: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="published">Published</Label>
              </div>
            </CardContent>
          </Card>

          {/* Lessons in Path */}
          <Card>
            <CardHeader>
              <CardTitle>Lessons in Path ({pathLessons.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {pathLessons.length === 0 ? (
                <p className="py-4 text-center text-gray-500">
                  No lessons added yet. Add lessons from the sidebar.
                </p>
              ) : (
                <div className="space-y-2">
                  {pathLessons.map((pl, index) => (
                    <div
                      key={pl.lessonId}
                      className="flex items-center gap-2 rounded border border-gray-200 p-3 dark:border-gray-800"
                    >
                      <span className="w-8 text-center text-sm text-gray-500">{index + 1}</span>
                      <div className="flex-1">
                        <p className="font-medium">{pl.lesson.title}</p>
                        <p className="text-xs text-gray-500">{pl.lesson.slug}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveLesson(index, "up")}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveLesson(index, "down")}
                          disabled={index === pathLessons.length - 1}
                        >
                          ↓
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLesson(pl.lessonId)}
                          className="text-red-600"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Available Lessons Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle>Available Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            {availableLessons.length === 0 ? (
              <p className="text-sm text-gray-500">All lessons have been added to this path.</p>
            ) : (
              <div className="max-h-[500px] space-y-2 overflow-y-auto">
                {availableLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between rounded border border-gray-200 p-2 dark:border-gray-800"
                  >
                    <div>
                      <p className="text-sm font-medium">{lesson.title}</p>
                      <p className="text-xs text-gray-500">{lesson.slug}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => addLesson(lesson.id)}>
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
