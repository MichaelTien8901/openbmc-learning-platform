#!/usr/bin/env tsx
/**
 * Learning Path Sequence Creator
 *
 * Creates optimized learning path sequences based on content analysis,
 * prerequisite detection, and difficulty progression.
 *
 * Usage:
 *   npx tsx scripts/import/create-sequences.ts [options]
 *
 * Options:
 *   --path-id <id>      Optimize sequence for specific path
 *   --all               Optimize sequences for all paths
 *   --dry-run           Preview changes without saving
 *   --analyze           Only analyze, don't reorder
 */

import { PrismaClient } from "@/generated/prisma";

// Types
interface LessonAnalysis {
  id: string;
  title: string;
  slug: string;
  currentOrder: number;
  suggestedOrder: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  prerequisites: string[];
  dependents: string[];
  keyTopics: string[];
  estimatedMinutes: number;
}

interface PathAnalysis {
  pathId: string;
  pathTitle: string;
  lessons: LessonAnalysis[];
  suggestedSequence: string[];
  reorderNeeded: boolean;
  issues: string[];
}

interface SequenceOptions {
  pathId?: string;
  all: boolean;
  dryRun: boolean;
  analyzeOnly: boolean;
}

// Prisma client
let prisma: PrismaClient;

// Difficulty keywords for classification
const DIFFICULTY_PATTERNS = {
  EASY: [
    /^introduction/i,
    /^getting.?started/i,
    /^basics/i,
    /^overview/i,
    /^what.?is/i,
    /^setup/i,
    /^install/i,
    /quick.?start/i,
  ],
  HARD: [
    /advanced/i,
    /internal/i,
    /architecture/i,
    /deep.?dive/i,
    /optimization/i,
    /performance/i,
    /debugging/i,
    /troubleshoot/i,
    /security/i,
    /production/i,
  ],
};

/**
 * Parse command line arguments
 */
function parseArgs(): SequenceOptions {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Learning Path Sequence Creator

Usage:
  npx tsx scripts/import/create-sequences.ts [options]

Options:
  --path-id <id>      Optimize sequence for specific path
  --all               Optimize sequences for all paths
  --dry-run           Preview changes without saving
  --analyze           Only analyze, don't reorder

Examples:
  npx tsx scripts/import/create-sequences.ts --all --dry-run
  npx tsx scripts/import/create-sequences.ts --path-id cuid123 --analyze
    `);
    process.exit(0);
  }

  const options: SequenceOptions = {
    all: false,
    dryRun: false,
    analyzeOnly: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--path-id":
        options.pathId = args[++i];
        break;
      case "--all":
        options.all = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--analyze":
        options.analyzeOnly = true;
        break;
    }
  }

  if (!options.pathId && !options.all) {
    console.error("Error: Must specify --path-id or --all");
    process.exit(1);
  }

  return options;
}

/**
 * Estimate difficulty from title and content
 */
function estimateDifficulty(title: string, content: string): "EASY" | "MEDIUM" | "HARD" {
  // Check for easy patterns
  for (const pattern of DIFFICULTY_PATTERNS.EASY) {
    if (pattern.test(title)) return "EASY";
  }

  // Check for hard patterns
  for (const pattern of DIFFICULTY_PATTERNS.HARD) {
    if (pattern.test(title)) return "HARD";
  }

  // Check content complexity
  const codeBlockCount = (content.match(/```/g) || []).length / 2;
  const wordCount = content.split(/\s+/).length;

  // Complex content indicators
  if (codeBlockCount > 5 || wordCount > 2000) return "HARD";
  if (codeBlockCount < 2 && wordCount < 500) return "EASY";

  return "MEDIUM";
}

/**
 * Extract key topics from content
 */
