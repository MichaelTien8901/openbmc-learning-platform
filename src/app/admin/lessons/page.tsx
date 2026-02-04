import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminLessonsPage() {
  const lessons = await prisma.lesson.findMany({
    include: {
      pathLessons: {
        include: {
          path: {
            select: { id: true, title: true, slug: true },
          },
        },
        take: 1,
      },
      _count: {
        select: {
          progress: true,
          quizQuestions: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lessons</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your lesson content</p>
        </div>
        <Button asChild>
          <Link href="/admin/lessons/new">Create Lesson</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Lessons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800">
                  <th className="pb-3 text-left font-medium">Title</th>
                  <th className="pb-3 text-left font-medium">Path</th>
                  <th className="pb-3 text-left font-medium">Type</th>
                  <th className="pb-3 text-left font-medium">Difficulty</th>
                  <th className="pb-3 text-left font-medium">Quiz</th>
                  <th className="pb-3 text-left font-medium">Status</th>
                  <th className="pb-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson) => {
                  const path = lesson.pathLessons[0]?.path;
                  return (
                    <tr key={lesson.id} className="border-b dark:border-gray-800">
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{lesson.title}</p>
                          <p className="text-xs text-gray-500">{lesson.slug}</p>
                        </div>
                      </td>
                      <td className="py-3">
                        {path ? (
                          <Link
                            href={`/admin/paths/${path.id}`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {path.title}
                          </Link>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">
                          {lesson.contentType}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            lesson.difficulty === "BEGINNER"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : lesson.difficulty === "INTERMEDIATE"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {lesson.difficulty}
                        </span>
                      </td>
                      <td className="py-3">
                        {lesson._count.quizQuestions > 0 ? (
                          <span className="text-green-600 dark:text-green-400">
                            {lesson._count.quizQuestions} questions
                          </span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            lesson.published
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {lesson.published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/lessons/${lesson.id}`}>Edit</Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/lessons/${lesson.slug}`}>View</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {lessons.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-gray-500">No lessons yet</p>
              <Button asChild className="mt-4">
                <Link href="/admin/lessons/new">Create your first lesson</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
