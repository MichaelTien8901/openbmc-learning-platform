#!/usr/bin/env tsx
/**
 * Code Exercise Extractor
 *
 * Extracts code examples from markdown documentation and converts them
 * into sandbox exercises with validation scripts.
 *
 * Usage:
 *   npx tsx scripts/import/extract-exercises.ts <source-directory> [options]
 *
 * Options:
 *   --output <dir>     Output directory for exercises (default: ./exercises)
 *   --min-lines <n>    Minimum lines for code to be an exercise (default: 5)
 *   --include <lang>   Only include specific languages (comma-separated)
 */

import * as fs from "fs";
import * as path from "path";

// Types
interface CodeBlock {
  language: string;
  code: string;
  lineStart: number;
  isExercise: boolean;
  context: string;
}

interface ExtractedExercise {
  id: string;
  sourceFile: string;
  language: string;
  title: string;
  description: string;
  starterCode: string;
  solutionCode: string;
  validationScript?: string;
  hints: string[];
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  estimatedMinutes: number;
}

interface ExtractionOptions {
  sourceDir: string;
  outputDir: string;
  minLines: number;
  includeLanguages: string[];
}

// Language configs for exercise generation
const LANGUAGE_CONFIGS: Record<
  string,
  {
    extension: string;
    commentPrefix: string;
    validationTemplate?: string;
  }
> = {
  bash: {
    extension: ".sh",
    commentPrefix: "#",
    validationTemplate: `#!/bin/bash
# Validation script
set -e

# Run the student's solution
source solution.sh

# Add validation checks here
# Example: test -f /expected/file && echo "PASS" || echo "FAIL"
`,
  },
  shell: {
    extension: ".sh",
    commentPrefix: "#",
  },
  python: {
    extension: ".py",
    commentPrefix: "#",
    validationTemplate: `#!/usr/bin/env python3
"""Validation script for Python exercise"""
import subprocess
import sys

# Run student solution
result = subprocess.run(['python3', 'solution.py'], capture_output=True, text=True)

# Check output or state
# Add your validation logic here
if result.returncode == 0:
    print("PASS")
else:
    print("FAIL:", result.stderr)
    sys.exit(1)
`,
  },
  c: {
    extension: ".c",
    commentPrefix: "//",
    validationTemplate: `#!/bin/bash
# Compile and run C solution
gcc -o solution solution.c && ./solution
`,
  },
  cpp: {
    extension: ".cpp",
    commentPrefix: "//",
  },
  json: {
    extension: ".json",
    commentPrefix: "//",
  },
  yaml: {
    extension: ".yaml",
    commentPrefix: "#",
  },
  yml: {
    extension: ".yml",
    commentPrefix: "#",
  },
  dockerfile: {
    extension: "",
    commentPrefix: "#",
  },
  makefile: {
    extension: "",
    commentPrefix: "#",
  },
  bitbake: {
    extension: ".bb",
    commentPrefix: "#",
  },
};

/**
 * Parse command line arguments
 */
function parseArgs(): ExtractionOptions {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Code Exercise Extractor

Usage:
  npx tsx scripts/import/extract-exercises.ts <source-directory> [options]

Options:
  --output <dir>     Output directory for exercises (default: ./exercises)
  --min-lines <n>    Minimum lines for code to be an exercise (default: 5)
  --include <lang>   Only include specific languages (comma-separated)

Examples:
  npx tsx scripts/import/extract-exercises.ts ../openbmc-guide-tutorial/docs
  npx tsx scripts/import/extract-exercises.ts ./docs --output ./generated-exercises
  npx tsx scripts/import/extract-exercises.ts ./docs --include bash,python
    `);
    process.exit(0);
  }

  const options: ExtractionOptions = {
    sourceDir: args[0],
    outputDir: "./exercises",
    minLines: 5,
    includeLanguages: [],
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case "--output":
        options.outputDir = args[++i];
        break;
      case "--min-lines":
        options.minLines = parseInt(args[++i], 10);
        break;
      case "--include":
        options.includeLanguages = args[++i].split(",").map((l) => l.trim().toLowerCase());
        break;
    }
  }

  return options;
}

/**
 * Extract code blocks from markdown content
 */
function extractCodeBlocks(content: string, _filePath: string): CodeBlock[] {
  const codeBlocks: CodeBlock[] = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;

  // Split content into sections for context
  const lines = content.split("\n");

  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const beforeMatch = content.substring(0, match.index);
    const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;

    const language = match[1].toLowerCase() || "text";
    const code = match[2].trim();

    // Get context (surrounding headings and paragraphs)
    const contextStart = Math.max(0, lineNumber - 10);
    const contextLines = lines.slice(contextStart, lineNumber);
    const context = contextLines
      .filter((l) => l.startsWith("#") || (l.length > 20 && !l.startsWith("```")))
      .slice(-3)
      .join("\n");

    // Detect if this looks like an exercise
    const isExercise =
      /(?:TODO|EXERCISE|TASK|TRY|IMPLEMENT|COMPLETE)/i.test(code) ||
      /(?:your code here|fill in|implement this|write a|create a)/i.test(code) ||
      /(?:step \d|exercise|practice)/i.test(context.toLowerCase());

    codeBlocks.push({
      language,
      code,
      lineStart: lineNumber,
      isExercise,
      context,
    });
  }

  return codeBlocks;
}

