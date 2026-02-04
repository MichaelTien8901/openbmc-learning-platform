#!/usr/bin/env tsx
/**
 * Quiz Generator for Imported Lessons
 *
 * Generates quiz questions for lessons using AI or rule-based extraction.
 * Can work offline with rule-based generation or with NotebookLM integration.
 *
 * Usage:
 *   npx tsx scripts/import/generate-quizzes.ts [options]
 *
 * Options:
 *   --lesson-id <id>    Generate quiz for specific lesson
 *   --path-id <id>      Generate quizzes for all lessons in a path
 *   --all               Generate quizzes for all lessons without quizzes
 *   --dry-run           Preview without saving to database
 *   --questions <n>     Number of questions per lesson (default: 5)
 */

import { PrismaClient } from "@/generated/prisma";

// Types
interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

interface GeneratedQuiz {
  lessonId: string;
  lessonTitle: string;
  questions: QuizQuestion[];
}

interface GeneratorOptions {
  lessonId?: string;
  pathId?: string;
  all: boolean;
  dryRun: boolean;
  questionsPerLesson: number;
}

// Prisma client
let prisma: PrismaClient;

/**
 * Parse command line arguments
 */
function parseArgs(): GeneratorOptions {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Quiz Generator for Imported Lessons

Usage:
  npx tsx scripts/import/generate-quizzes.ts [options]

Options:
  --lesson-id <id>    Generate quiz for specific lesson
  --path-id <id>      Generate quizzes for all lessons in a path
  --all               Generate quizzes for all lessons without quizzes
  --dry-run           Preview without saving to database
  --questions <n>     Number of questions per lesson (default: 5)

Examples:
  npx tsx scripts/import/generate-quizzes.ts --all --dry-run
  npx tsx scripts/import/generate-quizzes.ts --path-id cuid123 --questions 10
  npx tsx scripts/import/generate-quizzes.ts --lesson-id cuid456
    `);
    process.exit(0);
  }

  const options: GeneratorOptions = {
    all: false,
    dryRun: false,
    questionsPerLesson: 5,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--lesson-id":
        options.lessonId = args[++i];
        break;
      case "--path-id":
        options.pathId = args[++i];
        break;
      case "--all":
        options.all = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--questions":
        options.questionsPerLesson = parseInt(args[++i], 10);
        break;
    }
  }

  if (!options.lessonId && !options.pathId && !options.all) {
    console.error("Error: Must specify --lesson-id, --path-id, or --all");
    process.exit(1);
  }

  return options;
}

/**
 * Extract key concepts from markdown content
 */
function extractKeyConcepts(content: string): string[] {
  const concepts: string[] = [];

  // Extract headings as concepts
  const headings = content.match(/^#{2,4}\s+(.+)$/gm) || [];
  for (const heading of headings) {
    const text = heading.replace(/^#+\s+/, "").trim();
    if (text.length > 3 && text.length < 100) {
      concepts.push(text);
    }
  }

  // Extract bold text as key terms
  const boldTerms = content.match(/\*\*([^*]+)\*\*/g) || [];
  for (const term of boldTerms) {
    const text = term.replace(/\*\*/g, "").trim();
    if (text.length > 2 && text.length < 50) {
      concepts.push(text);
    }
  }

  // Extract code terms
  const codeTerms = content.match(/`([^`]+)`/g) || [];
  for (const term of codeTerms) {
    const text = term.replace(/`/g, "").trim();
    if (text.length > 2 && text.length < 40 && !/^[\/.]/.test(text)) {
      concepts.push(text);
    }
  }

  return [...new Set(concepts)];
}

/**
 * Extract definitions from content
 */
function extractDefinitions(content: string): { term: string; definition: string }[] {
  const definitions: { term: string; definition: string }[] = [];

  // Pattern: **term** - definition or **term**: definition
  const defPattern = /\*\*([^*]+)\*\*\s*[-:]\s*([^.\n]+)/g;
  let match;
  while ((match = defPattern.exec(content)) !== null) {
    definitions.push({
      term: match[1].trim(),
      definition: match[2].trim(),
    });
  }

  return definitions;
}

/**
 * Extract command examples from content
 */
function extractCommands(content: string): { command: string; description: string }[] {
  const commands: { command: string; description: string }[] = [];

  // Look for bash code blocks with preceding description
  const codeBlockPattern = /([^\n]+)\n\n?```(?:bash|shell|sh)\n([^\n]+)/g;
  let match;
  while ((match = codeBlockPattern.exec(content)) !== null) {
    const description = match[1].trim();
    const command = match[2].trim();
    if (command.length < 100 && !command.includes("\n")) {
      commands.push({ command, description });
    }
  }

  return commands;
}

/**
 * Generate a definition question
 */
function generateDefinitionQuestion(
  term: string,
  definition: string,
  allDefinitions: { term: string; definition: string }[]
): QuizQuestion | null {
  // Need at least 3 other definitions for distractors
  const others = allDefinitions.filter((d) => d.term !== term);
  if (others.length < 3) return null;

  // Shuffle and pick 3 distractors
  const distractors = others
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((d) => d.definition);

  const options = [definition, ...distractors].sort(() => Math.random() - 0.5);
  const correctIndex = options.indexOf(definition);

  return {
    question: `What is ${term}?`,
    options,
    correctIndex,
    explanation: `${term} is ${definition}.`,
    difficulty: "EASY",
  };
}

/**
 * Generate a concept true/false question
 */
function generateTrueFalseQuestion(concept: string, content: string): QuizQuestion | null {
  // Check if concept appears in a factual statement
  const sentences = content.split(/[.!?]+/).filter((s) => s.includes(concept));
  if (sentences.length === 0) return null;

  const sentence = sentences[0].trim();
  if (sentence.length < 20 || sentence.length > 200) return null;

  // Create true statement
  const trueStatement = sentence;

  // Create false statement by negating or altering
  const falsePatterns = [
    { from: /\bis\b/i, to: "is not" },
    { from: /\bcan\b/i, to: "cannot" },
    { from: /\bwill\b/i, to: "will not" },
    { from: /\bshould\b/i, to: "should not" },
    { from: /\bmust\b/i, to: "must not" },
  ];

  let falseStatement = trueStatement;
  for (const pattern of falsePatterns) {
    if (pattern.from.test(falseStatement)) {
      falseStatement = falseStatement.replace(pattern.from, pattern.to);
      break;
    }
  }

  if (falseStatement === trueStatement) return null;

  const isTrue = Math.random() > 0.5;
  const statement = isTrue ? trueStatement : falseStatement;

  return {
    question: `True or False: ${statement}`,
    options: ["True", "False"],
    correctIndex: isTrue ? 0 : 1,
    explanation: isTrue
      ? `This statement is true. ${trueStatement}`
      : `This statement is false. The correct statement is: ${trueStatement}`,
    difficulty: "MEDIUM",
  };
}

/**
 * Generate a command-based question
 */
function generateCommandQuestion(
  cmd: { command: string; description: string },
  allCommands: { command: string; description: string }[]
): QuizQuestion | null {
  const others = allCommands.filter((c) => c.command !== cmd.command);
  if (others.length < 3) return null;

  const distractors = others
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((c) => c.command);

  const options = [cmd.command, ...distractors].sort(() => Math.random() - 0.5);
  const correctIndex = options.indexOf(cmd.command);

  return {
    question: `Which command would you use to: ${cmd.description.toLowerCase()}?`,
    options: options.map((o) => `\`${o}\``),
    correctIndex,
    explanation: `The correct command is \`${cmd.command}\`. ${cmd.description}`,
    difficulty: "MEDIUM",
  };
}

/**
 * Generate a fill-in-the-blank question from code
 * (Reserved for future use with code-based lessons)
 */
function _generateCodeQuestion(code: string, _language: string): QuizQuestion | null {
  const lines = code.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
  if (lines.length < 2) return null;

  // Pick a line with a keyword or important element
  const keywords = [
    "function",
    "def",
    "class",
    "import",
    "export",
    "const",
    "let",
    "var",
    "if",
    "for",
    "while",
  ];
  let targetLine = lines.find((l) => keywords.some((k) => l.includes(k)));
  if (!targetLine) targetLine = lines[Math.floor(lines.length / 2)];

  // Find a word to blank out
  const words = targetLine.match(/\b\w{3,}\b/g);
  if (!words || words.length < 2) return null;

  const blankWord = words[Math.floor(Math.random() * words.length)];
  const blankedLine = targetLine.replace(blankWord, "________");

  // Generate distractors
  const distractors = ["variable", "function", "return", "import"]
    .filter((d) => d !== blankWord)
    .slice(0, 3);

  const options = [blankWord, ...distractors].sort(() => Math.random() - 0.5);
  const correctIndex = options.indexOf(blankWord);

  return {
    question: `Complete the code: \`${blankedLine}\``,
    options,
    correctIndex,
    explanation: `The correct answer is "${blankWord}". The complete line is: \`${targetLine}\``,
    difficulty: "HARD",
  };
}

/**
 * Generate quiz questions for a lesson
 */
function generateQuestionsForLesson(content: string, targetCount: number): QuizQuestion[] {
  const questions: QuizQuestion[] = [];

  // Extract content elements
  const concepts = extractKeyConcepts(content);
  const definitions = extractDefinitions(content);
  const commands = extractCommands(content);

  // Generate definition questions
  for (const def of definitions.slice(0, Math.ceil(targetCount / 3))) {
    const q = generateDefinitionQuestion(def.term, def.definition, definitions);
    if (q) questions.push(q);
  }

  // Generate concept questions
  for (const concept of concepts.slice(0, Math.ceil(targetCount / 3))) {
    const q = generateTrueFalseQuestion(concept, content);
    if (q) questions.push(q);
  }

  // Generate command questions
  for (const cmd of commands.slice(0, Math.ceil(targetCount / 3))) {
    const q = generateCommandQuestion(cmd, commands);
    if (q) questions.push(q);
  }

  // Shuffle and limit to target count
  return questions.sort(() => Math.random() - 0.5).slice(0, targetCount);
}

/**
 * Get lessons to process
 */
async function getLessonsToProcess(
  options: GeneratorOptions
): Promise<{ id: string; title: string; content: string }[]> {
  if (options.lessonId) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: options.lessonId },
      select: { id: true, title: true, content: true },
    });
    return lesson ? [lesson] : [];
  }

  if (options.pathId) {
    return prisma.lesson.findMany({
      where: { pathId: options.pathId },
      select: { id: true, title: true, content: true },
      orderBy: { orderIndex: "asc" },
    });
  }

  if (options.all) {
    // Get lessons without quizzes
    const lessonsWithQuizzes = await prisma.quizQuestion.findMany({
      select: { lessonId: true },
      distinct: ["lessonId"],
    });
    const lessonIdsWithQuizzes = new Set(lessonsWithQuizzes.map((q) => q.lessonId));

    const allLessons = await prisma.lesson.findMany({
      select: { id: true, title: true, content: true },
    });

    return allLessons.filter((l) => !lessonIdsWithQuizzes.has(l.id));
  }

  return [];
}

