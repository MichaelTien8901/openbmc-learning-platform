import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Prisma } from "@/generated/prisma";

// GET /api/admin/versions/[id] - Get a specific version with content
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const version = await prisma.contentVersion.findUnique({
      where: { id },
    });

    if (!version) {
      return NextResponse.json({ success: false, error: "Version not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: version.id,
        entityType: version.entityType,
        entityId: version.entityId,
        version: version.version,
        content: version.content,
        changedBy: version.changedBy,
        createdAt: version.createdAt,
      },
    });
  } catch (error) {
    console.error("Get version error:", error);
    return NextResponse.json({ success: false, error: "Failed to get version" }, { status: 500 });
  }
}

// POST /api/admin/versions/[id]/restore - Restore a version
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const version = await prisma.contentVersion.findUnique({
      where: { id },
    });

    if (!version) {
      return NextResponse.json({ success: false, error: "Version not found" }, { status: 404 });
    }

    const content = version.content as Prisma.JsonObject;

    // Restore based on entity type
    if (version.entityType === "lesson") {
      // Create a new version before restoring
      const currentLesson = await prisma.lesson.findUnique({
        where: { id: version.entityId },
      });

      if (!currentLesson) {
        return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
      }

      // Get latest version number
      const latestVersion = await prisma.contentVersion.findFirst({
        where: {
          entityType: "lesson",
          entityId: version.entityId,
        },
        orderBy: { version: "desc" },
      });

      const newVersionNum = (latestVersion?.version || 0) + 1;

      // Save current state as new version
      await prisma.contentVersion.create({
        data: {
          entityType: "lesson",
          entityId: version.entityId,
          version: newVersionNum,
          content: {
            title: currentLesson.title,
            slug: currentLesson.slug,
            description: currentLesson.description,
            content: currentLesson.content,
            difficulty: currentLesson.difficulty,
            estimatedMinutes: currentLesson.estimatedMinutes,
          },
          changedBy: session.id,
        },
      });

      // Restore lesson from version
      await prisma.lesson.update({
        where: { id: version.entityId },
        data: {
          title: content.title as string,
          slug: content.slug as string,
          description: content.description as string | null,
          content: content.content as string,
          difficulty: content.difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
          estimatedMinutes: content.estimatedMinutes as number,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Restored lesson to version ${version.version}. Current state saved as version ${newVersionNum}.`,
      });
    }

    if (version.entityType === "path") {
      const currentPath = await prisma.learningPath.findUnique({
        where: { id: version.entityId },
      });

      if (!currentPath) {
        return NextResponse.json({ success: false, error: "Path not found" }, { status: 404 });
      }

      // Get latest version number
      const latestVersion = await prisma.contentVersion.findFirst({
        where: {
          entityType: "path",
          entityId: version.entityId,
        },
        orderBy: { version: "desc" },
      });

      const newVersionNum = (latestVersion?.version || 0) + 1;

      // Save current state
      await prisma.contentVersion.create({
        data: {
          entityType: "path",
          entityId: version.entityId,
          version: newVersionNum,
          content: {
            title: currentPath.title,
            slug: currentPath.slug,
            description: currentPath.description,
            difficulty: currentPath.difficulty,
            estimatedHours: currentPath.estimatedHours,
          },
          changedBy: session.id,
        },
      });

      // Restore path
      await prisma.learningPath.update({
        where: { id: version.entityId },
        data: {
          title: content.title as string,
          slug: content.slug as string,
          description: content.description as string,
          difficulty: content.difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
          estimatedHours: content.estimatedHours as number,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Restored path to version ${version.version}. Current state saved as version ${newVersionNum}.`,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unknown entity type: ${version.entityType}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Restore version error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to restore version" },
      { status: 500 }
    );
  }
}
