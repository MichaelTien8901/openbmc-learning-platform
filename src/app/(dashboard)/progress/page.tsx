"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProgressSummary {
  lessonsCompleted: number;
  totalLessons: number;
  pathsEnrolled: number;
  pathsCompleted: number;
  quizzesTaken: number;
  averageQuizScore: number | null;
  currentStreak: number;
  longestStreak: number;
  recentActivity: Array<{
    lessonId: string;
    lessonTitle: string;
    pathTitle: string | null;
    completedAt: string;
  }>;
  enrolledPaths: Array<{
    id: string;
    slug: string;
    title: string;
    progress: number;
    lessonsCompleted: number;
    totalLessons: number;
  }>;
}

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      try {
        const response = await fetch("/api/progress");
        const data = await response.json();
        if (data.success) {
          setProgress(data.data);
        }
      } catch (error) {
        console.error("Failed to load progress:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProgress();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading progress...</p>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-red-500">Failed to load progress</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Progress</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Track your learning journey and achievements
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lessons Completed</CardDescription>
            <CardTitle className="text-3xl">
              {progress.lessonsCompleted}
              <span className="text-lg font-normal text-gray-500">/{progress.totalLessons}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full bg-blue-600"
                style={{
                  width: `${progress.totalLessons > 0 ? (progress.lessonsCompleted / progress.totalLessons) * 100 : 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paths Completed</CardDescription>
            <CardTitle className="text-3xl">
              {progress.pathsCompleted}
              <span className="text-lg font-normal text-gray-500">/{progress.pathsEnrolled}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              {progress.pathsEnrolled - progress.pathsCompleted} in progress
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
            <p className="text-sm text-gray-500">{progress.quizzesTaken} quizzes taken</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Streak</CardDescription>
            <CardTitle className="text-3xl">{progress.currentStreak} days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Best: {progress.longestStreak} days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Enrolled Paths */}
        <Card>
          <CardHeader>
            <CardTitle>Your Learning Paths</CardTitle>
            <CardDescription>Progress on enrolled paths</CardDescription>
          </CardHeader>
          <CardContent>
            {progress.enrolledPaths.length > 0 ? (
              <ul className="space-y-4">
                {progress.enrolledPaths.map((path) => (
                  <li key={path.id}>
                    <Link
                      href={`/paths/${path.slug}`}
                      className="-mx-2 block rounded-md px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-medium">{path.title}</span>
                        <span className="text-sm text-gray-500">
                          {path.lessonsCompleted}/{path.totalLessons}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className={`h-full transition-all ${
                            path.progress === 100 ? "bg-green-600" : "bg-blue-600"
                          }`}
                          style={{ width: `${path.progress}%` }}
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center">
                <p className="mb-4 text-gray-500">You haven&apos;t enrolled in any paths yet</p>
                <Button asChild>
                  <Link href="/paths">Browse Learning Paths</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest completions</CardDescription>
          </CardHeader>
          <CardContent>
            {progress.recentActivity.length > 0 ? (
              <ul className="space-y-3">
                {progress.recentActivity.map((activity, index) => (
                  <li
                    key={`${activity.lessonId}-${index}`}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
                    <div>
                      <p className="font-medium">{activity.lessonTitle}</p>
                      <p className="text-gray-500">
                        {activity.pathTitle && <span>{activity.pathTitle} · </span>}
                        {new Date(activity.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-500">No activity yet</p>
                <p className="mt-1 text-sm text-gray-400">
                  Complete lessons to see your activity here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