/**
 * Save quiz questions to database
 */
async function saveQuiz(lessonId: string, questions: QuizQuestion[]): Promise<void> {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await prisma.quizQuestion.create({
      data: {
        lessonId,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        orderIndex: i,
      },
    });
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log("🧠 Quiz Generator for Imported Lessons\n");

  const options = parseArgs();

  if (!options.dryRun) {
    prisma = new PrismaClient();
  }

  console.log(`   Target questions per lesson: ${options.questionsPerLesson}`);
  console.log(`   Mode: ${options.dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("");

  // For dry run without database, use sample content
  if (options.dryRun && !options.lessonId && !options.pathId) {
    console.log("📄 Running in dry-run mode with sample content...\n");

    const sampleContent = `
# Introduction to OpenBMC

## What is OpenBMC?

**OpenBMC** - An open-source project for building firmware for Baseboard Management Controllers.

**BMC** - Baseboard Management Controller, a specialized microcontroller for server management.

**IPMI** - Intelligent Platform Management Interface, a standard for hardware monitoring.

## Getting Started

To clone the OpenBMC repository:

\`\`\`bash
git clone https://github.com/openbmc/openbmc
\`\`\`

To build OpenBMC for the AST2600 EVB:

\`\`\`bash
source setup ast2600-evb
bitbake obmc-phosphor-image
\`\`\`

## Key Components

The BMC is responsible for:
- Power management
- Thermal monitoring
- Remote console access
- System health monitoring
`;

    const questions = generateQuestionsForLesson(sampleContent, options.questionsPerLesson);

    console.log("Generated Questions:\n");
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      console.log(`${i + 1}. [${q.difficulty}] ${q.question}`);
      for (let j = 0; j < q.options.length; j++) {
        console.log(
          `   ${j === q.correctIndex ? "✓" : " "} ${String.fromCharCode(65 + j)}. ${q.options[j]}`
        );
      }
      console.log(`   Explanation: ${q.explanation}\n`);
    }

    console.log(`\n✨ Generated ${questions.length} questions (dry run)`);
    return;
  }

  // Get lessons to process
  const lessons = await getLessonsToProcess(options);
  console.log(`📚 Found ${lessons.length} lessons to process\n`);

  if (lessons.length === 0) {
    console.log("No lessons found matching criteria.");
    await prisma.$disconnect();
    return;
  }

  let totalGenerated = 0;
  const results: GeneratedQuiz[] = [];

  for (const lesson of lessons) {
    console.log(`📝 Processing: ${lesson.title}`);

    const questions = generateQuestionsForLesson(lesson.content, options.questionsPerLesson);

    if (questions.length === 0) {
      console.log("   ⚠️  Could not generate questions (insufficient content)");
      continue;
    }

    results.push({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      questions,
    });

    if (!options.dryRun) {
      await saveQuiz(lesson.id, questions);
      console.log(`   ✅ Saved ${questions.length} questions`);
    } else {
      console.log(`   [DRY RUN] Would save ${questions.length} questions`);
    }

    totalGenerated += questions.length;
  }

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("📊 Generation Summary");
  console.log("═".repeat(60));
  console.log(`   Lessons processed: ${results.length}`);
  console.log(`   Total questions: ${totalGenerated}`);

  if (options.dryRun) {
    console.log("\n🔍 This was a dry run. No changes were made.");

    // Show sample questions
    if (results.length > 0) {
      console.log("\nSample questions from first lesson:\n");
      const sample = results[0];
      for (let i = 0; i < Math.min(3, sample.questions.length); i++) {
        const q = sample.questions[i];
        console.log(`${i + 1}. ${q.question}`);
        console.log(`   Answer: ${q.options[q.correctIndex]}\n`);
      }
    }
  }

  if (prisma) {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
