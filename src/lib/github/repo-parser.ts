/**
 * Repository Structure Parser
 *
 * Parses the openbmc-guide-tutorial repository structure to discover
 * lessons and build learning path mappings.
 */

import {
  listDirectory,
  fetchRawContent,
  parseMarkdown,
  buildPagesUrl,
  GitHubContentConfig,
  DEFAULT_CONFIG,
  RepoFile,
} from "./content-fetcher";

export interface DiscoveredLesson {
  slug: string;
  title: string;
  description?: string;
  repositoryPath: string;
  sourceUrl: string;
  category: string;
  order: number;
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  estimatedMinutes?: number;
}

export interface DiscoveredCategory {
  slug: string;
  title: string;
  description?: string;
  lessons: DiscoveredLesson[];
  order: number;
}

// Category metadata for known directories
const CATEGORY_METADATA: Record<
  string,
  { title: string; description: string; order: number; difficulty: string }
> = {
  intro: {
    title: "Introduction to OpenBMC",
    description: "Get started with OpenBMC fundamentals",
    order: 1,
    difficulty: "BEGINNER",
  },
  setup: {
    title: "Development Setup",
    description: "Set up your development environment",
    order: 2,
    difficulty: "BEGINNER",
  },
  dbus: {
    title: "D-Bus Fundamentals",
    description: "Learn D-Bus communication in OpenBMC",
    order: 3,
    difficulty: "INTERMEDIATE",
  },
  phosphor: {
    title: "Phosphor Services",
    description: "Understanding phosphor-* services",
    order: 4,
    difficulty: "INTERMEDIATE",
  },
  sensors: {
    title: "Sensor Management",
    description: "Hardware monitoring and sensors",
    order: 5,
    difficulty: "INTERMEDIATE",
  },
  redfish: {
    title: "Redfish API",
    description: "REST API for server management",
    order: 6,
    difficulty: "INTERMEDIATE",
  },
  yocto: {
    title: "Yocto & Recipes",
    description: "Build system and custom recipes",
    order: 7,
    difficulty: "ADVANCED",
  },
  debugging: {
    title: "Debugging & Troubleshooting",
    description: "Debug and troubleshoot OpenBMC",
    order: 8,
    difficulty: "ADVANCED",
  },
};

/**
 * Discover all lessons from the repository
 */
export async function discoverLessons(
  config: GitHubContentConfig = DEFAULT_CONFIG,
  token?: string
): Promise<DiscoveredCategory[]> {
  const categories: DiscoveredCategory[] = [];

  try {
    // List the docs directory
    const docsContents = await listDirectory("docs", config, token);

    // Filter to directories only (categories)
    const categoryDirs = docsContents.filter((item) => item.type === "dir");

    for (const categoryDir of categoryDirs) {
      const category = await discoverCategory(categoryDir, config, token);
      if (category && category.lessons.length > 0) {
        categories.push(category);
      }
    }

    // Sort categories by order
    categories.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error("Error discovering lessons:", error);
    throw error;
  }

  return categories;
}

/**
 * Discover lessons within a category directory
 */
async function discoverCategory(
  categoryDir: RepoFile,
  config: GitHubContentConfig,
  token?: string
): Promise<DiscoveredCategory | null> {
  const categorySlug = categoryDir.name;
  const metadata = CATEGORY_METADATA[categorySlug] || {
    title: formatTitle(categorySlug),
    description: `Content from ${categorySlug}`,
    order: 99,
    difficulty: "INTERMEDIATE",
  };

  const lessons: DiscoveredLesson[] = [];

  try {
    const contents = await listDirectory(categoryDir.path, config, token);
    const markdownFiles = contents.filter(
      (item) => item.type === "file" && item.name.endsWith(".md")
    );

    let order = 0;
    for (const file of markdownFiles) {
      const lesson = await parseLesson(
        file,
        categorySlug,
        metadata.difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
        order++,
        config
      );
      if (lesson) {
        lessons.push(lesson);
      }
    }

    // Sort lessons by order (index.md first, then alphabetically)
    lessons.sort((a, b) => {
      if (a.slug.endsWith("-index")) return -1;
      if (b.slug.endsWith("-index")) return 1;
      return a.order - b.order;
    });
  } catch (error) {
    console.error(`Error discovering category ${categorySlug}:`, error);
  }

  return {
    slug: categorySlug,
    title: metadata.title,
    description: metadata.description,
    lessons,
    order: metadata.order,
  };
}

/**
 * Parse a markdown file into a lesson object
 */
async function parseLesson(
  file: RepoFile,
  category: string,
  defaultDifficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
  order: number,
  config: GitHubContentConfig
): Promise<DiscoveredLesson | null> {
  try {
    const { content } = await fetchRawContent(file.path, config);
    const { frontmatter, body } = parseMarkdown(content);

    // Generate slug from filename
    const filename = file.name.replace(/\.md$/, "");
    const slug = `${category}-${filename}`;

    // Extract title from frontmatter or first heading
    let title = frontmatter.title as string | undefined;
    if (!title) {
      const headingMatch = body.match(/^#\s+(.+)$/m);
      title = headingMatch ? headingMatch[1] : formatTitle(filename);
    }

    // Extract description from frontmatter or first paragraph
    let description = frontmatter.description as string | undefined;
    if (!description) {
      const paragraphMatch = body.match(/^(?!#)(.{10,200}?)(?:\n|$)/m);
      description = paragraphMatch ? paragraphMatch[1].trim() : undefined;
    }

    return {
      slug,
      title,
      description,
      repositoryPath: file.path,
      sourceUrl: buildPagesUrl(file.path, config),
      category,
      order: (frontmatter.order as number) || order,
      difficulty:
        (frontmatter.difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED") || defaultDifficulty,
      estimatedMinutes: (frontmatter.estimatedMinutes as number) || 15,
    };
  } catch (error) {
    console.error(`Error parsing lesson ${file.path}:`, error);
    return null;
  }
}

/**
 * Format a slug into a human-readable title
 */
function formatTitle(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Sync discovered lessons to database format
 */
export function toLessonCreateInput(lesson: DiscoveredLesson) {
  return {
    slug: lesson.slug,
    title: lesson.title,
    description: lesson.description,
    content: "", // Will be fetched on demand
    sourceUrl: lesson.sourceUrl,
    repositoryPath: lesson.repositoryPath,
    displayMode: "RENDER" as const,
    difficulty: lesson.difficulty || "BEGINNER",
    estimatedMinutes: lesson.estimatedMinutes || 15,
    published: true,
  };
}
