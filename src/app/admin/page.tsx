import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitHubSyncPanel } from "@/components/admin/github-sync-panel";

export default async function AdminDashboardPage() {
  const [pathCount, lessonCount, userCount, enrollmentCount] = await Promise.all([
    prisma.learningPath.count(),
    prisma.lesson.count(),
    prisma.user.count(),
    prisma.pathEnrollment.count(),
  ]);

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage content and view platform statistics
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Learning Paths</CardDescription>
            <CardTitle className="text-3xl">{pathCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="link" className="px-0">
              <Link href="/admin/paths">Manage Paths →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lessons</CardDescription>
            <CardTitle className="text-3xl">{lessonCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="link" className="px-0">
              <Link href="/admin/lessons">Manage Lessons →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Users</CardDescription>
            <CardTitle className="text-3xl">{userCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enrollments</CardDescription>
            <CardTitle className="text-3xl">{enrollmentCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Total path enrollments</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button asChild>
            <Link href="/admin/paths/new">Create Path</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/lessons/new">Create Lesson</Link>
          </Button>
        </CardContent>
      </Card>

      {/* GitHub Content Sync */}
      <GitHubSyncPanel />

      {/* Recent Users */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
          <CardDescription>Latest registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800">
                  <th className="pb-3 text-left font-medium">Email</th>
                  <th className="pb-3 text-left font-medium">Name</th>
                  <th className="pb-3 text-left font-medium">Role</th>
                  <th className="pb-3 text-left font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user.id} className="border-b dark:border-gray-800">
                    <td className="py-3">{user.email}</td>
                    <td className="py-3">{user.displayName || "-"}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          user.role === "ADMIN"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                            : user.role === "EDITOR"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
