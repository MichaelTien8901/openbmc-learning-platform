"use client";

import { useState, useCallback } from "react";
import { MessageSquare, HelpCircle, Loader2, AlertTriangle, Send } from "lucide-react";
import { useServiceStatus } from "@/lib/service-status";

interface AIFeaturesProps {
  lessonId: string;
  lessonTitle: string;
}

interface QAResponse {
  answer: string;
  citations: Array<{ text: string; source: string }>;
  cached: boolean;
  rateLimitRemaining: number;
}

/**
 * AI Features panel for lessons
 * Provides Q&A functionality with fallback when NotebookLM is unavailable
 */
export function AIFeatures({ lessonId, lessonTitle }: AIFeaturesProps) {
  const { status } = useServiceStatus();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<QAResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remaining: number;
    resetIn?: number;
  } | null>(null);

  const isAvailable = status.notebookLm === "healthy";

  const handleAsk = useCallback(async () => {
    if (!question.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          lessonId,
          context: `This question is about the lesson: ${lessonTitle}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(`Rate limit exceeded. Please try again in ${data.retryAfter} seconds.`);
          setRateLimitInfo({ remaining: 0, resetIn: data.retryAfter });
        } else {
          setError(data.error || "Failed to get answer");
        }
        return;
      }

      setAnswer(data.data);
      setRateLimitInfo({ remaining: data.data.rateLimitRemaining });
      setQuestion("");
    } catch (err) {
      setError("Failed to connect to AI service");
      console.error("AI ask error:", err);
    } finally {
      setLoading(false);
    }
  }, [question, lessonId, lessonTitle]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  // Fallback UI when NotebookLM is unavailable
  if (!isAvailable) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-500" />
          <div>
            <h3 className="font-medium text-yellow-800 dark:text-yellow-300">AI Q&A Unavailable</h3>
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
              The AI-powered Q&A feature is currently unavailable. You can still:
            </p>
            <ul className="mt-2 list-inside list-disc text-sm text-yellow-700 dark:text-yellow-400">
              <li>Read the lesson content directly</li>
              <li>Take the quiz to test your knowledge</li>
              <li>Add notes and bookmarks</li>
              <li>Search the documentation</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Ask AI</h3>
        {rateLimitInfo && (
          <span className="ml-auto text-xs text-gray-500">
            {rateLimitInfo.remaining} questions remaining
          </span>
        )}
      </div>

      {/* Question input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about this lesson..."
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            rows={2}
            maxLength={1000}
            disabled={loading}
          />
          <button
            onClick={handleAsk}
            disabled={loading || !question.trim()}
            className="flex items-center justify-center rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-50"
            aria-label="Send question"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {question.length}/1000 characters • Press Enter to send
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Answer display */}
      {answer && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{answer.answer}</p>
          </div>

          {/* Citations */}
          {answer.citations.length > 0 && (
            <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Sources:</p>
              <ul className="mt-1 space-y-1">
                {answer.citations.map((citation, index) => (
                  <li key={index} className="text-xs text-gray-500">
                    {citation.source}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {answer.cached && (
            <p className="mt-2 text-xs text-gray-400">
              <HelpCircle className="mr-1 inline h-3 w-3" />
              Cached response
            </p>
          )}
        </div>
      )}

      {/* Suggested questions */}
      {!answer && !loading && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {[
              `What are the key concepts in ${lessonTitle}?`,
              "Can you explain this with an example?",
              "What are common mistakes to avoid?",
            ].map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setQuestion(suggestion)}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
