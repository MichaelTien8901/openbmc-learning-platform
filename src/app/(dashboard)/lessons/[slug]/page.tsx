"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TTSPlayer } from "@/components/lessons/tts-player";
import { TableOfContents } from "@/components/lessons/table-of-contents";
import { PathProgressBar } from "@/components/lessons/path-progress-bar";
import { QuizPlayer } from "@/components/lessons/quiz-player";
import { BookmarkButton } from "@/components/lessons/bookmark-button";
import { NotesPanel } from "@/components/lessons/notes-panel";

interface PathLessonInfo {
  slug: string;
  title: string;
  completed: boolean;
}

interface LessonDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  contentType: string;
  difficulty: string;
  estimatedMinutes: number;
  hasCodeExercise: boolean;
  completed: boolean;
  lastPosition: number;
  path: {
    id: string;
    slug: string;
    title: string;
  } | null;
  pathLessons: PathLessonInfo[];
  currentLessonIndex: number;
  prevLesson: { slug: string; title: string } | null;
  nextLesson: { slug: string; title: string } | null;
}

export default function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLesson() {
      try {
        const response = await fetch(`/api/lessons/${slug}`);
        const data = await response.json();
        if (data.success) {
          setLesson(data.data);
        } else {
          setError(data.error || "Failed to load lesson");
        }
      } catch (err) {
        console.error("Failed to load lesson:", err);
        setError("Failed to load lesson");
      } finally {
        setIsLoading(false);
      }
    }
    loadLesson();
  }, [slug]);

  async function handleComplete() {
    if (!lesson) return;
    setIsCompleting(true);

    try {
      const response = await fetch(`/api/lessons/${lesson.slug}/complete`, {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setLesson({ ...lesson, completed: true });
        if (lesson.nextLesson) {
          router.push(`/lessons/${lesson.nextLesson.slug}`);
        }
      } else {
        setError(data.error || "Failed to complete lesson");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setIsCompleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading lesson...</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-500">{error || "Lesson not found"}</p>
        <Button asChild className="mt-4">
          <Link href="/paths">Browse Paths</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          {lesson.path && (
            <>
              <Link
                href={`/paths/${lesson.path.slug}`}
                className="hover:text-gray-900 dark:hover:text-white"
              >
                {lesson.path.title}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-900 dark:text-white">{lesson.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <BookmarkButton lessonId={lesson.id} />
          {lesson.completed && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400">
              ✓ Completed
            </span>
          )}
        </div>
      </div>

      {/* Path Progress Bar */}
      {lesson.path && lesson.pathLessons.length > 0 && (
        <PathProgressBar
          pathTitle={lesson.path.title}
          pathSlug={lesson.path.slug}
          lessons={lesson.pathLessons.map((pl, index) => ({
            ...pl,
            current: index === lesson.currentLessonIndex,
          }))}
          currentLessonIndex={lesson.currentLessonIndex}
        />
      )}

      {/* Lesson Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{lesson.title}</h1>
        {lesson.description && (
          <p className="mt-2 text-gray-600 dark:text-gray-400">{lesson.description}</p>
        )}
        <div className="mt-3 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>{lesson.estimatedMinutes} min read</span>
          <span className="capitalize">{lesson.difficulty.toLowerCase()}</span>
          {lesson.hasCodeExercise && <span>Includes exercise</span>}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* TTS Audio Player */}
      <TTSPlayer
        content={lesson.content}
        title="Listen to Lesson"
        initialPosition={lesson.lastPosition}
        onPositionChange={(position) => {
          // Save position for resume functionality
          fetch(`/api/lessons/${lesson.slug}/position`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position }),
          }).catch(console.error);
        }}
      />

      {/* Lesson Content with TOC Sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_250px]">
        <Card>
          <CardContent className="prose prose-gray dark:prose-invert max-w-none py-8">
            <div
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(lesson.content),
              }}
            />
          </CardContent>
        </Card>

        {/* Table of Contents Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <TableOfContents content={lesson.content} />
          </div>
        </aside>
      </div>

      {/* Quiz Section */}
      <QuizPlayer
        lessonSlug={lesson.slug}
        onComplete={(score) => {
          if (score >= 70 && !lesson.completed) {
            // Auto-complete lesson on passing quiz
            handleComplete();
          }
        }}
      />

      {/* Notes Panel */}
      <NotesPanel lessonId={lesson.id} lessonTitle={lesson.title} />

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-800">
        <div>
          {lesson.prevLesson && (
            <Button variant="outline" asChild>
              <Link href={`/lessons/${lesson.prevLesson.slug}`}>← {lesson.prevLesson.title}</Link>
            </Button>
          )}
        </div>

        <div className="flex gap-4">
          {!lesson.completed && (
            <Button onClick={handleComplete} disabled={isCompleting}>
              {isCompleting ? "Saving..." : "Mark Complete"}
            </Button>
          )}
          {lesson.nextLesson && (
            <Button asChild>
              <Link href={`/lessons/${lesson.nextLesson.slug}`}>{lesson.nextLesson.title} →</Link>
            </Button>
          )}
          {!lesson.nextLesson && lesson.path && (
            <Button asChild>
              <Link href={`/paths/${lesson.path.slug}`}>Back to Path</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Generate slug from heading text for anchor links
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Simple markdown to HTML converter
function renderMarkdown(markdown: string): string {
  return (
    markdown
      // Headers with IDs for anchor links
      .replace(/^### (.*$)/gim, (_match, p1) => `<h3 id="${slugify(p1)}">${p1}</h3>`)
      .replace(/^## (.*$)/gim, (_match, p1) => `<h2 id="${slugify(p1)}">${p1}</h2>`)
      .replace(/^# (.*$)/gim, (_match, p1) => `<h1 id="${slugify(p1)}">${p1}</h1>`)
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Lists
      .replace(/^\- (.*$)/gim, "<li>$1</li>")
      .replace(/(<li>[\s\S]*<\/li>)/g, "<ul>$1</ul>")
      // Numbered lists
      .replace(/^\d+\. (.*$)/gim, "<li>$1</li>")
      // Blockquotes
      .replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>")
      // Paragraphs
      .replace(/\n\n/g, "</p><p>")
      .replace(/^(.+)$/gm, (match) => {
        if (
          match.startsWith("<") ||
          match.startsWith("-") ||
          match.startsWith("#") ||
          match.startsWith(">")
        ) {
          return match;
        }
        return match;
      })
  );
}
