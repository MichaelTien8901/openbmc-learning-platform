#!/usr/bin/env tsx
/**
 * NotebookLM Topic Mapper
 *
 * Analyzes lesson content and suggests NotebookLM topics for better
 * AI-powered Q&A integration.
 *
 * Usage:
 *   npx tsx scripts/import/map-to-notebooklm.ts [options]
 *
 * Options:
 *   --lesson-id <id>    Map topics for specific lesson
 *   --path-id <id>      Map topics for all lessons in a path
 *   --all               Map topics for all lessons
 *   --dry-run           Preview without saving
 */

import { PrismaClient } from "@/generated/prisma";

// Types
interface TopicMapping {
  lessonId: string;
  lessonTitle: string;
  suggestedTopics: string[];
  confidence: number;
  matchedKeywords: string[];
}

interface MappingOptions {
  lessonId?: string;
  pathId?: string;
  all: boolean;
  dryRun: boolean;
}

// NotebookLM topic keywords for OpenBMC
const TOPIC_KEYWORDS: Record<string, string[]> = {
  openbmc: ["openbmc", "phosphor", "bmc", "baseboard management", "firmware", "embedded linux"],
  dbus: [
    "d-bus",
    "dbus",
    "bus",
    "interface",
    "signal",
    "method",
    "property",
    "phosphor-dbus",
    "xyz.openbmc",
    "org.openbmc",
  ],
  sensors: [
    "sensor",
    "hwmon",
    "temperature",
    "voltage",
    "fan speed",
    "power consumption",
    "threshold",
    "monitoring",
  ],
  redfish: ["redfish", "bmcweb", "rest api", "odata", "schemas", "dmtf", "ssdp"],
  ipmi: ["ipmi", "ipmitool", "fru", "sel", "sdr", "lan", "kcs", "bt interface"],
  qemu: [
    "qemu",
    "ast2600",
    "ast2500",
    "romulus",
    "evb",
    "emulator",
    "virtual machine",
    "simulation",
  ],
  yocto: [
    "yocto",
    "bitbake",
    "recipe",
    "layer",
    "poky",
    "meta-phosphor",
    "machine",
    "distro",
    "image",
  ],
  firmware: ["firmware", "update", "flash", "pnor", "bios", "uefi", "code update", "version"],
  "platform-porting": [
    "porting",
    "device tree",
    "dts",
    "u-boot",
    "machine layer",
    "board",
    "hardware",
    "bring-up",
  ],
  security: [
    "security",
    "authentication",
    "authorization",
    "ldap",
    "pam",
    "certificate",
    "tls",
    "ssl",
    "spdm",
    "measured boot",
  ],
  power: ["power", "chassis", "host", "state", "on", "off", "reboot", "reset", "power management"],
  logging: ["log", "journal", "sel", "event", "error", "phosphor-logging", "rsyslog"],
  network: ["network", "ethernet", "ip", "dhcp", "vlan", "interface", "systemd-networkd"],
  inventory: ["inventory", "fru", "asset", "serial number", "part number", "entity manager"],
};

// Prisma client
let prisma: PrismaClient;

/**
 * Parse command line arguments
 */
