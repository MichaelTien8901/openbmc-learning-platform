import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SuggestedPaths } from "@/components/paths/suggested-paths";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  // Fetch user's progress stats
  const [enrollments, completedLessonsCount, quizAttempts, userProgress] = await Promise.all([
    prisma.pathEnrollment.findMany({
      where: { userId: user.id },
      include: {
        path: {
          select: {
            id: true,
            slug: true,
            title: true,
            lessons: {
              select: {
                lessonId: true,
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    }),
    prisma.userProgress.count({
      where: { userId: user.id, completedAt: { not: null } },
    }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id },
      select: { score: true },
    }),
    prisma.userProgress.findMany({
      where: { userId: user.id, status: "COMPLETED" },
      select: { lessonId: true },
    }),
  ]);

  // Build a set of completed lesson IDs
  const completedLessonIds = new Set(userProgress.map((p) => p.lessonId));

  // Calculate progress for each enrollment
  const enrollmentsWithProgress = enrollments.map((enrollment) => {
    const pathLessonIds = enrollment.path.lessons.map((l) => l.lessonId);
    const completedInPath = pathLessonIds.filter((id) => completedLessonIds.has(id)).length;
    const progress =
      pathLessonIds.length > 0 ? Math.round((completedInPath / pathLessonIds.length) * 100) : 0;
    return { ...enrollment, progress };
  });

  // Calculate average quiz score
  const avgQuizScore =
    quizAttempts.length > 0
      ? Math.round(
          quizAttempts.reduce((sum: number, r: { score: number }) => sum + r.score, 0) /
            quizAttempts.length
        )
      : null;

  // Find in-progress paths (enrolled but not completed)
  const inProgressPaths = enrollmentsWithProgress.filter((e) => !e.completedAt);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back{user.displayName ? `, ${user.displayName}` : ""}!
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Continue your OpenBMC learning journey
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Continue Learning</CardTitle>
            <CardDescription>Pick up where you left off</CardDescription>
          </CardHeader>
          <CardContent>
            {inProgressPaths.length > 0 ? (
              <ul className="space-y-3">
                {inProgressPaths.slice(0, 3).map((enrollment) => (
                  <li key={enrollment.id}>
                    <Link
                      href={`/paths/${enrollment.path.slug}`}
                      className="block rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {enrollment.path.title}
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${enrollment.progress}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {enrollment.progress}% complete
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No lessons in progress. Start a learning path to begin!
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
            <CardDescription>Track your achievements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Lessons Completed</span>
                <span className="font-medium">{completedLessonsCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Paths Enrolled</span>
                <span className="font-medium">{enrollmentsWithProgress.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Paths Completed</span>
                <span className="font-medium">
                  {enrollmentsWithProgress.filter((e) => e.completedAt).length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Quiz Score Avg</span>
                <span className="font-medium">
                  {avgQuizScore !== null ? `${avgQuizScore}%` : "-"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump to common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Link
                href="/paths"
                className="rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
              >
                Browse Learning Paths
              </Link>
              <Link
                href="/bookmarks"
                className="rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                View Bookmarks
              </Link>
              <Link
                href="/notes"
                className="rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                My Notes
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suggested Next Paths */}
      <SuggestedPaths />
    </div>
  );
}