function extractKeyTopics(content: string): string[] {
  const topics: string[] = [];

  // Extract from headings
  const headings = content.match(/^#{2,3}\s+(.+)$/gm) || [];
  for (const heading of headings) {
    const text = heading
      .replace(/^#+\s+/, "")
      .trim()
      .toLowerCase();
    if (text.length > 3 && text.length < 50) {
      topics.push(text);
    }
  }

  // Extract bold terms
  const boldTerms = content.match(/\*\*([^*]+)\*\*/g) || [];
  for (const term of boldTerms.slice(0, 20)) {
    const text = term.replace(/\*\*/g, "").trim().toLowerCase();
    if (text.length > 2 && text.length < 30) {
      topics.push(text);
    }
  }

  // Extract code terms
  const codeTerms = content.match(/`([^`]+)`/g) || [];
  for (const term of codeTerms.slice(0, 30)) {
    const text = term.replace(/`/g, "").trim().toLowerCase();
    if (text.length > 2 && text.length < 30 && !/^[\/.]/.test(text)) {
      topics.push(text);
    }
  }

  return [...new Set(topics)];
}

/**
 * Detect prerequisites from content references
 */
function detectPrerequisites(
  content: string,
  allLessons: { slug: string; title: string }[]
): string[] {
  const prerequisites: string[] = [];

  // Look for explicit "prerequisites" or "before" mentions
  const prereqSection = content.match(/(?:prerequisite|before|requires?|assumes?)[:\s]+([^.]+)/gi);
  if (prereqSection) {
    for (const section of prereqSection) {
      for (const lesson of allLessons) {
        if (
          section.toLowerCase().includes(lesson.title.toLowerCase()) ||
          section.toLowerCase().includes(lesson.slug)
        ) {
          prerequisites.push(lesson.slug);
        }
      }
    }
  }

  // Look for markdown links to other lessons
  const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  for (const link of links) {
    const match = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      const linkTarget = match[2].toLowerCase();
      for (const lesson of allLessons) {
        if (linkTarget.includes(lesson.slug)) {
          prerequisites.push(lesson.slug);
        }
      }
    }
  }

  // Look for "see also" or "refer to" patterns
  const referPatterns =
    content.match(/(?:see|refer to|check out)\s+(?:the\s+)?["']?([^"'\n.]+)["']?/gi) || [];
  for (const ref of referPatterns) {
    for (const lesson of allLessons) {
      if (ref.toLowerCase().includes(lesson.title.toLowerCase())) {
        prerequisites.push(lesson.slug);
      }
    }
  }

  return [...new Set(prerequisites)];
}

/**
 * Calculate optimal lesson order using topological sort
 */
function calculateOptimalOrder(lessons: LessonAnalysis[]): string[] {
  // Build dependency graph
  const graph = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  for (const lesson of lessons) {
    graph.set(lesson.slug, new Set());
    inDegree.set(lesson.slug, 0);
  }

  // Add edges based on prerequisites
  for (const lesson of lessons) {
    for (const prereq of lesson.prerequisites) {
      if (graph.has(prereq)) {
        graph.get(prereq)!.add(lesson.slug);
        inDegree.set(lesson.slug, (inDegree.get(lesson.slug) || 0) + 1);
      }
    }
  }

  // Topological sort with difficulty consideration
  const result: string[] = [];
  const queue: { slug: string; difficulty: "EASY" | "MEDIUM" | "HARD" }[] = [];

  // Start with lessons that have no prerequisites
  for (const lesson of lessons) {
    if (inDegree.get(lesson.slug) === 0) {
      queue.push({ slug: lesson.slug, difficulty: lesson.difficulty });
    }
  }

  // Sort queue by difficulty (EASY first, then MEDIUM, then HARD)
  const difficultyOrder = { EASY: 0, MEDIUM: 1, HARD: 2 };
  queue.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);

  while (queue.length > 0) {
    // Sort by difficulty each iteration to maintain progression
    queue.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);

    const { slug } = queue.shift()!;
    result.push(slug);

    // Process dependents
    for (const dependent of graph.get(slug) || []) {
      const newDegree = (inDegree.get(dependent) || 0) - 1;
      inDegree.set(dependent, newDegree);

      if (newDegree === 0) {
        const lesson = lessons.find((l) => l.slug === dependent);
        if (lesson) {
          queue.push({ slug: dependent, difficulty: lesson.difficulty });
        }
      }
    }
  }

  // If not all lessons are included (cycle detected), add remaining
  for (const lesson of lessons) {
    if (!result.includes(lesson.slug)) {
      result.push(lesson.slug);
    }
  }

  return result;
}