/**
 * Generate starter code from solution
 */
function generateStarterCode(code: string, language: string): string {
  const config = LANGUAGE_CONFIGS[language];
  const commentPrefix = config?.commentPrefix || "#";

  // Split into lines
  const lines = code.split("\n");

  // Find the "meat" of the code (skip imports, comments at start)
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      line.startsWith(commentPrefix) ||
      line === "" ||
      line.startsWith("import ") ||
      line.startsWith("#include") ||
      line.startsWith("from ")
    ) {
      startIdx = i + 1;
    } else {
      break;
    }
  }

  // Keep the preamble, replace the rest with TODO comment
  const preamble = lines.slice(0, startIdx).join("\n");
  const todoComment = `${commentPrefix} TODO: Implement your solution here\n${commentPrefix} Reference the original code structure above`;

  return preamble + (preamble ? "\n\n" : "") + todoComment;
}

/**
 * Generate hints from code comments and structure
 */
function generateHints(code: string, _context: string): string[] {
  const hints: string[] = [];

  // Extract comments as hints
  const commentMatches = code.match(/(?:#|\/\/)\s*(.+)$/gm) || [];
  for (const comment of commentMatches.slice(0, 3)) {
    const hintText = comment.replace(/^[#/]+\s*/, "").trim();
    if (hintText.length > 10 && !hintText.toLowerCase().includes("todo")) {
      hints.push(hintText);
    }
  }

  // Add generic hints based on language constructs
  if (code.includes("for ") || code.includes("while ")) {
    hints.push("Consider using a loop to iterate through the data");
  }
  if (code.includes("if ") || code.includes("else")) {
    hints.push("Use conditional statements to handle different cases");
  }
  if (code.includes("function") || code.includes("def ")) {
    hints.push("Break down the problem into smaller functions");
  }

  return hints.slice(0, 5);
}

/**
 * Estimate difficulty from code complexity
 */
function estimateDifficulty(code: string): "BEGINNER" | "INTERMEDIATE" | "ADVANCED" {
  const lines = code.split("\n").filter((l) => l.trim());
  const hasLoops = /(?:for|while|do)\s*[({]/.test(code);
  const hasNesting =
    (code.match(/\{[^}]*\{/g) || []).length > 1 || (code.match(/^\s{8,}/gm) || []).length > 2;
  const hasComplexPatterns = /(?:async|await|yield|class|interface|template)/.test(code);

  if (lines.length > 50 || hasComplexPatterns || hasNesting) {
    return "ADVANCED";
  }
  if (lines.length > 15 || hasLoops) {
    return "INTERMEDIATE";
  }
  return "BEGINNER";
}

/**
 * Create slug from title
 */
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

/**
 * Extract title from context
 */
function extractTitle(context: string, language: string, index: number): string {
  // Try to find heading in context
  const headingMatch = context.match(/^#+\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  // Generate default title
  return `${language.charAt(0).toUpperCase() + language.slice(1)} Exercise ${index + 1}`;
}

/**
 * Process a single markdown file
 */
function processFile(
  filePath: string,
  basePath: string,
  options: ExtractionOptions
): ExtractedExercise[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const relativePath = path.relative(basePath, filePath);

  const codeBlocks = extractCodeBlocks(content, relativePath);
  const exercises: ExtractedExercise[] = [];

  let exerciseIndex = 0;

  for (const block of codeBlocks) {
    // Filter by language if specified
    if (options.includeLanguages.length > 0 && !options.includeLanguages.includes(block.language)) {
      continue;
    }

    // Skip if too short
    const lineCount = block.code.split("\n").filter((l) => l.trim()).length;
    if (lineCount < options.minLines) {
      continue;
    }

    // Skip if it's just configuration or data
    if (["json", "yaml", "yml", "xml", "toml"].includes(block.language) && !block.isExercise) {
      continue;
    }

    const title = extractTitle(block.context, block.language, exerciseIndex);
    const slug = createSlug(title);
    const difficulty = estimateDifficulty(block.code);

    exercises.push({
      id: `${createSlug(path.basename(relativePath, ".md"))}-${slug}-${exerciseIndex}`,
      sourceFile: relativePath,
      language: block.language,
      title,
      description: block.context || `Practice ${block.language} coding with this exercise.`,
      starterCode: generateStarterCode(block.code, block.language),
      solutionCode: block.code,
      validationScript: LANGUAGE_CONFIGS[block.language]?.validationTemplate,
      hints: generateHints(block.code, block.context),
      difficulty,
      estimatedMinutes: Math.max(5, Math.ceil(lineCount / 5)),
    });

    exerciseIndex++;
  }

  return exercises;
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
        if (
          !entry.name.startsWith(".") &&
          !["node_modules", "dist", "build"].includes(entry.name)
        ) {
          walk(fullPath);
        }
      } else if (entry.isFile() && /\.(md|markdown)$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files.sort();
}

/**
 * Write exercise to output directory
 */
function writeExercise(exercise: ExtractedExercise, outputDir: string): void {
  const exerciseDir = path.join(outputDir, exercise.id);

  // Create exercise directory
  fs.mkdirSync(exerciseDir, { recursive: true });

  // Write metadata
  const metadata = {
    id: exercise.id,
    title: exercise.title,
    description: exercise.description,
    language: exercise.language,
    difficulty: exercise.difficulty,
    estimatedMinutes: exercise.estimatedMinutes,
    sourceFile: exercise.sourceFile,
    hints: exercise.hints,
  };
  fs.writeFileSync(path.join(exerciseDir, "metadata.json"), JSON.stringify(metadata, null, 2));

  // Get file extension
  const ext = LANGUAGE_CONFIGS[exercise.language]?.extension || `.${exercise.language}`;

  // Write starter code
  fs.writeFileSync(path.join(exerciseDir, `starter${ext}`), exercise.starterCode);

  // Write solution
  fs.writeFileSync(path.join(exerciseDir, `solution${ext}`), exercise.solutionCode);

  // Write validation script if available
  if (exercise.validationScript) {
    fs.writeFileSync(path.join(exerciseDir, "validate.sh"), exercise.validationScript);
    fs.chmodSync(path.join(exerciseDir, "validate.sh"), 0o755);
  }

  // Write README
  const readme = `# ${exercise.title}

**Language:** ${exercise.language}
**Difficulty:** ${exercise.difficulty}
**Estimated Time:** ${exercise.estimatedMinutes} minutes

## Description

${exercise.description}

## Instructions

1. Open \`starter${ext}\` and implement the solution
2. Run your code to test it
3. Check against \`solution${ext}\` when done

## Hints

${exercise.hints.map((h, i) => `${i + 1}. ${h}`).join("\n")}

---
*Extracted from: ${exercise.sourceFile}*
`;
  fs.writeFileSync(path.join(exerciseDir, "README.md"), readme);
}

/**
 * Main entry point
 */
function main() {
  const options = parseArgs();

  // Validate source directory
  if (!fs.existsSync(options.sourceDir)) {
    console.error(`Error: Source directory not found: ${options.sourceDir}`);
    process.exit(1);
  }

  console.log("🔍 Extracting code exercises...\n");
  console.log(`   Source: ${path.resolve(options.sourceDir)}`);
  console.log(`   Output: ${path.resolve(options.outputDir)}`);
  console.log(`   Min lines: ${options.minLines}`);
  if (options.includeLanguages.length > 0) {
    console.log(`   Languages: ${options.includeLanguages.join(", ")}`);
  }
  console.log("");

  // Find all markdown files
  const files = findMarkdownFiles(options.sourceDir);
  console.log(`📄 Found ${files.length} markdown files\n`);

  // Process each file
  const allExercises: ExtractedExercise[] = [];

  for (const file of files) {
    const exercises = processFile(file, options.sourceDir, options);
    if (exercises.length > 0) {
      console.log(`   ${path.relative(options.sourceDir, file)}: ${exercises.length} exercises`);
      allExercises.push(...exercises);
    }
  }

  if (allExercises.length === 0) {
    console.log("\n⚠️  No exercises found matching criteria.");
    console.log("   Try lowering --min-lines or check your --include languages.");
    process.exit(0);
  }

  // Create output directory
  fs.mkdirSync(options.outputDir, { recursive: true });

  // Write each exercise
  console.log(`\n📝 Writing ${allExercises.length} exercises...\n`);

  for (const exercise of allExercises) {
    writeExercise(exercise, options.outputDir);
    console.log(`   ✅ ${exercise.id}`);
  }

  // Write index file
  const index = {
    generated: new Date().toISOString(),
    source: path.resolve(options.sourceDir),
    totalExercises: allExercises.length,
    exercises: allExercises.map((e) => ({
      id: e.id,
      title: e.title,
      language: e.language,
      difficulty: e.difficulty,
    })),
  };
  fs.writeFileSync(path.join(options.outputDir, "index.json"), JSON.stringify(index, null, 2));

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("📊 Extraction Summary");
  console.log("═".repeat(60));
  console.log(`   Total exercises: ${allExercises.length}`);

  const byLanguage = allExercises.reduce(
    (acc, e) => {
      acc[e.language] = (acc[e.language] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  console.log(`   By language:`);
  for (const [lang, count] of Object.entries(byLanguage).sort((a, b) => b[1] - a[1])) {
    console.log(`      ${lang}: ${count}`);
  }

  const byDifficulty = allExercises.reduce(
    (acc, e) => {
      acc[e.difficulty] = (acc[e.difficulty] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  console.log(`   By difficulty:`);
  for (const [diff, count] of Object.entries(byDifficulty)) {
    console.log(`      ${diff}: ${count}`);
  }

  console.log(`\n✨ Exercises written to: ${path.resolve(options.outputDir)}`);
}

main();
