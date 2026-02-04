import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { discoverLessons, toLessonCreateInput, DEFAULT_CONFIG } from "@/lib/github";

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  categories: string[];
}

/**
 * POST /api/admin/sync-github
 *
 * Sync lessons from openbmc-guide-tutorial GitHub repository.
 * Discovers all markdown files and creates/updates lessons.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { dryRun = false, overwrite = false } = body;

    const result: SyncResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      categories: [],
    };

    // Discover lessons from GitHub
    const categories = await discoverLessons(DEFAULT_CONFIG);

    for (const category of categories) {
      result.categories.push(category.slug);

      for (const lesson of category.lessons) {
        try {
          // Check if lesson exists
          const existing = await prisma.lesson.findUnique({
            where: { slug: lesson.slug },
          });

          if (existing) {
            if (overwrite) {
              if (!dryRun) {
                await prisma.lesson.update({
                  where: { slug: lesson.slug },
                  data: {
                    title: lesson.title,
                    description: lesson.description,
                    sourceUrl: lesson.sourceUrl,
                    repositoryPath: lesson.repositoryPath,
                    displayMode: "RENDER",
                    difficulty: lesson.difficulty,
                    estimatedMinutes: lesson.estimatedMinutes,
                  },
                });
              }
              result.updated++;
            } else {
              result.skipped++;
            }
          } else {
            if (!dryRun) {
              await prisma.lesson.create({
                data: toLessonCreateInput(lesson),
              });
            }
            result.created++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          result.errors.push(`${lesson.slug}: ${errorMessage}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: dryRun
        ? `Dry run complete. Would create ${result.created}, update ${result.updated}, skip ${result.skipped} lessons.`
        : `Sync complete. Created ${result.created}, updated ${result.updated}, skipped ${result.skipped} lessons.`,
    });
  } catch (error) {
    console.error("GitHub sync error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync from GitHub",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/sync-github
 *
 * Preview what would be synced without making changes.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    // Discover lessons from GitHub
    const categories = await discoverLessons(DEFAULT_CONFIG);

    // Get existing lesson slugs
    const existingLessons = await prisma.lesson.findMany({
      select: { slug: true },
    });
    const existingSlugs = new Set(existingLessons.map((l) => l.slug));

    const preview = categories.map((category) => ({
      category: category.slug,
      title: category.title,
      lessons: category.lessons.map((lesson) => ({
        slug: lesson.slug,
        title: lesson.title,
        sourceUrl: lesson.sourceUrl,
        exists: existingSlugs.has(lesson.slug),
      })),
    }));

    const totalLessons = categories.reduce((acc, c) => acc + c.lessons.length, 0);
    const newLessons = categories.reduce(
      (acc, c) => acc + c.lessons.filter((l) => !existingSlugs.has(l.slug)).length,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        categories: preview,
        summary: {
          totalCategories: categories.length,
          totalLessons,
          newLessons,
          existingLessons: totalLessons - newLessons,
        },
        config: {
          owner: DEFAULT_CONFIG.owner,
          repo: DEFAULT_CONFIG.repo,
          pagesBaseUrl: DEFAULT_CONFIG.pagesBaseUrl,
        },
      },
    });
  } catch (error) {
    console.error("GitHub preview error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to preview GitHub content",
      },
      { status: 500 }
    );
  }
}