/**
 * Analyze a learning path
 */
async function analyzePath(pathId: string): Promise<PathAnalysis | null> {
  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
    include: {
      lessons: {
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!path) return null;

  const allLessons = path.lessons.map((l) => ({ slug: l.slug, title: l.title }));
  const lessonAnalyses: LessonAnalysis[] = [];

  // Analyze each lesson
  for (let i = 0; i < path.lessons.length; i++) {
    const lesson = path.lessons[i];
    const keyTopics = extractKeyTopics(lesson.content);
    const prerequisites = detectPrerequisites(
      lesson.content,
      allLessons.filter((l) => l.slug !== lesson.slug)
    );
    const difficulty = estimateDifficulty(lesson.title, lesson.content);

    lessonAnalyses.push({
      id: lesson.id,
      title: lesson.title,
      slug: lesson.slug,
      currentOrder: lesson.orderIndex,
      suggestedOrder: -1, // Will be set later
      difficulty,
      prerequisites,
      dependents: [],
      keyTopics,
      estimatedMinutes: lesson.estimatedMinutes || 5,
    });
  }

  // Calculate dependents
  for (const lesson of lessonAnalyses) {
    for (const prereq of lesson.prerequisites) {
      const prereqLesson = lessonAnalyses.find((l) => l.slug === prereq);
      if (prereqLesson) {
        prereqLesson.dependents.push(lesson.slug);
      }
    }
  }

  // Calculate optimal order
  const suggestedSequence = calculateOptimalOrder(lessonAnalyses);

  // Update suggested order
  for (let i = 0; i < suggestedSequence.length; i++) {
    const lesson = lessonAnalyses.find((l) => l.slug === suggestedSequence[i]);
    if (lesson) {
      lesson.suggestedOrder = i;
    }
  }

  // Detect issues
  const issues: string[] = [];

  // Check for difficulty order violations
  for (let i = 1; i < path.lessons.length; i++) {
    const prev = lessonAnalyses.find((l) => l.currentOrder === i - 1);
    const curr = lessonAnalyses.find((l) => l.currentOrder === i);
    if (prev && curr) {
      const diffOrder = { EASY: 0, MEDIUM: 1, HARD: 2 };
      if (diffOrder[curr.difficulty] < diffOrder[prev.difficulty]) {
        issues.push(
          `"${curr.title}" (${curr.difficulty}) comes after "${prev.title}" (${prev.difficulty})`
        );
      }
    }
  }

  // Check for prerequisite violations
  for (const lesson of lessonAnalyses) {
    for (const prereq of lesson.prerequisites) {
      const prereqLesson = lessonAnalyses.find((l) => l.slug === prereq);
      if (prereqLesson && prereqLesson.currentOrder > lesson.currentOrder) {
        issues.push(`"${lesson.title}" depends on "${prereqLesson.title}" but comes before it`);
      }
    }
  }

  // Check if reorder is needed
  const currentOrder = path.lessons.map((l) => l.slug);
  const reorderNeeded = JSON.stringify(currentOrder) !== JSON.stringify(suggestedSequence);

  return {
    pathId: path.id,
    pathTitle: path.title,
    lessons: lessonAnalyses,
    suggestedSequence,
    reorderNeeded,
    issues,
  };
}

/**
 * Apply sequence changes to database
 */
async function applySequence(analysis: PathAnalysis): Promise<void> {
  for (const slug of analysis.suggestedSequence) {
    const lesson = analysis.lessons.find((l) => l.slug === slug);
    if (lesson) {
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { orderIndex: lesson.suggestedOrder },
      });
    }
  }
}

