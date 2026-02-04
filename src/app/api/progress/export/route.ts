import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/progress/export - Export user's progress data
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    // Fetch comprehensive progress data
    const [completedProgress, enrollments, quizAttempts, bookmarks, notes] = await Promise.all([
      prisma.userProgress.findMany({
        where: { userId: session.id, status: "COMPLETED" },
        include: {
          lesson: {
            select: {
              id: true,
              slug: true,
              title: true,
              difficulty: true,
              estimatedMinutes: true,
            },
          },
        },
        orderBy: { completedAt: "desc" },
      }),
      prisma.pathEnrollment.findMany({
        where: { userId: session.id },
        include: {
          path: {
            select: {
              id: true,
              slug: true,
              title: true,
              difficulty: true,
              estimatedHours: true,
              lessons: {
                select: { lessonId: true },
              },
            },
          },
        },
      }),
      prisma.quizAttempt.findMany({
        where: { userId: session.id },
        include: {
          lesson: {
            select: { id: true, title: true },
          },
        },
        orderBy: { startedAt: "desc" },
      }),
      prisma.bookmark.findMany({
        where: { userId: session.id },
        include: {
          lesson: {
            select: { id: true, slug: true, title: true },
          },
        },
      }),
      prisma.note.findMany({
        where: { userId: session.id },
        include: {
          lesson: {
            select: { id: true, slug: true, title: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    // Calculate progress for each path
    const completedLessonIds = new Set(completedProgress.map((p) => p.lessonId));
    const pathsWithProgress = enrollments.map((enrollment) => {
      const pathLessonIds = enrollment.path.lessons.map((pl) => pl.lessonId);
      const completedInPath = pathLessonIds.filter((id) => completedLessonIds.has(id)).length;

      return {
        id: enrollment.path.id,
        slug: enrollment.path.slug,
        title: enrollment.path.title,
        difficulty: enrollment.path.difficulty,
        estimatedHours: enrollment.path.estimatedHours,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        progress:
          pathLessonIds.length > 0 ? Math.round((completedInPath / pathLessonIds.length) * 100) : 0,
        lessonsCompleted: completedInPath,
        totalLessons: pathLessonIds.length,
      };
    });

    // Calculate stats
    const totalMinutesLearned = completedProgress.reduce(
      (sum, p) => sum + (p.lesson.estimatedMinutes || 15),
      0
    );
    const avgQuizScore =
      quizAttempts.length > 0
        ? Math.round(quizAttempts.reduce((sum, q) => sum + q.score, 0) / quizAttempts.length)
        : null;

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        email: session.email,
        displayName: session.displayName,
      },
      summary: {
        lessonsCompleted: completedProgress.length,
        pathsEnrolled: enrollments.length,
        pathsCompleted: enrollments.filter((e) => e.completedAt).length,
        totalMinutesLearned,
        quizzesTaken: quizAttempts.length,
        averageQuizScore: avgQuizScore,
        bookmarksCount: bookmarks.length,
        notesCount: notes.length,
      },
      paths: pathsWithProgress,
      completedLessons: completedProgress.map((p) => ({
        id: p.lesson.id,
        slug: p.lesson.slug,
        title: p.lesson.title,
        difficulty: p.lesson.difficulty,
        estimatedMinutes: p.lesson.estimatedMinutes,
        completedAt: p.completedAt,
      })),
      quizAttempts: quizAttempts.map((q) => ({
        lessonId: q.lesson.id,
        lessonTitle: q.lesson.title,
        score: q.score,
        totalQuestions: q.totalQuestions,
        correctAnswers: q.correctAnswers,
        startedAt: q.startedAt,
        completedAt: q.completedAt,
      })),
      bookmarks: bookmarks.map((b) => ({
        lessonId: b.lesson.id,
        lessonSlug: b.lesson.slug,
        lessonTitle: b.lesson.title,
        note: b.note,
        createdAt: b.createdAt,
      })),
      notes: notes.map((n) => ({
        lessonId: n.lesson.id,
        lessonSlug: n.lesson.slug,
        lessonTitle: n.lesson.title,
        content: n.content,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
    };

    if (format === "markdown") {
      // Generate markdown report
      const markdown = generateMarkdownReport(exportData);
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="openbmc-progress-${new Date().toISOString().split("T")[0]}.md"`,
        },
      });
    }

    // Default: JSON format
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="openbmc-progress-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export progress error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export progress" },
      { status: 500 }
    );
  }
}

interface ExportData {
  exportedAt: string;
  user: { email: string; displayName: string | null };
  summary: {
    lessonsCompleted: number;
    pathsEnrolled: number;
    pathsCompleted: number;
    totalMinutesLearned: number;
    quizzesTaken: number;
    averageQuizScore: number | null;
    bookmarksCount: number;
    notesCount: number;
  };
  paths: Array<{
    title: string;
    difficulty: string;
    progress: number;
    lessonsCompleted: number;
    totalLessons: number;
    enrolledAt: Date;
    completedAt: Date | null;
  }>;
  completedLessons: Array<{
    title: string;
    difficulty: string;
    completedAt: Date | null;
  }>;
  quizAttempts: Array<{
    lessonTitle: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    completedAt: Date | null;
  }>;
  notes: Array<{
    lessonTitle: string;
    content: string;
  }>;
}

function generateMarkdownReport(data: ExportData): string {
  const lines: string[] = [];

  lines.push("# OpenBMC Learning Progress Report");
  lines.push("");
  lines.push(`**Generated:** ${new Date(data.exportedAt).toLocaleString()}`);
  lines.push(`**User:** ${data.user.displayName || data.user.email}`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Lessons Completed:** ${data.summary.lessonsCompleted}`);
  lines.push(`- **Paths Enrolled:** ${data.summary.pathsEnrolled}`);
  lines.push(`- **Paths Completed:** ${data.summary.pathsCompleted}`);
  lines.push(
    `- **Total Learning Time:** ${Math.floor(data.summary.totalMinutesLearned / 60)}h ${data.summary.totalMinutesLearned % 60}m`
  );
  lines.push(`- **Quizzes Taken:** ${data.summary.quizzesTaken}`);
  if (data.summary.averageQuizScore !== null) {
    lines.push(`- **Average Quiz Score:** ${data.summary.averageQuizScore}%`);
  }
  lines.push("");

  // Learning Paths
  if (data.paths.length > 0) {
    lines.push("## Learning Paths");
    lines.push("");
    for (const path of data.paths) {
      const status = path.completedAt ? "Completed" : `${path.progress}% complete`;
      lines.push(`### ${path.title}`);
      lines.push("");
      lines.push(`- **Difficulty:** ${path.difficulty}`);
      lines.push(`- **Progress:** ${status}`);
      lines.push(`- **Lessons:** ${path.lessonsCompleted}/${path.totalLessons}`);
      lines.push(`- **Enrolled:** ${new Date(path.enrolledAt).toLocaleDateString()}`);
      if (path.completedAt) {
        lines.push(`- **Completed:** ${new Date(path.completedAt).toLocaleDateString()}`);
      }
      lines.push("");
    }
  }

  // Completed Lessons
  if (data.completedLessons.length > 0) {
    lines.push("## Completed Lessons");
    lines.push("");
    for (const lesson of data.completedLessons) {
      const completedDate = lesson.completedAt
        ? new Date(lesson.completedAt).toLocaleDateString()
        : "Unknown";
      lines.push(`- **${lesson.title}** (${lesson.difficulty}) - ${completedDate}`);
    }
    lines.push("");
  }

  // Quiz Results
  if (data.quizAttempts.length > 0) {
    lines.push("## Quiz Results");
    lines.push("");
    lines.push("| Lesson | Score | Questions | Date |");
    lines.push("|--------|-------|-----------|------|");
    for (const quiz of data.quizAttempts) {
      const date = quiz.completedAt
        ? new Date(quiz.completedAt).toLocaleDateString()
        : "In progress";
      lines.push(
        `| ${quiz.lessonTitle} | ${quiz.score.toFixed(0)}% | ${quiz.correctAnswers}/${quiz.totalQuestions} | ${date} |`
      );
    }
    lines.push("");
  }

  // Notes
  if (data.notes.length > 0) {
    lines.push("## Your Notes");
    lines.push("");
    for (const note of data.notes) {
      lines.push(`### ${note.lessonTitle}`);
      lines.push("");
      lines.push(note.content);
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("*Exported from OpenBMC Learning Platform*");

  return lines.join("\n");
}
