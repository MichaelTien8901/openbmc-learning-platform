#!/usr/bin/env tsx
/**
 * Documentation Structure Mapper
 *
 * Analyzes a documentation directory and maps its structure to
 * suggested learning paths based on folder hierarchy and content.
 *
 * Usage:
 *   npx tsx scripts/import/map-structure.ts <source-directory>
 *
 * Output:
 *   - JSON mapping of folders to suggested learning paths
 *   - Recommended difficulty levels based on content analysis
 *   - Dependency suggestions based on content references
 */

import * as fs from "fs";
import * as path from "path";

// Types
interface DocFile {
  path: string;
  name: string;
  title: string;
  order: number;
  estimatedMinutes: number;
  hasCodeExamples: boolean;
  hasExercises: boolean;
  references: string[];
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
}

interface DocFolder {
  path: string;
  name: string;
  title: string;
  files: DocFile[];
  subfolders: DocFolder[];
  suggestedDifficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  totalMinutes: number;
  totalLessons: number;
}

interface PathMapping {
  sourcePath: string;
  suggestedName: string;
  suggestedSlug: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  estimatedMinutes: number;
  lessonCount: number;
  hasCodeExamples: boolean;
  hasExercises: boolean;
  dependencies: string[];
  lessons: {
    sourceFile: string;
    title: string;
    order: number;
  }[];
}

// Difficulty detection keywords
const BEGINNER_KEYWORDS = [
  "introduction",
  "getting started",
  "basics",
  "overview",
  "what is",
  "first",
  "hello world",
  "setup",
  "install",
  "quick start",
];

const ADVANCED_KEYWORDS = [
  "advanced",
  "internals",
  "architecture",
  "deep dive",
  "optimization",
  "performance",
  "debugging",
  "troubleshooting",
  "security",
  "production",
];

/**
 * Extract title from markdown content
 */
function extractTitle(content: string, fileName: string): string {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  const frontmatterMatch = content.match(/^---[\s\S]*?title:\s*["']?(.+?)["']?\s*$/m);
  if (frontmatterMatch) {
    return frontmatterMatch[1].trim();
  }

  return fileName
    .replace(/\.(md|markdown)$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/^\d+[-_\s]*/, "")
    .trim();
}

/**
 * Estimate difficulty from content
 */
function estimateDifficulty(
  title: string,
  content: string
): "BEGINNER" | "INTERMEDIATE" | "ADVANCED" {
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();

  // Check for beginner keywords
  for (const keyword of BEGINNER_KEYWORDS) {
    if (lowerTitle.includes(keyword) || lowerContent.slice(0, 500).includes(keyword)) {
      return "BEGINNER";
    }
  }

  // Check for advanced keywords
  for (const keyword of ADVANCED_KEYWORDS) {
    if (lowerTitle.includes(keyword) || lowerContent.slice(0, 500).includes(keyword)) {
      return "ADVANCED";
    }
  }

  return "INTERMEDIATE";
}

/**
 * Estimate reading time in minutes
 */
function estimateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

/**
 * Check if content has code examples
 */
function hasCodeExamples(content: string): boolean {
  return /```[\w]*\n[\s\S]*?```/g.test(content);
}

/**
 * Check if content has exercise markers
 */
function hasExercises(content: string): boolean {
  return /(?:TODO|EXERCISE|TASK|TRY|IMPLEMENT|COMPLETE|your code here)/i.test(content);
}

/**
 * Extract references to other documents
 */
function extractReferences(content: string): string[] {
  const refs: string[] = [];

  // Find markdown links to .md files
  const linkRegex = /\[([^\]]+)\]\(([^)]+\.md[^)]*)\)/g;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    refs.push(match[2].replace(/^\.\//, "").replace(/#.*$/, ""));
  }

  return [...new Set(refs)];
}

/**
 * Parse a single markdown file
 */
function parseFile(filePath: string, basePath: string, order: number): DocFile {
  const content = fs.readFileSync(filePath, "utf-8");
  const relativePath = path.relative(basePath, filePath);
  const fileName = path.basename(filePath);
  const title = extractTitle(content, fileName);

  return {
    path: relativePath,
    name: fileName,
    title,
    order,
    estimatedMinutes: estimateReadingTime(content),
    hasCodeExamples: hasCodeExamples(content),
    hasExercises: hasExercises(content),
    references: extractReferences(content),
    difficulty: estimateDifficulty(title, content),
  };
}

/**
 * Parse a directory recursively
 */
function parseDirectory(dir: string, basePath: string): DocFolder {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const folderName = path.basename(dir);

  const files: DocFile[] = [];
  const subfolders: DocFolder[] = [];

  // Parse files
  const mdFiles = entries
    .filter((e) => e.isFile() && /\.(md|markdown)$/i.test(e.name))
    .filter((e) => e.name.toLowerCase() !== "readme.md" || dir !== basePath)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  mdFiles.forEach((entry, index) => {
    const fullPath = path.join(dir, entry.name);
    files.push(parseFile(fullPath, basePath, index));
  });

  // Parse subfolders
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".") && !["node_modules", "dist", "build"].includes(entry.name)) {
        const fullPath = path.join(dir, entry.name);
        subfolders.push(parseDirectory(fullPath, basePath));
      }
    }
  }

  // Calculate totals
  const totalLessons = files.length + subfolders.reduce((sum, sf) => sum + sf.totalLessons, 0);
  const totalMinutes =
    files.reduce((sum, f) => sum + f.estimatedMinutes, 0) +
    subfolders.reduce((sum, sf) => sum + sf.totalMinutes, 0);

  // Determine suggested difficulty
  const difficulties = files.map((f) => f.difficulty);
  const suggestedDifficulty =
    difficulties.filter((d) => d === "ADVANCED").length > difficulties.length / 3
      ? "ADVANCED"
      : difficulties.filter((d) => d === "BEGINNER").length > difficulties.length / 3
        ? "BEGINNER"
        : "INTERMEDIATE";

  // Create folder title from folder name
  const title = folderName
    .replace(/[-_]/g, " ")
    .replace(/^\d+[-_\s]*/, "")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    path: path.relative(basePath, dir) || ".",
    name: folderName,
    title,
    files,
    subfolders,
    suggestedDifficulty,
    totalMinutes,
    totalLessons,
  };
}

