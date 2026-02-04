"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableOfContents } from "@/components/lessons/table-of-contents";
import { PathProgressBar } from "@/components/lessons/path-progress-bar";
import { QuizPlayer } from "@/components/lessons/quiz-player";
import { BookmarkButton } from "@/components/lessons/bookmark-button";
import { NotesPanel } from "@/components/lessons/notes-panel";
import { GitHubContentFrame } from "@/components/lessons/github-content-frame";
import { GitHubContentRenderer } from "@/components/lessons/github-content-renderer";

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
  // GitHub content delivery fields
  sourceUrl: string | null;
  repositoryPath: string | null;
  displayMode: "IFRAME" | "RENDER";
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

  // Use wider layout for IFRAME mode
  const isIframeMode = lesson.sourceUrl && lesson.repositoryPath && lesson.displayMode === "IFRAME";

  return (
    <div
      className={`mx-auto space-y-4 px-4 sm:space-y-6 sm:px-0 ${isIframeMode ? "max-w-7xl" : "max-w-4xl"}`}
    >
      {/* Skip to content link for accessibility */}
      <a
        href="#lesson-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to lesson content
      </a>

      {/* Breadcrumb & Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <ol
          className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
          role="list"
        >
          {lesson.path && (
            <>
              <li>
                <Link
                  href={`/paths/${lesson.path.slug}`}
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  {lesson.path.title}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
            </>
          )}
          <li aria-current="page">
            <span className="text-gray-900 dark:text-white">{lesson.title}</span>
          </li>
        </ol>
        <div className="flex items-center gap-2">
          <BookmarkButton lessonId={lesson.id} />
          {lesson.completed && (
            <span
              className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400"
              role="status"
              aria-label="Lesson completed"
            >
              ✓ Completed
            </span>
          )}
        </div>
      </nav>

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
      <header>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
          {lesson.title}
        </h1>
        {lesson.description && (
          <p className="mt-2 text-gray-600 dark:text-gray-400">{lesson.description}</p>
        )}
        <div
          className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500 sm:gap-4 dark:text-gray-400"
          aria-label="Lesson details"
        >
          <span aria-label={`Estimated reading time: ${lesson.estimatedMinutes} minutes`}>
            {lesson.estimatedMinutes} min read
          </span>
          <span
            aria-label={`Difficulty: ${lesson.difficulty.toLowerCase()}`}
            className="capitalize"
          >
            {lesson.difficulty.toLowerCase()}
          </span>
          {lesson.hasCodeExercise && (
            <span aria-label="This lesson includes a code exercise">Includes exercise</span>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Lesson Content - GitHub or Local */}
      {lesson.sourceUrl && lesson.repositoryPath ? (
        // GitHub Content Delivery Mode
        lesson.displayMode === "IFRAME" ? (
          // IFRAME mode - full width, taller
          <Card className="overflow-hidden">
            <GitHubContentFrame
              sourceUrl={lesson.sourceUrl}
              title={lesson.title}
              className="min-h-[800px]"
            />
          </Card>
        ) : (
          // RENDER mode - with sidebar
          <div className="grid gap-6 lg:grid-cols-[1fr_250px]">
            <Card className="overflow-hidden">
              <GitHubContentRenderer
                repositoryPath={lesson.repositoryPath}
                sourceUrl={lesson.sourceUrl}
                title={lesson.title}
                className="min-h-[600px]"
                onScrollProgress={(progress) => {
                  // Track scroll progress for completion
                  if (progress > 0.9 && !lesson.completed) {
                    // User has scrolled through most of content
                  }
                }}
              />
            </Card>

            {/* Table of Contents Sidebar */}
            <aside className="hidden lg:block" aria-label="Table of contents">
              <div className="sticky top-24">
                <TableOfContents content={lesson.content} />
              </div>
            </aside>
          </div>
        )
      ) : (
        // Fallback: Local content with TOC Sidebar
        <div className="grid gap-6 lg:grid-cols-[1fr_250px]">
          <Card>
            <CardContent className="prose prose-gray dark:prose-invert max-w-none px-4 py-6 sm:px-6 sm:py-8">
              <main
                id="lesson-content"
                role="main"
                aria-label="Lesson content"
                tabIndex={-1}
                className="focus:outline-none"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(lesson.content),
                }}
              />
            </CardContent>
          </Card>

          {/* Table of Contents Sidebar */}
          <aside className="hidden lg:block" aria-label="Table of contents">
            <div className="sticky top-24">
              <TableOfContents content={lesson.content} />
            </div>
          </aside>
        </div>
      )}

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
      <nav
        aria-label="Lesson navigation"
        className="flex flex-col gap-4 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800"
      >
        <div>
          {lesson.prevLesson && (
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link
                href={`/lessons/${lesson.prevLesson.slug}`}
                aria-label={`Previous lesson: ${lesson.prevLesson.title}`}
              >
                <span aria-hidden="true">← </span>
                <span className="hidden sm:inline">{lesson.prevLesson.title}</span>
                <span className="sm:hidden">Previous</span>
              </Link>
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
          {!lesson.completed && (
            <Button
              onClick={handleComplete}
              disabled={isCompleting}
              aria-label="Mark this lesson as complete"
              className="w-full sm:w-auto"
            >
              {isCompleting ? "Saving..." : "Mark Complete"}
            </Button>
          )}
          {lesson.nextLesson && (
            <Button asChild className="w-full sm:w-auto">
              <Link
                href={`/lessons/${lesson.nextLesson.slug}`}
                aria-label={`Next lesson: ${lesson.nextLesson.title}`}
              >
                <span className="hidden sm:inline">{lesson.nextLesson.title}</span>
                <span className="sm:hidden">Next</span>
                <span aria-hidden="true"> →</span>
              </Link>
            </Button>
          )}
          {!lesson.nextLesson && lesson.path && (
            <Button asChild className="w-full sm:w-auto">
              <Link href={`/paths/${lesson.path.slug}`} aria-label="Return to learning path">
                Back to Path
              </Link>
            </Button>
          )}
        </div>
      </nav>
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
