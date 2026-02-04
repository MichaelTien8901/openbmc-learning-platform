"use client";

interface WeeklyActivity {
  date: string;
  dayName: string;
  lessonsCompleted: number;
  minutesLearned: number;
}

interface WeeklyActivityChartProps {
  data: WeeklyActivity[];
}

export function WeeklyActivityChart({ data }: WeeklyActivityChartProps) {
  const maxMinutes = Math.max(...data.map((d) => d.minutesLearned), 60);
  const totalLessons = data.reduce((sum, d) => sum + d.lessonsCompleted, 0);
  const totalMinutes = data.reduce((sum, d) => sum + d.minutesLearned, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-6 text-sm">
        <div>
          <span className="text-gray-500">This week: </span>
          <span className="font-medium">{totalLessons} lessons</span>
        </div>
        <div>
          <span className="text-gray-500">Time spent: </span>
          <span className="font-medium">
            {totalMinutes >= 60
              ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
              : `${totalMinutes}m`}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end justify-between gap-2">
        {data.map((day) => {
          const height = maxMinutes > 0 ? (day.minutesLearned / maxMinutes) * 100 : 0;
          const isToday = day.date === new Date().toISOString().split("T")[0];

          return (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
              {/* Bar */}
              <div className="relative h-32 w-full">
                <div
                  className={`absolute bottom-0 w-full rounded-t transition-all ${
                    day.lessonsCompleted > 0
                      ? "bg-blue-500 dark:bg-blue-600"
                      : "bg-gray-200 dark:bg-gray-700"
                  } ${isToday ? "ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-900" : ""}`}
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${day.lessonsCompleted} lessons, ${day.minutesLearned} minutes`}
                >
                  {day.lessonsCompleted > 0 && (
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-600 dark:text-gray-400">
                      {day.lessonsCompleted}
                    </span>
                  )}
                </div>
              </div>

              {/* Day label */}
              <span
                className={`text-xs ${
                  isToday ? "font-semibold text-blue-600 dark:text-blue-400" : "text-gray-500"
                }`}
              >
                {day.dayName}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-gray-200 dark:bg-gray-700" />
          <span>No activity</span>
        </div>
      </div>
    </div>
  );
}
