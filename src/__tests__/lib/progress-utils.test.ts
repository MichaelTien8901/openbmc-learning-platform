/**
 * Tests for progress calculation utilities
 */
import {
  calculateStreaks,
  calculatePathProgress,
  calculateAverageQuizScore,
  calculateWeeklyActivity,
  isPathCompleted,
} from "@/lib/progress-utils";

// Helper to create a date at local midnight for a given days offset
function createLocalDate(daysAgo: number, baseDate?: Date): Date {
  const date = baseDate ? new Date(baseDate) : new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(12, 0, 0, 0); // Use noon to avoid timezone edge cases
  return date;
}

describe("Progress Utilities", () => {
  describe("calculateStreaks", () => {
    it("should return 0 for no completions", () => {
      const result = calculateStreaks([]);
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
    });

    it("should calculate current streak for consecutive days including today", () => {
      const today = createLocalDate(0);
      const completions = [
        createLocalDate(0), // today
        createLocalDate(1), // yesterday
        createLocalDate(2), // 2 days ago
      ];

      const result = calculateStreaks(completions, today);
      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(3);
    });

    it("should reset current streak if no completion today", () => {
      const today = createLocalDate(0);
      const completions = [
        createLocalDate(1), // yesterday
        createLocalDate(2), // 2 days ago
        createLocalDate(3), // 3 days ago
      ];

      const result = calculateStreaks(completions, today);
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(3);
    });

    it("should track longest streak separately from current", () => {
      const today = createLocalDate(0);
      const completions = [
        createLocalDate(0), // today
        createLocalDate(1), // yesterday - current streak = 2
        // gap on day 2
        createLocalDate(3),
        createLocalDate(4),
        createLocalDate(5),
        createLocalDate(6), // 4-day streak
      ];

      const result = calculateStreaks(completions, today);
      expect(result.currentStreak).toBe(2);
      expect(result.longestStreak).toBe(4);
    });

    it("should deduplicate completions on the same day", () => {
      const today = createLocalDate(0);
      // Multiple completions at different times on the same day
      const time1 = new Date(today);
      time1.setHours(10, 0, 0, 0);
      const time2 = new Date(today);
      time2.setHours(14, 0, 0, 0);
      const time3 = new Date(today);
      time3.setHours(18, 0, 0, 0);

      const completions = [time1, time2, time3]; // 3 completions on same day = 1 streak day

      const result = calculateStreaks(completions, today);
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
    });
  });

  describe("calculatePathProgress", () => {
    it("should return 0 for empty path", () => {
      const completed = new Set<string>();
      const result = calculatePathProgress(completed, []);

      expect(result.progress).toBe(0);
      expect(result.completedCount).toBe(0);
      expect(result.totalCount).toBe(0);
    });

    it("should return 0 for no completions", () => {
      const completed = new Set<string>();
      const pathLessons = ["lesson-1", "lesson-2", "lesson-3"];
      const result = calculatePathProgress(completed, pathLessons);

      expect(result.progress).toBe(0);
      expect(result.completedCount).toBe(0);
      expect(result.totalCount).toBe(3);
    });

    it("should calculate partial progress", () => {
      const completed = new Set(["lesson-1", "lesson-3"]);
      const pathLessons = ["lesson-1", "lesson-2", "lesson-3"];
      const result = calculatePathProgress(completed, pathLessons);

      expect(result.progress).toBe(67); // 2/3 rounded
      expect(result.completedCount).toBe(2);
      expect(result.totalCount).toBe(3);
    });

    it("should calculate 100% for completed path", () => {
      const completed = new Set(["lesson-1", "lesson-2", "lesson-3"]);
      const pathLessons = ["lesson-1", "lesson-2", "lesson-3"];
      const result = calculatePathProgress(completed, pathLessons);

      expect(result.progress).toBe(100);
      expect(result.completedCount).toBe(3);
      expect(result.totalCount).toBe(3);
    });

    it("should ignore completed lessons not in path", () => {
      const completed = new Set(["lesson-1", "lesson-other"]);
      const pathLessons = ["lesson-1", "lesson-2"];
      const result = calculatePathProgress(completed, pathLessons);

      expect(result.progress).toBe(50);
      expect(result.completedCount).toBe(1);
      expect(result.totalCount).toBe(2);
    });
  });

  describe("calculateAverageQuizScore", () => {
    it("should return null for no scores", () => {
      const result = calculateAverageQuizScore([]);
      expect(result).toBeNull();
    });

    it("should return the score for single score", () => {
      const result = calculateAverageQuizScore([85]);
      expect(result).toBe(85);
    });

    it("should calculate average for multiple scores", () => {
      const result = calculateAverageQuizScore([80, 90, 100]);
      expect(result).toBe(90);
    });

    it("should round to nearest integer", () => {
      const result = calculateAverageQuizScore([70, 80, 85]);
      expect(result).toBe(78); // 235/3 = 78.33, rounds to 78
    });

    it("should handle 0 scores", () => {
      const result = calculateAverageQuizScore([0, 50, 100]);
      expect(result).toBe(50);
    });
  });

  describe("calculateWeeklyActivity", () => {
    it("should return 7 days of activity", () => {
      const result = calculateWeeklyActivity([]);
      expect(result).toHaveLength(7);
    });

    it("should include day names", () => {
      const result = calculateWeeklyActivity([]);
      const dayNames = result.map((d) => d.dayName);
      // All day names should be valid
      dayNames.forEach((name) => {
        expect(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).toContain(name);
      });
    });

    it("should count lessons per day", () => {
      const today = createLocalDate(0);

      // Create times on today
      const todayTime1 = new Date(today);
      todayTime1.setHours(10, 0, 0, 0);
      const todayTime2 = new Date(today);
      todayTime2.setHours(14, 0, 0, 0);

      // Create time on yesterday
      const yesterday = createLocalDate(1);
      yesterday.setHours(10, 0, 0, 0);

      const completions = [
        { completedAt: todayTime1, estimatedMinutes: 20 },
        { completedAt: todayTime2, estimatedMinutes: 30 },
        { completedAt: yesterday, estimatedMinutes: 25 },
      ];

      const result = calculateWeeklyActivity(completions, today);

      // Today (last element)
      const todayActivity = result[result.length - 1];
      expect(todayActivity.lessonsCompleted).toBe(2);
      expect(todayActivity.minutesLearned).toBe(50);

      // Yesterday
      const yesterdayActivity = result[result.length - 2];
      expect(yesterdayActivity.lessonsCompleted).toBe(1);
      expect(yesterdayActivity.minutesLearned).toBe(25);
    });

    it("should use default 15 minutes if not specified", () => {
      const today = createLocalDate(0);
      const todayTime = new Date(today);
      todayTime.setHours(10, 0, 0, 0);

      const completions = [{ completedAt: todayTime }];

      const result = calculateWeeklyActivity(completions, today);
      const todayActivity = result[result.length - 1];

      expect(todayActivity.minutesLearned).toBe(15);
    });

    it("should return 0 for days with no completions", () => {
      const today = createLocalDate(0);
      const todayTime = new Date(today);
      todayTime.setHours(10, 0, 0, 0);

      const completions = [{ completedAt: todayTime, estimatedMinutes: 20 }];

      const result = calculateWeeklyActivity(completions, today);

      // Check a day without completions (2 days ago)
      const twoDaysAgo = result[result.length - 3];
      expect(twoDaysAgo.lessonsCompleted).toBe(0);
      expect(twoDaysAgo.minutesLearned).toBe(0);
    });
  });

  describe("isPathCompleted", () => {
    it("should return false for empty path", () => {
      const completed = new Set(["lesson-1"]);
      const result = isPathCompleted(completed, []);
      expect(result).toBe(false);
    });

    it("should return false for no completions", () => {
      const completed = new Set<string>();
      const result = isPathCompleted(completed, ["lesson-1"]);
      expect(result).toBe(false);
    });

    it("should return false for partial completion", () => {
      const completed = new Set(["lesson-1"]);
      const result = isPathCompleted(completed, ["lesson-1", "lesson-2"]);
      expect(result).toBe(false);
    });

    it("should return true when all lessons completed", () => {
      const completed = new Set(["lesson-1", "lesson-2", "lesson-3"]);
      const result = isPathCompleted(completed, ["lesson-1", "lesson-2"]);
      expect(result).toBe(true);
    });

    it("should return true for exact match", () => {
      const completed = new Set(["lesson-1", "lesson-2"]);
      const result = isPathCompleted(completed, ["lesson-1", "lesson-2"]);
      expect(result).toBe(true);
    });
  });
});
