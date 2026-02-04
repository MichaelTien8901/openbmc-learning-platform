#!/usr/bin/env tsx
/**
 * Documentation Import Script
 *
 * Imports markdown documentation from openbmc-guide-tutorial or similar
 * documentation repositories into the OpenBMC Learning Platform.
 *
 * Usage:
 *   npx tsx scripts/import/import-docs.ts <source-directory> [options]
 *
 * Options:
 *   --dry-run       Preview changes without writing to database
 *   --path-name     Name for the learning path to create
 *   --difficulty    Difficulty level (BEGINNER, INTERMEDIATE, ADVANCED)
 *   --published     Publish lessons immediately (default: false)
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@/generated/prisma";

// Types
interface ParsedDocument {
  filePath: string;
  relativePath: string;
  title: string;
  slug: string;
  content: string;
  headings: Heading[];
  codeBlocks: CodeBlock[];
  metadata: DocumentMetadata;
  order: number;
  // GitHub content delivery fields
  sourceUrl: string;
  repositoryPath: string;
}

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface CodeBlock {
  language: string;
  code: string;
  lineStart: number;
  isExercise: boolean;
}

interface DocumentMetadata {
  description?: string;
  tags?: string[];
  prerequisites?: string[];
  estimatedMinutes?: number;
}

interface ImportOptions {
  dryRun: boolean;
  pathName?: string;
  pathSlug?: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  published: boolean;
  sourceDir: string;
  githubPagesBase: string;
}

// GitHub Pages base URL for openbmc-guide-tutorial
const DEFAULT_GITHUB_PAGES_BASE = "https://MichaelTien8901.github.io/openbmc-guide-tutorial";

interface ImportResult {
  lessonsCreated: number;
  lessonsSkipped: number;
  pathCreated: boolean;
  errors: string[];
}

// Prisma client - initialized lazily
let prisma: PrismaClient;

/**
 * Parse command line arguments
 */
