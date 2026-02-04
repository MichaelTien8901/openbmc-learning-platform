import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const lesson = await prisma.lesson.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        published: true,
      },
      include: {
        pathLessons: {
          include: {
            path: {
              include: {
                lessons: {
                  select: { lessonId: true },
                },
                enrollments: {
                  where: { userId: session.id },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
    }

    // Update or create progress
    await prisma.userProgress.upsert({
      where: {
        userId_lessonId: {
          userId: session.id,
          lessonId: lesson.id,
        },
      },
      update: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
      create: {
        userId: session.id,
        lessonId: lesson.id,
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // Check if path is now complete
    for (const pathLesson of lesson.pathLessons) {
      const enrollment = pathLesson.path.enrollments[0];
      if (enrollment && !enrollment.completedAt) {
        const pathLessonIds = pathLesson.path.lessons.map((pl) => pl.lessonId);

        const completedLessons = await prisma.userProgress.count({
          where: {
            userId: session.id,
            lessonId: { in: pathLessonIds },
            status: "COMPLETED",
          },
        });

        if (completedLessons === pathLessonIds.length) {
          // Mark path as complete
          await prisma.pathEnrollment.update({
            where: { id: enrollment.id },
            data: { completedAt: new Date() },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Lesson marked as complete",
    });
  } catch (error) {
    console.error("Complete lesson error:", error);
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 });
  }
}
