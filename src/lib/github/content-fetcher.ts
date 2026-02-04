/**
 * GitHub Content Fetcher Service
 *
 * Fetches content directly from openbmc-guide-tutorial GitHub Pages/repository.
 * Replaces NotebookLM integration with direct content delivery.
 */

export interface GitHubContentConfig {
  owner: string;
  repo: string;
  branch: string;
  pagesBaseUrl: string;
}

export interface FetchedContent {
  content: string;
  path: string;
  sha?: string;
  lastModified?: string;
}

export interface RepoFile {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
  url: string;
}

// Default configuration for openbmc-guide-tutorial
export const DEFAULT_CONFIG: GitHubContentConfig = {
  owner: "MichaelTien8901",
  repo: "openbmc-guide-tutorial",
  branch: "master",
  pagesBaseUrl: "https://MichaelTien8901.github.io/openbmc-guide-tutorial",
};

/**
 * Fetch raw markdown content from GitHub repository
 */
export async function fetchRawContent(
  path: string,
  config: GitHubContentConfig = DEFAULT_CONFIG
): Promise<FetchedContent> {
  // Use raw.githubusercontent.com for direct file access
  const rawUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${path}`;

  const response = await fetch(rawUrl, {
    headers: {
      Accept: "text/plain",
    },
    cache: "no-store", // Always fetch fresh content
  });

  if (!response.ok) {
    throw new GitHubContentError(
      `Failed to fetch content from ${path}: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  const content = await response.text();

  return {
    content,
    path,
    lastModified: response.headers.get("last-modified") || undefined,
  };
}

/**
 * Fetch content via GitHub API (includes metadata)
 */
export async function fetchContentViaApi(
  path: string,
  config: GitHubContentConfig = DEFAULT_CONFIG,
  token?: string
): Promise<FetchedContent> {
  const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}`;

  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(apiUrl, {
    headers,
    cache: "no-store", // Always fetch fresh content
  });

  if (!response.ok) {
    throw new GitHubContentError(
      `GitHub API error for ${path}: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  const data = await response.json();

  if (data.type !== "file") {
    throw new GitHubContentError(`Path ${path} is not a file`, 400);
  }

  // Content is base64 encoded
  const content = Buffer.from(data.content, "base64").toString("utf-8");

  return {
    content,
    path,
    sha: data.sha,
  };
}

/**
 * List directory contents from GitHub repository
 */
export async function listDirectory(
  path: string,
  config: GitHubContentConfig = DEFAULT_CONFIG,
  token?: string
): Promise<RepoFile[]> {
  const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}`;

  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(apiUrl, {
    headers,
    cache: "no-store", // Always fetch fresh content
  });

  if (!response.ok) {
    throw new GitHubContentError(
      `GitHub API error listing ${path}: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new GitHubContentError(`Path ${path} is not a directory`, 400);
  }

  return data.map((item: Record<string, unknown>) => ({
    name: item.name as string,
    path: item.path as string,
    type: item.type as "file" | "dir",
    sha: item.sha as string,
    url: item.html_url as string,
  }));
}

/**
 * Build GitHub Pages URL from repository path
 */
export function buildPagesUrl(
  repositoryPath: string,
  config: GitHubContentConfig = DEFAULT_CONFIG
): string {
  // Remove file extension and 'docs/' prefix for GitHub Pages URL
  let pagePath = repositoryPath
    .replace(/^docs\//, "")
    .replace(/\.md$/, "")
    .replace(/\/index$/, "/");

  // Ensure trailing slash for directory-style URLs
  if (!pagePath.endsWith("/")) {
    pagePath += "/";
  }

  return `${config.pagesBaseUrl}/${pagePath}`;
}

/**
 * Extract frontmatter and content from markdown
 */
export function parseMarkdown(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const [, yamlContent, body] = match;
  const frontmatter: Record<string, unknown> = {};

  // Simple YAML parsing for common fields
  yamlContent.split("\n").forEach((line) => {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value: string | boolean | number = line.slice(colonIndex + 1).trim();

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Parse booleans and numbers
      if (value === "true") value = true;
      else if (value === "false") value = false;
      else if (!isNaN(Number(value)) && value !== "") value = Number(value);

      frontmatter[key] = value;
    }
  });

  return { frontmatter, body: body.trim() };
}

/**
 * Custom error class for GitHub content operations
 */
export class GitHubContentError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "GitHubContentError";
  }
}