function parseArgs(): ImportOptions {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Documentation Import Script

Usage:
  npx tsx scripts/import/import-docs.ts <source-directory> [options]

Options:
  --dry-run           Preview changes without writing to database
  --path-name <name>  Name for the learning path to create
  --path-slug <slug>  URL slug for the learning path
  --difficulty <lvl>  Difficulty level: BEGINNER, INTERMEDIATE, ADVANCED
  --published         Publish lessons immediately (default: draft)

Examples:
  npx tsx scripts/import/import-docs.ts ../openbmc-guide-tutorial/docs
  npx tsx scripts/import/import-docs.ts ./docs --path-name "OpenBMC Basics" --dry-run
    `);
    process.exit(0);
  }

  const options: ImportOptions = {
    dryRun: false,
    difficulty: "BEGINNER",
    published: false,
    sourceDir: args[0],
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--path-name":
        options.pathName = args[++i];
        break;
      case "--path-slug":
        options.pathSlug = args[++i];
        break;
      case "--difficulty":
        options.difficulty = args[++i] as ImportOptions["difficulty"];
        break;
      case "--published":
        options.published = true;
        break;
    }
  }

  return options;
}

/**
 * Create URL-friendly slug from text
 */
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

/**
 * Create heading ID from text
 */
function createHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-");
}

/**
 * Extract title from markdown content
 */
function extractTitle(content: string, fileName: string): string {
  // Try to find first h1 heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Try frontmatter title
  const frontmatterMatch = content.match(/^---[\s\S]*?title:\s*["']?(.+?)["']?\s*$/m);
  if (frontmatterMatch) {
    return frontmatterMatch[1].trim();
  }

  // Fall back to file name
  return fileName
    .replace(/\.(md|markdown)$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/^\d+[-_\s]*/, "") // Remove leading numbers like "01-"
    .trim();
}

/**
 * Extract headings from markdown content
 */
function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;

  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
      id: createHeadingId(match[2]),
    });
  }

  return headings;
}

/**
 * Extract code blocks from markdown content
 */
function extractCodeBlocks(content: string): CodeBlock[] {
  const codeBlocks: CodeBlock[] = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;

  let match;
  let lineNumber = 1;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Calculate line number
    const beforeMatch = content.substring(0, match.index);
    lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;

    const language = match[1] || "text";
    const code = match[2].trim();

    // Detect if this looks like an exercise (has TODO, EXERCISE, or similar markers)
    const isExercise =
      /(?:TODO|EXERCISE|TASK|TRY|IMPLEMENT|COMPLETE)/i.test(code) ||
      /(?:your code here|fill in|implement this)/i.test(code);

    codeBlocks.push({
      language,
      code,
      lineStart: lineNumber,
      isExercise,
    });
  }

  return codeBlocks;
}

/**
 * Extract metadata from frontmatter
 */
function extractMetadata(content: string): DocumentMetadata {
  const metadata: DocumentMetadata = {};

  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return metadata;
  }

  const frontmatter = frontmatterMatch[1];

  // Extract description
  const descMatch = frontmatter.match(/description:\s*["']?(.+?)["']?\s*$/m);
  if (descMatch) {
    metadata.description = descMatch[1];
  }

  // Extract tags
  const tagsMatch = frontmatter.match(/tags:\s*\[([^\]]+)\]/);
  if (tagsMatch) {
    metadata.tags = tagsMatch[1].split(",").map((t) => t.trim().replace(/["']/g, ""));
  }

  // Extract estimated time
  const timeMatch = frontmatter.match(/(?:time|duration|minutes):\s*(\d+)/i);
  if (timeMatch) {
    metadata.estimatedMinutes = parseInt(timeMatch[1], 10);
  }

  return metadata;
}

/**
 * Remove frontmatter from content
 */
function removeFrontmatter(content: string): string {
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");
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
 * Parse a single markdown file
 */
function parseDocument(filePath: string, basePath: string, order: number): ParsedDocument {
  const content = fs.readFileSync(filePath, "utf-8");
  const relativePath = path.relative(basePath, filePath);
  const fileName = path.basename(filePath);

  const title = extractTitle(content, fileName);
  const cleanContent = removeFrontmatter(content);
  const metadata = extractMetadata(content);

  // Estimate reading time if not provided
  if (!metadata.estimatedMinutes) {
    metadata.estimatedMinutes = estimateReadingTime(cleanContent);
  }

  // Build GitHub source URLs
  const repositoryPath = `docs/${relativePath}`;
  const pagePath = relativePath.replace(/\.md$/, "").replace(/\/index$/, "/");
  const sourceUrl = `${DEFAULT_GITHUB_PAGES_BASE}/${pagePath}/`;

  return {
    filePath,
    relativePath,
    title,
    slug: createSlug(title),
    content: cleanContent,
    headings: extractHeadings(cleanContent),
    codeBlocks: extractCodeBlocks(cleanContent),
    metadata,
    order,
    sourceUrl,
    repositoryPath,
  };
}

/**
 * Find all markdown files in a directory
 */
function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden directories and common non-doc directories
        if (
          !entry.name.startsWith(".") &&
          !["node_modules", "dist", "build"].includes(entry.name)
        ) {
          walk(fullPath);
        }
      } else if (entry.isFile() && /\.(md|markdown)$/i.test(entry.name)) {
        // Skip README files at root level
        if (entry.name.toLowerCase() !== "readme.md" || currentDir !== dir) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);

  // Sort files by path (handles numbered files like 01-intro.md, 02-setup.md)
  return files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * Check for existing lessons with same slug
 */
async function checkExistingLessons(slugs: string[], dryRun: boolean): Promise<Set<string>> {
  if (dryRun || !prisma) {
    return new Set(); // In dry-run mode, assume no conflicts
  }
  const existing = await prisma.lesson.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true },
  });
  return new Set(existing.map((l) => l.slug));
}

/**
 * Import documents into the database
 */
async function importDocuments(
  documents: ParsedDocument[],
  options: ImportOptions
): Promise<ImportResult> {
  const result: ImportResult = {
    lessonsCreated: 0,
    lessonsSkipped: 0,
    pathCreated: false,
    errors: [],
  };

  console.log(`\n📚 Importing ${documents.length} documents...`);

  if (options.dryRun) {
    console.log("🔍 DRY RUN - No changes will be made\n");
  }

  // Check for existing lessons
  const existingSlugs = await checkExistingLessons(
    documents.map((d) => d.slug),
    options.dryRun
  );

  // Create learning path if specified
  let pathId: string | undefined;

  if (options.pathName) {
    const pathSlug = options.pathSlug || createSlug(options.pathName);

    console.log(`📁 Creating learning path: ${options.pathName}`);

    if (!options.dryRun) {
      try {
        // Check if path exists
        const existingPath = await prisma.learningPath.findUnique({
          where: { slug: pathSlug },
        });

        if (existingPath) {
          console.log(`   ⚠️  Path already exists, using existing: ${pathSlug}`);
          pathId = existingPath.id;
        } else {
          const newPath = await prisma.learningPath.create({
            data: {
              title: options.pathName,
              slug: pathSlug,
              description: `Imported from ${path.basename(options.sourceDir)}`,
              difficulty: options.difficulty,
              published: options.published,
            },
          });
          pathId = newPath.id;
          result.pathCreated = true;
          console.log(`   ✅ Created path: ${pathSlug}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Failed to create path: ${message}`);
        console.log(`   ❌ Error: ${message}`);
      }
    } else {
      console.log(`   [DRY RUN] Would create path: ${pathSlug}`);
      result.pathCreated = true;
    }
  }

  // Import each document
  for (const doc of documents) {
    const status = existingSlugs.has(doc.slug) ? "exists" : "new";

    if (status === "exists") {
      console.log(`⏭️  Skipping (exists): ${doc.title}`);
      result.lessonsSkipped++;
      continue;
    }

    console.log(`📄 Importing: ${doc.title}`);
    console.log(`   Slug: ${doc.slug}`);
    console.log(`   Source: ${doc.sourceUrl}`);
    console.log(`   Headings: ${doc.headings.length}, Code blocks: ${doc.codeBlocks.length}`);
    console.log(`   Est. time: ${doc.metadata.estimatedMinutes} min`);

    if (!options.dryRun) {
      try {
        await prisma.lesson.create({
          data: {
            title: doc.title,
            slug: doc.slug,
            content: doc.content,
            contentType: "MARKDOWN",
            published: options.published,
            estimatedMinutes: doc.metadata.estimatedMinutes,
            // GitHub content delivery fields
            sourceUrl: doc.sourceUrl,
            repositoryPath: doc.repositoryPath,
            displayMode: "RENDER",
          },
        });
        result.lessonsCreated++;
        console.log(`   ✅ Created`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Failed to create "${doc.title}": ${message}`);
        console.log(`   ❌ Error: ${message}`);
      }
    } else {
      console.log(`   [DRY RUN] Would create lesson`);
      result.lessonsCreated++;
    }
  }

  return result;
}

