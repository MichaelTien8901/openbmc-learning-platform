"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PathProgress {
  path: {
    id: string;
    slug: string;
    title: string;
    description: string;
    difficulty: string;
    estimatedHours: number;
  };
  enrolledAt: string;
  completedAt: string | null;
  overallProgress: number;
  lessonsCompleted: number;
  totalLessons: number;
  quizzesCompleted: number;
  averageQuizScore: number | null;
  totalTimeSpent: number;
  lessons: Array<{
    id: string;
    slug: string;
    title: string;
    order: number;
    estimatedMinutes: number;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    completedAt: string | null;
    quizScore: number | null;
  }>;
}

const difficultyColors = {
  BEGINNER: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  INTERMEDIATE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  ADVANCED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusColors = {
  NOT_STARTED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export default function PathProgressPage({ params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = use(params);
  const [progress, setProgress] = useState<PathProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProgress() {
      try {
        const response = await fetch(`/api/progress/paths/${pathId}`);
        const data = await response.json();
        if (data.success) {
          setProgress(data.data);
        } else {
          setError(data.error || "Failed to load progress");
        }
      } catch (err) {
        console.error("Failed to load path progress:", err);
        setError("Failed to load path progress");
      } finally {
        setIsLoading(false);
      }
    }
    loadProgress();
  }, [pathId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading progress...</p>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-500">{error || "Progress not found"}</p>
        <Button asChild className="mt-4">
          <Link href="/progress">Back to Progress</Link>
        </Button>
      </div>
    );
  }

  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-2">
            <Link
              href="/progress"
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              ← Back to Progress
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {progress.path.title}
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${difficultyColors[progress.path.difficulty as keyof typeof difficultyColors]}`}
            >
              {progress.path.difficulty}
            </span>
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{progress.path.description}</p>
        </div>
        <Button asChild>
          <Link href={`/paths/${progress.path.slug}`}>View Path</Link>
        </Button>
      </div>

      {/* Progress Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overall Progress</CardDescription>
            <CardTitle className="text-3xl">{progress.overallProgress}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-full transition-all ${
                  progress.completedAt ? "bg-green-600" : "bg-blue-600"
                }`}
                style={{ width: `${progress.overallProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lessons</CardDescription>
            <CardTitle className="text-3xl">
              {progress.lessonsCompleted}
              <span className="text-lg font-normal text-gray-500">/{progress.totalLessons}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              {progress.totalLessons - progress.lessonsCompleted} remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Quiz Average</CardDescription>
            <CardTitle className="text-3xl">
              {progress.averageQuizScore !== null ? `${progress.averageQuizScore}%` : "-"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">{progress.quizzesCompleted} quizzes taken</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Time Spent</CardDescription>
            <CardTitle className="text-3xl">{formatTime(progress.totalTimeSpent)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Est. {formatTime(progress.path.estimatedHours * 60)} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Info */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">Enrolled: </span>
              <span className="font-medium">
                {new Date(progress.enrolledAt).toLocaleDateString()}
              </span>
            </div>
            {progress.completedAt && (
              <div>
                <span className="text-gray-500">Completed: </span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {new Date(progress.completedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lesson Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Lesson Progress</CardTitle>
          <CardDescription>Your progress through each lesson</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {progress.lessons.map((lesson, index) => (
              <li key={lesson.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${statusColors[lesson.status]}`}
                    >
                      {lesson.status === "COMPLETED" ? "✓" : index + 1}
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
                        {lesson.completedAt && (
                          <span>Completed {new Date(lesson.completedAt).toLocaleDateString()}</span>
                        )}
                        {lesson.quizScore !== null && (
                          <span className="text-blue-600 dark:text-blue-400">
                            Quiz: {lesson.quizScore}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[lesson.status]}`}
                    >
                      {lesson.status.replace("_", " ")}
                    </span>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/lessons/${lesson.slug}`}>
                        {lesson.status === "COMPLETED"
                          ? "Review"
                          : lesson.status === "IN_PROGRESS"
                            ? "Continue"
                            : "Start"}
                      </Link>
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
