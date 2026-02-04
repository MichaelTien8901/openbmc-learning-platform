"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

interface LessonData {
  id: string;
  slug: string;
  title: string;
}

export default function AdminQuizEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";

  const [lessonId, setLessonId] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<QuizOption[]>([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  const [explanation, setExplanation] = useState("");
  const [lessons, setLessons] = useState<LessonData[]>([]);

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuestion = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/quizzes/${id}`);
      const data = await response.json();

      if (data.success) {
        setLessonId(data.data.lessonId);
        setQuestion(data.data.question);
        setOptions(data.data.options as QuizOption[]);
        setExplanation(data.data.explanation || "");
      } else {
        setError(data.error || "Failed to load question");
      }
    } catch {
      setError("Failed to load question");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

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
    if (!isNew) {
      loadQuestion();
    }
  }, [isNew, loadQuestion, loadLessons]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    // Validate
    if (!lessonId) {
      setError("Please select a lesson");
      setIsSaving(false);
      return;
    }

    if (!question.trim()) {
      setError("Please enter a question");
      setIsSaving(false);
      return;
    }

    const validOptions = options.filter((o) => o.text.trim());
    if (validOptions.length < 2) {
      setError("Please enter at least 2 options");
      setIsSaving(false);
      return;
    }

    if (!validOptions.some((o) => o.isCorrect)) {
      setError("Please mark at least one option as correct");
      setIsSaving(false);
      return;
    }

    try {
      const url = isNew ? "/api/admin/quizzes" : `/api/admin/quizzes/${id}`;
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          question,
          options: validOptions,
          explanation: explanation.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push("/admin/quizzes");
      } else {
        setError(data.error || "Failed to save question");
      }
    } catch {
      setError("Failed to save question");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this question? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/quizzes/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        router.push("/admin/quizzes");
      } else {
        setError(data.error || "Failed to delete question");
      }
    } catch {
      setError("Failed to delete question");
    }
  }

  function updateOption(index: number, field: keyof QuizOption, value: string | boolean) {
    const newOptions = [...options];

    if (field === "isCorrect" && value === true) {
      // Only one correct answer - unset others
      newOptions.forEach((o, i) => {
        o.isCorrect = i === index;
      });
    } else {
      newOptions[index] = { ...newOptions[index], [field]: value };
    }

    setOptions(newOptions);
  }

  function addOption() {
    if (options.length < 6) {
      setOptions([...options, { text: "", isCorrect: false }]);
    }
  }

  function removeOption(index: number) {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      // Ensure at least one is correct
      if (!newOptions.some((o) => o.isCorrect) && newOptions.length > 0) {
        newOptions[0].isCorrect = true;
      }
      setOptions(newOptions);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading question...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isNew ? "Create Quiz Question" : "Edit Quiz Question"}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {isNew ? "Create a new quiz question" : "Edit an existing quiz question"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/quizzes">Cancel</Link>
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Question Form */}
        <Card>
          <CardHeader>
            <CardTitle>Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="lesson">Lesson</Label>
              <select
                id="lesson"
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="">Select a lesson...</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="question">Question Text</Label>
              <textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                rows={3}
                placeholder="Enter the quiz question..."
              />
            </div>

            <div>
              <Label htmlFor="explanation">Explanation (Optional)</Label>
              <textarea
                id="explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                rows={2}
                placeholder="Explain why the correct answer is correct..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Options Form */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Answer Options</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={options.length >= 6}
              >
                Add Option
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {options.map((option, index) => (
              <div
                key={index}
                className={`rounded-lg border p-3 ${
                  option.isCorrect
                    ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-2">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={option.isCorrect}
                      onChange={() => updateOption(index, "isCorrect", true)}
                      className="h-4 w-4 text-green-600"
                      title="Mark as correct answer"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={`option-${index}`} className="text-xs text-gray-500">
                      Option {String.fromCharCode(65 + index)}
                      {option.isCorrect && (
                        <span className="ml-2 text-green-600 dark:text-green-400">
                          (Correct Answer)
                        </span>
                      )}
                    </Label>
                    <Input
                      id={`option-${index}`}
                      value={option.text}
                      onChange={(e) => updateOption(index, "text", e.target.value)}
                      placeholder={`Enter option ${String.fromCharCode(65 + index)}...`}
                      className="mt-1"
                    />
                  </div>
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="text-red-600"
                    >
                      ×
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <p className="text-xs text-gray-500">
              Select the radio button to mark the correct answer. You can have 2-6 options.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      {question && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <p className="mb-4 font-medium text-gray-900 dark:text-white">{question}</p>
              <div className="space-y-2">
                {options
                  .filter((o) => o.text.trim())
                  .map((option, index) => (
                    <div
                      key={index}
                      className={`rounded-md border p-3 ${
                        option.isCorrect
                          ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                          : "border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      <span className="mr-2 font-medium">{String.fromCharCode(65 + index)}.</span>
                      {option.text}
                      {option.isCorrect && (
                        <span className="ml-2 text-green-600 dark:text-green-400">✓</span>
                      )}
                    </div>
                  ))}
              </div>
              {explanation && (
                <div className="mt-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                  <strong>Explanation:</strong> {explanation}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
