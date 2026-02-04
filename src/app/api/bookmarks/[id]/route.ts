import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// DELETE /api/bookmarks/[id] - Remove a bookmark
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if bookmark exists and belongs to user
    const bookmark = await prisma.bookmark.findUnique({
      where: { id },
    });

    if (!bookmark) {
      return NextResponse.json({ success: false, error: "Bookmark not found" }, { status: 404 });
    }

    if (bookmark.userId !== session.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await prisma.bookmark.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Bookmark removed" });
  } catch (error) {
    console.error("Delete bookmark error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove bookmark" },
      { status: 500 }
    );
  }
}