/**
 * Display analysis results
 */
function displayAnalysis(analysis: PathAnalysis): void {
  console.log(`\n📚 ${analysis.pathTitle}`);
  console.log("─".repeat(60));

  // Show current vs suggested order
  console.log("\nCurrent Order:");
  const sortedByCurrent = [...analysis.lessons].sort((a, b) => a.currentOrder - b.currentOrder);
  for (const lesson of sortedByCurrent) {
    const diffIndicator = { EASY: "🟢", MEDIUM: "🟡", HARD: "🔴" };
    console.log(
      `  ${lesson.currentOrder + 1}. ${diffIndicator[lesson.difficulty]} ${lesson.title}`
    );
  }

  if (analysis.reorderNeeded) {
    console.log("\nSuggested Order:");
    for (let i = 0; i < analysis.suggestedSequence.length; i++) {
      const slug = analysis.suggestedSequence[i];
      const lesson = analysis.lessons.find((l) => l.slug === slug);
      if (lesson) {
        const diffIndicator = { EASY: "🟢", MEDIUM: "🟡", HARD: "🔴" };
        const moved = lesson.currentOrder !== i ? ` (was ${lesson.currentOrder + 1})` : "";
        console.log(`  ${i + 1}. ${diffIndicator[lesson.difficulty]} ${lesson.title}${moved}`);
      }
    }
  } else {
    console.log("\n✅ Current order is optimal");
  }

  // Show issues
  if (analysis.issues.length > 0) {
    console.log("\n⚠️  Issues detected:");
    for (const issue of analysis.issues) {
      console.log(`   - ${issue}`);
    }
  }

  // Show dependencies
  const lessonsWithDeps = analysis.lessons.filter((l) => l.prerequisites.length > 0);
  if (lessonsWithDeps.length > 0) {
    console.log("\n📋 Dependencies:");
    for (const lesson of lessonsWithDeps) {
      console.log(`   ${lesson.title}:`);
      for (const prereq of lesson.prerequisites) {
        console.log(`     ← ${prereq}`);
      }
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log("🔄 Learning Path Sequence Creator\n");

  const options = parseArgs();

  prisma = new PrismaClient();

  console.log(`   Mode: ${options.analyzeOnly ? "ANALYZE" : options.dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("");

  // Get paths to process
  let pathIds: string[] = [];

  if (options.pathId) {
    pathIds = [options.pathId];
  } else if (options.all) {
    const paths = await prisma.learningPath.findMany({
      select: { id: true },
    });
    pathIds = paths.map((p) => p.id);
  }

  console.log(`📚 Processing ${pathIds.length} learning path(s)...\n`);

  let reorderCount = 0;
  let issueCount = 0;

  for (const pathId of pathIds) {
    const analysis = await analyzePath(pathId);

    if (!analysis) {
      console.log(`⚠️  Path not found: ${pathId}`);
      continue;
    }

    displayAnalysis(analysis);

    if (analysis.reorderNeeded) {
      reorderCount++;
      issueCount += analysis.issues.length;

      if (!options.analyzeOnly && !options.dryRun) {
        await applySequence(analysis);
        console.log("\n✅ Sequence updated");
      } else if (!options.analyzeOnly) {
        console.log("\n[DRY RUN] Would update sequence");
      }
    }
  }

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("📊 Summary");
  console.log("═".repeat(60));
  console.log(`   Paths analyzed: ${pathIds.length}`);
  console.log(`   Paths needing reorder: ${reorderCount}`);
  console.log(`   Total issues found: ${issueCount}`);

  if (options.dryRun) {
    console.log("\n🔍 This was a dry run. No changes were made.");
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
