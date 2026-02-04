"use client";

import Link from "next/link";

interface PathLesson {
  slug: string;
  title: string;
  completed: boolean;
  current: boolean;
}

interface PathProgressBarProps {
  pathTitle: string;
  pathSlug: string;
  lessons: PathLesson[];
  currentLessonIndex: number;
}

export function PathProgressBar({
  pathTitle,
  pathSlug,
  lessons,
  currentLessonIndex,
}: PathProgressBarProps) {
  const completedCount = lessons.filter((l) => l.completed).length;
  const progressPercent = Math.round((completedCount / lessons.length) * 100);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
      {/* Path Title and Progress */}
      <div className="mb-3 flex items-center justify-between">
        <Link
          href={`/paths/${pathSlug}`}
          className="font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
        >
          {pathTitle}
        </Link>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {completedCount}/{lessons.length} lessons ({progressPercent}%)
        </span>
      </div>

      {/* Visual Progress Bar */}
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-green-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Lesson Dots */}
      <div className="flex items-center gap-1">
        {lessons.map((lesson, index) => (
          <Link
            key={lesson.slug}
            href={`/lessons/${lesson.slug}`}
            className={`group relative flex-1 ${
              lessons.length > 10 ? "min-w-[8px]" : "min-w-[16px]"
            }`}
            title={lesson.title}
          >
            <div
              className={`h-2 rounded-sm transition-all ${
                index === currentLessonIndex
                  ? "bg-blue-600 ring-2 ring-blue-300 dark:ring-blue-800"
                  : lesson.completed
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500"
              }`}
            />

            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform opacity-0 transition-opacity group-hover:opacity-100">
              <div className="rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white dark:bg-gray-700">
                {lesson.title}
                {lesson.completed && " ✓"}
              </div>
              <div className="mx-auto h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-gray-900 dark:border-t-gray-700" />
            </div>
          </Link>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-sm bg-green-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-sm bg-blue-600" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-sm bg-gray-300 dark:bg-gray-600" />
          <span>Not started</span>
        </div>
      </div>
    </div>
  );
}
