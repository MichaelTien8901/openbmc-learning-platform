"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LearningPath {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedHours: number;
  lessonCount: number;
  enrolled: boolean;
  progress: number;
  prerequisites: Array<{ id: string; slug: string; title: string; completed: boolean }>;
}

const difficultyColors = {
  BEGINNER: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  INTERMEDIATE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  ADVANCED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function PathsPage() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function loadPaths() {
      try {
        const url = filter === "all" ? "/api/paths" : `/api/paths?difficulty=${filter}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          setPaths(data.data);
        }
      } catch (error) {
        console.error("Failed to load paths:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadPaths();
  }, [filter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading learning paths...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Learning Paths</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Structured courses to master OpenBMC development
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="BEGINNER">Beginner</TabsTrigger>
          <TabsTrigger value="INTERMEDIATE">Intermediate</TabsTrigger>
          <TabsTrigger value="ADVANCED">Advanced</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {paths.map((path) => {
          const hasUnmetPrereqs = path.prerequisites.some((p) => !p.completed);

          return (
            <Card key={path.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{path.title}</CardTitle>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${difficultyColors[path.difficulty as keyof typeof difficultyColors]}`}
                  >
                    {path.difficulty}
                  </span>
                </div>
                <CardDescription className="line-clamp-2">{path.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>{path.lessonCount} lessons</span>
                    <span>{path.estimatedHours}h estimated</span>
                  </div>

                  {path.enrolled && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{path.progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${path.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {path.prerequisites.length > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Prerequisites: </span>
                      {path.prerequisites.map((p, i) => (
                        <span key={p.id}>
                          <Link
                            href={`/paths/${p.slug}`}
                            className={
                              p.completed
                                ? "text-green-600 dark:text-green-400"
                                : "text-blue-600 hover:underline dark:text-blue-400"
                            }
                          >
                            {p.title}
                            {p.completed && " ✓"}
                          </Link>
                          {i < path.prerequisites.length - 1 && ", "}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  asChild
                  variant={hasUnmetPrereqs ? "outline" : "default"}
                  className="w-full"
                >
                  <Link href={`/paths/${path.slug}`}>
                    {path.enrolled
                      ? path.progress === 100
                        ? "Review"
                        : "Continue"
                      : hasUnmetPrereqs
                        ? "View Prerequisites"
                        : "Start Learning"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {paths.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No learning paths found for this filter.
          </p>
        </div>
      )}
    </div>
  );
}
