import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { position } = body;

    if (typeof position !== "number" || position < 0) {
      return NextResponse.json({ success: false, error: "Invalid position" }, { status: 400 });
    }

    // Find lesson by slug or id
    const lesson = await prisma.lesson.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!lesson) {
      return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
    }

    // Update or create progress record with position
    await prisma.userProgress.upsert({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId: lesson.id,
        },
      },
      update: {
        lastPosition: position,
      },
      create: {
        userId: user.id,
        lessonId: lesson.id,
        lastPosition: position,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving position:", error);
    return NextResponse.json({ success: false, error: "Failed to save position" }, { status: 500 });
  }
}
