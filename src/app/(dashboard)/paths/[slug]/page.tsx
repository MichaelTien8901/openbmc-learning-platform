"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CompletionBadge } from "@/components/paths/completion-badge";

interface PathDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedHours: number;
  enrolled: boolean;
  progress: number;
  completedAt: string | null;
  prerequisites: Array<{ id: string; slug: string; title: string; completed: boolean }>;
  lessons: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    difficulty: string;
    estimatedMinutes: number;
    hasCodeExercise: boolean;
    completed: boolean;
    order: number;
  }>;
}

const difficultyColors = {
  BEGINNER: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  INTERMEDIATE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  ADVANCED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function PathDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [path, setPath] = useState<PathDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPath() {
      try {
        const response = await fetch(`/api/paths/${slug}`);
        const data = await response.json();
        if (data.success) {
          setPath(data.data);
        } else {
          setError(data.error || "Failed to load path");
        }
      } catch (err) {
        console.error("Failed to load path:", err);
        setError("Failed to load learning path");
      } finally {
        setIsLoading(false);
      }
    }
    loadPath();
  }, [slug]);

  async function handleEnroll() {
    if (!path) return;
    setIsEnrolling(true);
    setError(null);

    try {
      const response = await fetch(`/api/paths/${path.slug}/enroll`, {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setPath({ ...path, enrolled: true });
        // Navigate to first lesson
        if (path.lessons.length > 0) {
          router.push(`/lessons/${path.lessons[0].slug}`);
        }
      } else {
        setError(data.error || "Failed to enroll");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setIsEnrolling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!path) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-500">{error || "Learning path not found"}</p>
        <Button asChild className="mt-4">
          <Link href="/paths">Back to Paths</Link>
        </Button>
      </div>
    );
  }

  const hasUnmetPrereqs = path.prerequisites.some((p) => !p.completed);
  const nextLesson = path.lessons.find((l) => !l.completed) || path.lessons[0];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{path.title}</h1>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${difficultyColors[path.difficulty as keyof typeof difficultyColors]}`}
            >
              {path.difficulty}
            </span>
            {path.enrolled && (
              <CompletionBadge completedAt={path.completedAt} progress={path.progress} />
            )}
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{path.description}</p>
          <div className="mt-4 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>{path.lessons.length} lessons</span>
            <span>{path.estimatedHours} hours</span>
            {path.enrolled && !path.completedAt && <span>{path.progress}% complete</span>}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Prerequisites */}
      {path.prerequisites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Prerequisites</CardTitle>
            <CardDescription>Complete these paths before starting</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {path.prerequisites.map((prereq) => (
                <li key={prereq.id} className="flex items-center justify-between">
                  <Link
                    href={`/paths/${prereq.slug}`}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {prereq.title}
                  </Link>
                  {prereq.completed ? (
                    <span className="text-green-600 dark:text-green-400">✓ Completed</span>
                  ) : (
                    <span className="text-gray-400">Not completed</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Progress & Enrollment */}
      {path.enrolled ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {path.lessons.filter((l) => l.completed).length} of {path.lessons.length} lessons
                  complete
                </span>
                <span>{path.progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${path.progress}%` }}
                />
              </div>
            </div>
            {nextLesson && (
              <Button asChild className="w-full">
                <Link href={`/lessons/${nextLesson.slug}`}>
                  {path.progress === 0 ? "Start Learning" : "Continue Learning"}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6">
            <Button
              onClick={handleEnroll}
              disabled={isEnrolling || hasUnmetPrereqs}
              className="w-full"
            >
              {isEnrolling
                ? "Enrolling..."
                : hasUnmetPrereqs
                  ? "Complete Prerequisites First"
                  : "Enroll & Start Learning"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lesson List */}
      <Card>
        <CardHeader>
          <CardTitle>Lessons</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {path.lessons.map((lesson, index) => (
              <li key={lesson.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                        lesson.completed
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {lesson.completed ? "✓" : index + 1}
                    </span>
                    <div>
                      <Link
                        href={`/lessons/${lesson.slug}`}
                        className="font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                      >
                        {lesson.title}
                      </Link>
                      <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{lesson.estimatedMinutes} min</span>
                        {lesson.hasCodeExercise && <span>Has exercise</span>}
                      </div>
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/lessons/${lesson.slug}`}>
                      {lesson.completed ? "Review" : "Start"}
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