/**
 * Convert folder structure to path mappings
 */
function createPathMappings(folder: DocFolder, basePath: string): PathMapping[] {
  const mappings: PathMapping[] = [];

  // Create mapping for current folder if it has files
  if (folder.files.length > 0) {
    const allRefs = folder.files.flatMap((f) => f.references);
    const dependencies = [...new Set(allRefs)].filter(
      (ref) => !folder.files.some((f) => f.path === ref)
    );

    mappings.push({
      sourcePath: folder.path,
      suggestedName: folder.title,
      suggestedSlug: folder.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      difficulty: folder.suggestedDifficulty,
      estimatedMinutes: folder.files.reduce((sum, f) => sum + f.estimatedMinutes, 0),
      lessonCount: folder.files.length,
      hasCodeExamples: folder.files.some((f) => f.hasCodeExamples),
      hasExercises: folder.files.some((f) => f.hasExercises),
      dependencies,
      lessons: folder.files.map((f) => ({
        sourceFile: f.path,
        title: f.title,
        order: f.order,
      })),
    });
  }

  // Process subfolders
  for (const subfolder of folder.subfolders) {
    mappings.push(...createPathMappings(subfolder, basePath));
  }

  return mappings;
}

/**
 * Main entry point
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Documentation Structure Mapper

Usage:
  npx tsx scripts/import/map-structure.ts <source-directory>

Options:
  --json    Output raw JSON instead of formatted text
  --import  Generate import commands

Examples:
  npx tsx scripts/import/map-structure.ts ../openbmc-guide-tutorial/docs
  npx tsx scripts/import/map-structure.ts ./content --json > structure.json
    `);
    process.exit(0);
  }

  const sourceDir = args[0];
  const outputJson = args.includes("--json");
  const generateImport = args.includes("--import");

  // Validate source directory
  if (!fs.existsSync(sourceDir)) {
    console.error(`Error: Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  const stat = fs.statSync(sourceDir);
  if (!stat.isDirectory()) {
    console.error(`Error: Source path is not a directory: ${sourceDir}`);
    process.exit(1);
  }

  console.log("📂 Analyzing documentation structure...\n");

  // Parse directory structure
  const rootFolder = parseDirectory(sourceDir, sourceDir);
  const mappings = createPathMappings(rootFolder, sourceDir);

  if (outputJson) {
    console.log(JSON.stringify({ rootFolder, mappings }, null, 2));
    return;
  }

  // Display summary
  console.log("═".repeat(70));
  console.log("📊 Structure Analysis Summary");
  console.log("═".repeat(70));
  console.log(`   Source: ${path.resolve(sourceDir)}`);
  console.log(`   Total folders: ${mappings.length}`);
  console.log(`   Total lessons: ${mappings.reduce((sum, m) => sum + m.lessonCount, 0)}`);
  console.log(
    `   Total estimated time: ${mappings.reduce((sum, m) => sum + m.estimatedMinutes, 0)} minutes`
  );
  console.log("");

  // Display suggested learning paths
  console.log("📚 Suggested Learning Paths");
  console.log("─".repeat(70));

  for (const mapping of mappings) {
    console.log(`\n  📁 ${mapping.suggestedName}`);
    console.log(`     Path: ${mapping.sourcePath}`);
    console.log(`     Slug: ${mapping.suggestedSlug}`);
    console.log(`     Difficulty: ${mapping.difficulty}`);
    console.log(`     Lessons: ${mapping.lessonCount}`);
    console.log(`     Est. time: ${mapping.estimatedMinutes} minutes`);
    console.log(`     Code examples: ${mapping.hasCodeExamples ? "Yes" : "No"}`);
    console.log(`     Exercises: ${mapping.hasExercises ? "Yes" : "No"}`);

    if (mapping.dependencies.length > 0) {
      console.log(`     Dependencies: ${mapping.dependencies.join(", ")}`);
    }

    console.log("     Lessons:");
    for (const lesson of mapping.lessons) {
      console.log(`       ${lesson.order + 1}. ${lesson.title}`);
    }
  }

  // Generate import commands if requested
  if (generateImport) {
    console.log("\n" + "═".repeat(70));
    console.log("📋 Import Commands");
    console.log("═".repeat(70));

    for (const mapping of mappings) {
      const importPath =
        mapping.sourcePath === "." ? sourceDir : path.join(sourceDir, mapping.sourcePath);
      console.log(`
# Import: ${mapping.suggestedName}
npx tsx scripts/import/import-docs.ts "${importPath}" \\
  --path-name "${mapping.suggestedName}" \\
  --path-slug "${mapping.suggestedSlug}" \\
  --difficulty ${mapping.difficulty}
`);
    }
  }
}

main();
