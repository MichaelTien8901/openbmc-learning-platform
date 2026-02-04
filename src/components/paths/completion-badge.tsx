"use client";

interface CompletionBadgeProps {
  completedAt: Date | string | null;
  progress: number;
  size?: "sm" | "md" | "lg";
}

export function CompletionBadge({ completedAt, progress, size = "md" }: CompletionBadgeProps) {
  const isComplete = !!completedAt;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-2",
  };

  if (isComplete) {
    return (
      <div
        className={`inline-flex items-center gap-1 rounded-full bg-green-100 font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400 ${sizeClasses[size]}`}
      >
        <span>🏆</span>
        <span>Completed</span>
      </div>
    );
  }

  if (progress > 0) {
    return (
      <div
        className={`inline-flex items-center gap-1 rounded-full bg-blue-100 font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 ${sizeClasses[size]}`}
      >
        <span>{progress}%</span>
        <span>Complete</span>
      </div>
    );
  }

  return null;
}