/**
 * Main entry point
 */
async function main() {
  console.log("🚀 OpenBMC Learning Platform - Documentation Importer\n");

  const options = parseArgs();

  // Initialize Prisma client only if not doing a dry run
  if (!options.dryRun) {
    prisma = new PrismaClient();
  }

  // Validate source directory
  if (!fs.existsSync(options.sourceDir)) {
    console.error(`❌ Source directory not found: ${options.sourceDir}`);
    process.exit(1);
  }

  const stat = fs.statSync(options.sourceDir);
  if (!stat.isDirectory()) {
    console.error(`❌ Source path is not a directory: ${options.sourceDir}`);
    process.exit(1);
  }

  console.log(`📂 Source: ${path.resolve(options.sourceDir)}`);
  console.log(`🎯 Difficulty: ${options.difficulty}`);
  console.log(`📝 Published: ${options.published ? "Yes" : "No (draft)"}`);
  if (options.pathName) {
    console.log(`📁 Learning Path: ${options.pathName}`);
  }

  // Find markdown files
  const files = findMarkdownFiles(options.sourceDir);
  console.log(`\n📑 Found ${files.length} markdown files\n`);

  if (files.length === 0) {
    console.log("No markdown files found to import.");
    process.exit(0);
  }

  // Parse all documents
  const documents = files.map((file, index) => parseDocument(file, options.sourceDir, index));

  // Show preview
  console.log("Documents to import:");
  console.log("─".repeat(60));
  for (const doc of documents) {
    console.log(`  ${doc.order + 1}. ${doc.title}`);
    console.log(`     ${doc.relativePath}`);
  }
  console.log("─".repeat(60));

  // Import documents
  const result = await importDocuments(documents, options);

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("📊 Import Summary");
  console.log("═".repeat(60));
  console.log(`   Lessons created: ${result.lessonsCreated}`);
  console.log(`   Lessons skipped: ${result.lessonsSkipped}`);
  console.log(`   Path created: ${result.pathCreated ? "Yes" : "No"}`);

  if (result.errors.length > 0) {
    console.log(`\n❌ Errors (${result.errors.length}):`);
    for (const error of result.errors) {
      console.log(`   - ${error}`);
    }
  }

  if (options.dryRun) {
    console.log("\n🔍 This was a dry run. No changes were made.");
    console.log("   Remove --dry-run to perform the actual import.");
  }

  if (prisma) {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
