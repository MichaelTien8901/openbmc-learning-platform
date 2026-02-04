import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/notes/export - Export all notes as markdown
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const notes = await prisma.note.findMany({
      where: { userId: session.id },
      include: {
        lesson: {
          select: {
            title: true,
            slug: true,
            pathLessons: {
              include: {
                path: {
                  select: { title: true },
                },
              },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ lesson: { title: "asc" } }, { updatedAt: "desc" }],
    });

    // Generate markdown
    let markdown = `# My Learning Notes\n\n`;
    markdown += `Exported on ${new Date().toLocaleDateString()}\n\n`;
    markdown += `---\n\n`;

    // Group notes by path
    const notesByPath = new Map<string, typeof notes>();

    for (const note of notes) {
      const pathTitle = note.lesson.pathLessons[0]?.path.title || "Uncategorized";
      if (!notesByPath.has(pathTitle)) {
        notesByPath.set(pathTitle, []);
      }
      notesByPath.get(pathTitle)!.push(note);
    }

    for (const [pathTitle, pathNotes] of notesByPath) {
      markdown += `## ${pathTitle}\n\n`;

      for (const note of pathNotes) {
        markdown += `### ${note.lesson.title}\n\n`;
        markdown += `${note.content}\n\n`;
        markdown += `*Last updated: ${new Date(note.updatedAt).toLocaleString()}*\n\n`;
        markdown += `---\n\n`;
      }
    }

    // Return as downloadable markdown file
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown",
        "Content-Disposition": `attachment; filename="learning-notes-${new Date().toISOString().split("T")[0]}.md"`,
      },
    });
  } catch (error) {
    console.error("Export notes error:", error);
    return NextResponse.json({ success: false, error: "Failed to export notes" }, { status: 500 });
  }
}
