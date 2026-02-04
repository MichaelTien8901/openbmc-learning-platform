/**
 * Progress calculation utilities
 * Pure functions for calculating user progress metrics
 */

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
}

/**
 * Calculate learning streaks based on completion dates
 * @param completionDates - Array of date strings when lessons were completed
 * @param today - Current date (optional, for testing)
 * @param maxDaysToCheck - Maximum days to check back (default 30)
 */
export function calculateStreaks(
  completionDates: Date[],
  today: Date = new Date(),
  maxDaysToCheck: number = 30
): StreakResult {
  // Normalize dates to UTC date strings (YYYY-MM-DD) to avoid timezone issues
  const normalizeDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get unique date strings
  const uniqueDateStrings = new Set(completionDates.map((d) => normalizeDate(d)));

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let streakBroken = false;

  for (let i = 0; i < maxDaysToCheck; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = normalizeDate(checkDate);

    if (uniqueDateStrings.has(dateStr)) {
      tempStreak++;
      // Current streak is the ongoing streak from today/yesterday
      if (!streakBroken) {
        currentStreak = tempStreak;
      }
    } else {
      if (tempStreak > 0) {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
      }
      // Streak is only "broken" if we miss a day after having completions,
      // or if today has no completion
      if (i === 0 || currentStreak > 0) {
        streakBroken = true;
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}

/**
 * Calculate path progress percentage
 * @param completedLessonIds - Set of completed lesson IDs
 * @param pathLessonIds - Array of lesson IDs in the path
 */
export function calculatePathProgress(
  completedLessonIds: Set<string>,
  pathLessonIds: string[]
): { progress: number; completedCount: number; totalCount: number } {
  const totalCount = pathLessonIds.length;
  const completedCount = pathLessonIds.filter((id) => completedLessonIds.has(id)).length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return { progress, completedCount, totalCount };
}

/**
 * Calculate average quiz score
 * @param scores - Array of quiz scores (0-100)
 */
export function calculateAverageQuizScore(scores: number[]): number | null {
  if (scores.length === 0) {
    return null;
  }
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round(sum / scores.length);
}

export interface DailyActivity {
  date: string;
  dayName: string;
  lessonsCompleted: number;
  minutesLearned: number;
}

interface LessonCompletion {
  completedAt: Date;
  estimatedMinutes?: number;
}

/**
 * Calculate weekly activity data
 * @param completions - Array of lesson completions with dates
 * @param today - Current date (optional, for testing)
 * @param daysCount - Number of days to include (default 7)
 */
export function calculateWeeklyActivity(
  completions: LessonCompletion[],
  today: Date = new Date(),
  daysCount: number = 7
): DailyActivity[] {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const activity: DailyActivity[] = [];

  // Normalize date to YYYY-MM-DD string
  const normalizeDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  for (let i = daysCount - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = normalizeDate(date);

    const dayCompletions = completions.filter((c) => {
      const completionDateStr = normalizeDate(new Date(c.completedAt));
      return completionDateStr === dateStr;
    });

    const minutesLearned = dayCompletions.reduce((sum, c) => {
      return sum + (c.estimatedMinutes || 15); // Default 15 minutes per lesson
    }, 0);

    activity.push({
      date: dateStr,
      dayName: dayNames[date.getDay()],
      lessonsCompleted: dayCompletions.length,
      minutesLearned,
    });
  }

  return activity;
}

/**
 * Check if a path is fully completed
 * @param completedLessonIds - Set of completed lesson IDs
 * @param pathLessonIds - Array of lesson IDs in the path
 */
export function isPathCompleted(completedLessonIds: Set<string>, pathLessonIds: string[]): boolean {
  if (pathLessonIds.length === 0) {
    return false;
  }
  return pathLessonIds.every((id) => completedLessonIds.has(id));
}
