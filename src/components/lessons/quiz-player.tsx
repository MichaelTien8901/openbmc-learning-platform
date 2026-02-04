"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}

interface AnswerResult {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  correctOption: number;
  explanation: string | null;
}

interface QuizResult {
  attemptId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  results: AnswerResult[];
}

interface QuizPlayerProps {
  lessonSlug: string;
  onComplete?: (score: number) => void;
}

type QuizState = "loading" | "not-available" | "ready" | "in-progress" | "completed";

export function QuizPlayer({ lessonSlug, onComplete }: QuizPlayerProps) {
  const [state, setState] = useState<QuizState>("loading");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuiz = useCallback(async () => {
    setState("loading");
    setError(null);

    try {
      const response = await fetch(`/api/lessons/${lessonSlug}/quiz`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to load quiz");
        setState("not-available");
        return;
      }

      if (!data.data.available || data.data.questions.length === 0) {
        setState("not-available");
        return;
      }

      setQuestions(data.data.questions);
      setState("ready");
    } catch {
      setError("Failed to load quiz");
      setState("not-available");
    }
  }, [lessonSlug]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const startQuiz = () => {
    setAnswers(new Map());
    setCurrentIndex(0);
    setSelectedOption(null);
    setResult(null);
    setState("in-progress");
  };

  const handleSelectOption = (optionIndex: number) => {
    setSelectedOption(optionIndex);
  };

  const handleNextQuestion = () => {
    if (selectedOption === null) return;

    const currentQuestion = questions[currentIndex];
    const newAnswers = new Map(answers);
    newAnswers.set(currentQuestion.id, selectedOption);
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      // Check if already answered
      const existingAnswer = newAnswers.get(questions[currentIndex + 1]?.id);
      setSelectedOption(existingAnswer ?? null);
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      const existingAnswer = answers.get(questions[currentIndex - 1]?.id);
      setSelectedOption(existingAnswer ?? null);
    }
  };

  const handleSubmitQuiz = async () => {
    if (selectedOption === null) return;

    // Save current answer
    const currentQuestion = questions[currentIndex];
    const finalAnswers = new Map(answers);
    finalAnswers.set(currentQuestion.id, selectedOption);

    // Check all questions are answered
    if (finalAnswers.size !== questions.length) {
      setError("Please answer all questions before submitting");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const answerArray = Array.from(finalAnswers.entries()).map(([questionId, optionIdx]) => ({
        questionId,
        selectedOption: optionIdx,
      }));

      const response = await fetch(`/api/lessons/${lessonSlug}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerArray }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to submit quiz");
        return;
      }

      setResult(data.data);
      setState("completed");
      onComplete?.(data.data.score);
    } catch {
      setError("Failed to submit quiz");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    loadQuiz();
  };

  // Loading state
  if (state === "loading") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-gray-500">Loading quiz...</p>
        </CardContent>
      </Card>
    );
  }

  // No quiz available
  if (state === "not-available") {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">No quiz available for this lesson.</p>
        </CardContent>
      </Card>
    );
  }

  // Ready to start
  if (state === "ready") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Test your understanding with {questions.length} questions.
          </p>
          <Button onClick={startQuiz}>Start Quiz</Button>
        </CardContent>
      </Card>
    );
  }

  // Completed - show results
  if (state === "completed" && result) {
    const scoreColor =
      result.score >= 80
        ? "text-green-600 dark:text-green-400"
        : result.score >= 60
          ? "text-yellow-600 dark:text-yellow-400"
          : "text-red-600 dark:text-red-400";

    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz Results</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Score Summary */}
          <div className="mb-6 text-center">
            <p className={`text-4xl font-bold ${scoreColor}`}>{result.score}%</p>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {result.correctAnswers} of {result.totalQuestions} correct
            </p>
          </div>

          {/* Detailed Results */}
          <div className="space-y-4">
            {result.results.map((r, index) => {
              const question = questions.find((q) => q.id === r.questionId);
              if (!question) return null;

              return (
                <div
                  key={r.questionId}
                  className={`rounded-lg border p-4 ${
                    r.isCorrect
                      ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20"
                      : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20"
                  }`}
                >
                  <p className="mb-2 font-medium">
                    {index + 1}. {question.question}
                  </p>
                  <div className="space-y-1 text-sm">
                    {question.options.map((option, optIdx) => {
                      const isSelected = optIdx === r.selectedOption;
                      const isCorrect = optIdx === r.correctOption;

                      return (
                        <p
                          key={optIdx}
                          className={`${
                            isCorrect
                              ? "font-medium text-green-700 dark:text-green-400"
                              : isSelected && !r.isCorrect
                                ? "font-medium text-red-700 line-through dark:text-red-400"
                                : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {isSelected && "→ "}
                          {isCorrect && "✓ "}
                          {option}
                        </p>
                      );
                    })}
                  </div>
                  {r.explanation && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <strong>Explanation:</strong> {r.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Retry Button */}
          <div className="mt-6 text-center">
            <Button onClick={handleRetry} variant="outline">
              Retry Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // In progress - show current question
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const answeredCount = answers.size + (selectedOption !== null ? 1 : 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Quiz</CardTitle>
          <span className="text-sm text-gray-500">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Question */}
        <p className="mb-4 text-lg font-medium">{currentQuestion.question}</p>

        {/* Options */}
        <div className="mb-6 space-y-2">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelectOption(index)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                selectedOption === index
                  ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800"
              }`}
            >
              <span className="mr-2 inline-block w-6 text-center font-medium">
                {String.fromCharCode(65 + index)}.
              </span>
              {option}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handlePrevQuestion} disabled={currentIndex === 0}>
            Previous
          </Button>

          <div className="flex gap-2">
            {!isLastQuestion ? (
              <Button onClick={handleNextQuestion} disabled={selectedOption === null}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmitQuiz} disabled={selectedOption === null || isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