function parseArgs(): MappingOptions {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
NotebookLM Topic Mapper

Usage:
  npx tsx scripts/import/map-to-notebooklm.ts [options]

Options:
  --lesson-id <id>    Map topics for specific lesson
  --path-id <id>      Map topics for all lessons in a path
  --all               Map topics for all lessons
  --dry-run           Preview without saving

Examples:
  npx tsx scripts/import/map-to-notebooklm.ts --all --dry-run
  npx tsx scripts/import/map-to-notebooklm.ts --path-id cuid123
    `);
    process.exit(0);
  }

  const options: MappingOptions = {
    all: false,
    dryRun: false,
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
    }
  }

  if (!options.lessonId && !options.pathId && !options.all) {
    console.error("Error: Must specify --lesson-id, --path-id, or --all");
    process.exit(1);
  }

  return options;
}

/**
 * Analyze content and suggest topics
 */
function analyzeContent(content: string, title: string): TopicMapping {
  const lowerContent = content.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const combinedText = `${lowerTitle} ${lowerContent}`;

  const topicScores: Record<string, { score: number; matches: string[] }> = {};

  // Score each topic based on keyword matches
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const matches: string[] = [];
    let score = 0;

    for (const keyword of keywords) {
      // Count occurrences
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      const occurrences = (combinedText.match(regex) || []).length;

      if (occurrences > 0) {
        matches.push(keyword);
        // Title matches count more
        const titleMatches = (lowerTitle.match(regex) || []).length;
        score += occurrences + titleMatches * 3;
      }
    }

    if (score > 0) {
      topicScores[topic] = { score, matches };
    }
  }

  // Sort topics by score and take top ones
  const sortedTopics = Object.entries(topicScores)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 5);

  // Calculate confidence based on how many topics match
  const maxScore = sortedTopics[0]?.[1].score || 0;
  const confidence = Math.min(1, maxScore / 20);

  // Get all matched keywords
  const allMatches = sortedTopics.flatMap(([_, data]) => data.matches);

  return {
    lessonId: "",
    lessonTitle: title,
    suggestedTopics: sortedTopics.map(([topic]) => topic),
    confidence,
    matchedKeywords: [...new Set(allMatches)],
  };
}

/**
 * Get lessons to process
 */
async function getLessons(
  options: MappingOptions
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
    return prisma.lesson.findMany({
      select: { id: true, title: true, content: true },
    });
  }

  return [];
}

/**
 * Main entry point
 */
async function main() {
  console.log("🔗 NotebookLM Topic Mapper\n");

  const options = parseArgs();

  if (!options.dryRun) {
    prisma = new PrismaClient();
  }

  console.log(`   Mode: ${options.dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("");

  // For dry run without database, use sample content
  if (options.dryRun && !options.lessonId && !options.pathId) {
    console.log("📄 Running with sample content...\n");

    const sampleLessons = [
      {
        title: "Introduction to D-Bus in OpenBMC",
        content: `
D-Bus is the primary inter-process communication mechanism in OpenBMC.
The phosphor-dbus-interfaces repository defines the xyz.openbmc_project interfaces.
Services expose D-Bus objects that can be accessed via busctl or programmatically.
Key concepts include signals, methods, and properties on interfaces.
        `,
      },
      {
        title: "Setting Up QEMU for OpenBMC Development",
        content: `
QEMU provides a way to test OpenBMC images without physical hardware.
The ast2600-evb machine target emulates an ASPEED AST2600 BMC.
Use bitbake to build an image and qemu-system-arm to run it.
This allows testing sensors, redfish, and other BMC functionality.
        `,
      },
      {
        title: "Implementing Redfish APIs with bmcweb",
        content: `
bmcweb is the web server that implements the Redfish REST API.
It provides DMTF-compliant endpoints for system management.
OData schemas define the resource structure.
Authentication uses session tokens or basic auth.
        `,
      },
    ];

    const mappings: TopicMapping[] = [];

    for (const lesson of sampleLessons) {
      const mapping = analyzeContent(lesson.content, lesson.title);
      mapping.lessonTitle = lesson.title;
      mappings.push(mapping);

      console.log(`📝 ${lesson.title}`);
      console.log(`   Topics: ${mapping.suggestedTopics.join(", ") || "none"}`);
      console.log(`   Confidence: ${(mapping.confidence * 100).toFixed(0)}%`);
      console.log(`   Keywords: ${mapping.matchedKeywords.slice(0, 5).join(", ")}`);
      console.log("");
    }

    // Generate summary
    console.log("═".repeat(60));
    console.log("📊 Topic Coverage Summary");
    console.log("═".repeat(60));

    const topicCounts: Record<string, number> = {};
    for (const mapping of mappings) {
      for (const topic of mapping.suggestedTopics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    }

    for (const [topic, count] of Object.entries(topicCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${topic}: ${count} lessons`);
    }

    console.log("\n✨ This was a dry run with sample content.");
    return;
  }

  // Get lessons from database
  const lessons = await getLessons(options);
  console.log(`📚 Processing ${lessons.length} lessons...\n`);

  if (lessons.length === 0) {
    console.log("No lessons found.");
    await prisma.$disconnect();
    return;
  }

  const mappings: TopicMapping[] = [];

  for (const lesson of lessons) {
    const mapping = analyzeContent(lesson.content, lesson.title);
    mapping.lessonId = lesson.id;
    mapping.lessonTitle = lesson.title;
    mappings.push(mapping);

    console.log(`📝 ${lesson.title}`);
    console.log(`   Topics: ${mapping.suggestedTopics.join(", ") || "none"}`);
    console.log(`   Confidence: ${(mapping.confidence * 100).toFixed(0)}%`);

    // Update lesson metadata if not dry run
    if (!options.dryRun && mapping.suggestedTopics.length > 0) {
      // Note: This would update a metadata field on the lesson
      // For now, just log what would be updated
      console.log(`   [Would update notebookTopics in database]`);
    }

    console.log("");
  }

  // Generate summary
  console.log("═".repeat(60));
  console.log("📊 Topic Coverage Summary");
  console.log("═".repeat(60));

  const topicCounts: Record<string, number> = {};
  for (const mapping of mappings) {
    for (const topic of mapping.suggestedTopics) {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }
  }

  for (const [topic, count] of Object.entries(topicCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${topic}: ${count} lessons`);
  }

  // Identify gaps
  const coveredTopics = new Set(Object.keys(topicCounts));
  const allTopics = new Set(Object.keys(TOPIC_KEYWORDS));
  const missingTopics = [...allTopics].filter((t) => !coveredTopics.has(t));

  if (missingTopics.length > 0) {
    console.log("\n⚠️  Topics not covered by any lesson:");
    for (const topic of missingTopics) {
      console.log(`   - ${topic}`);
    }
  }

  if (options.dryRun) {
    console.log("\n🔍 This was a dry run. No changes were made.");
  }

  if (prisma) {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
