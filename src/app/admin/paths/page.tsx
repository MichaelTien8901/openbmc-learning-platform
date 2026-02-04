import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminPathsPage() {
  const paths = await prisma.learningPath.findMany({
    include: {
      lessons: {
        select: { id: true },
      },
      enrollments: {
        select: { id: true },
      },
    },
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Learning Paths</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your learning paths</p>
        </div>
        <Button asChild>
          <Link href="/admin/paths/new">Create Path</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Paths</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800">
                  <th className="pb-3 text-left font-medium">Title</th>
                  <th className="pb-3 text-left font-medium">Difficulty</th>
                  <th className="pb-3 text-left font-medium">Lessons</th>
                  <th className="pb-3 text-left font-medium">Enrollments</th>
                  <th className="pb-3 text-left font-medium">Status</th>
                  <th className="pb-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paths.map((path) => (
                  <tr key={path.id} className="border-b dark:border-gray-800">
                    <td className="py-3">
                      <div>
                        <p className="font-medium">{path.title}</p>
                        <p className="text-xs text-gray-500">{path.slug}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          path.difficulty === "BEGINNER"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : path.difficulty === "INTERMEDIATE"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {path.difficulty}
                      </span>
                    </td>
                    <td className="py-3">{path.lessons.length}</td>
                    <td className="py-3">{path.enrollments.length}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          path.published
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {path.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/paths/${path.id}`}>Edit</Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/paths/${path.slug}`}>View</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {paths.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-gray-500">No learning paths yet</p>
              <Button asChild className="mt-4">
                <Link href="/admin/paths/new">Create your first path</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
