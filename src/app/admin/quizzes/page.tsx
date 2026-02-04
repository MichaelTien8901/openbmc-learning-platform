"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  id: string;
  lessonId: string;
  question: string;
  options: QuizOption[];
  explanation: string | null;
  source: string;
  createdAt: string;
  lesson: {
    id: string;
    slug: string;
    title: string;
  };
}

interface LessonData {
  id: string;
  slug: string;
  title: string;
}

export default function AdminQuizzesPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [lessons, setLessons] = useState<LessonData[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const loadQuestions = useCallback(async () => {
    try {
      const url = selectedLesson
        ? `/api/admin/quizzes?lessonId=${selectedLesson}`
        : "/api/admin/quizzes";
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setQuestions(data.data);
      }
    } catch {
      console.error("Failed to load questions");
    } finally {
      setIsLoading(false);
    }
  }, [selectedLesson]);

  const loadLessons = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/lessons");
      const data = await response.json();

      if (data.success) {
        setLessons(data.data);
      }
    } catch {
      console.error("Failed to load lessons");
    }
  }, []);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this question?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/quizzes/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setQuestions(questions.filter((q) => q.id !== id));
      } else {
        alert(data.error || "Failed to delete question");
      }
    } catch {
      alert("Failed to delete question");
    }
  }

  // Group questions by lesson
  const questionsByLesson = questions.reduce(
    (acc, q) => {
      const lessonTitle = q.lesson.title;
      if (!acc[lessonTitle]) {
        acc[lessonTitle] = [];
      }
      acc[lessonTitle].push(q);
      return acc;
    },
    {} as Record<string, QuizQuestion[]>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quiz Questions</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Manage quiz questions for lessons</p>
        </div>
        <Button asChild>
          <Link href="/admin/quizzes/new">Add Question</Link>
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <label htmlFor="lesson-filter" className="text-sm font-medium">
              Filter by Lesson:
            </label>
            <select
              id="lesson-filter"
              value={selectedLesson}
              onChange={(e) => setSelectedLesson(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">All Lessons</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title}
                </option>
              ))}
            </select>
            {selectedLesson && (
              <Button variant="outline" size="sm" onClick={() => setSelectedLesson("")}>
                Clear Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">Loading questions...</p>
          </CardContent>
        </Card>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">No quiz questions found.</p>
            <Button asChild className="mt-4">
              <Link href="/admin/quizzes/new">Create your first question</Link>
            </Button>
          </CardContent>
        </Card>
      ) : selectedLesson ? (
        // Show flat list when filtered
        <Card>
          <CardHeader>
            <CardTitle>Questions ({questions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions.map((q, index) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={index + 1}
                  onDelete={() => handleDelete(q.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        // Show grouped by lesson
        Object.entries(questionsByLesson).map(([lessonTitle, lessonQuestions]) => (
          <Card key={lessonTitle}>
            <CardHeader>
              <CardTitle className="text-lg">
                {lessonTitle}{" "}
                <span className="text-sm font-normal text-gray-500">
                  ({lessonQuestions.length} questions)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lessonQuestions.map((q, index) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={index + 1}
                    onDelete={() => handleDelete(q.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function QuestionCard({
  question,
  index,
  onDelete,
}: {
  question: QuizQuestion;
  index: number;
  onDelete: () => void;
}) {
  const correctOption = question.options.find((o) => o.isCorrect);

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Q{index}</span>
            <span
              className={`rounded px-2 py-0.5 text-xs ${
                question.source === "MANUAL"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
              }`}
            >
              {question.source}
            </span>
          </div>
          <p className="mt-1 font-medium text-gray-900 dark:text-white">{question.question}</p>
          <p className="mt-1 text-sm text-gray-500">
            <span className="text-green-600 dark:text-green-400">Correct:</span>{" "}
            {correctOption?.text || "N/A"}
          </p>
          <p className="text-xs text-gray-400">
            {question.options.length} options
            {question.explanation && " • Has explanation"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/quizzes/${question.id}`}>Edit</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-red-600">
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
