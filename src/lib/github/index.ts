/**
 * GitHub Content Integration
 *
 * Direct content delivery from openbmc-guide-tutorial GitHub Pages.
 * Replaces NotebookLM MCP integration.
 */

export {
  fetchRawContent,
  fetchContentViaApi,
  listDirectory,
  buildPagesUrl,
  parseMarkdown,
  GitHubContentError,
  DEFAULT_CONFIG,
  type GitHubContentConfig,
  type FetchedContent,
  type RepoFile,
} from "./content-fetcher";

export {
  discoverLessons,
  toLessonCreateInput,
  type DiscoveredLesson,
  type DiscoveredCategory,
} from "./repo-parser";
