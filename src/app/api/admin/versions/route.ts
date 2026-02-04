import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/admin/versions - List content versions
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    const where: { entityType?: string; entityId?: string } = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const versions = await prisma.contentVersion.findMany({
      where,
      orderBy: [{ entityType: "asc" }, { entityId: "asc" }, { version: "desc" }],
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: versions.map((v) => ({
        id: v.id,
        entityType: v.entityType,
        entityId: v.entityId,
        version: v.version,
        changedBy: v.changedBy,
        createdAt: v.createdAt,
        // Don't include full content in list - too large
        hasContent: !!v.content,
      })),
    });
  } catch (error) {
    console.error("List versions error:", error);
    return NextResponse.json({ success: false, error: "Failed to list versions" }, { status: 500 });
  }
}
