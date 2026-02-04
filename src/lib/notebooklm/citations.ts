/**
 * Citation parsing and link generation utilities
 */

import type { Citation } from "./types";

// Pattern to match citation markers like [1], [2], etc.
const CITATION_MARKER_PATTERN = /\[(\d+)\]/g;

// Pattern to match inline citations like [Source: document.md]
const INLINE_CITATION_PATTERN = /\[Source:\s*([^\]]+)\]/gi;

// Pattern to match markdown-style links
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Parse citations from NotebookLM response text
 */
export function parseCitations(
  text: string,
  sourceDocuments?: string[]
): { cleanText: string; citations: Citation[] } {
  const citations: Citation[] = [];
  let cleanText = text;

  // Extract numbered citations [1], [2], etc.
  const numberedMatches = text.match(CITATION_MARKER_PATTERN);
  if (numberedMatches && sourceDocuments) {
    const uniqueNumbers = [...new Set(numberedMatches.map((m) => parseInt(m.slice(1, -1))))];
    for (const num of uniqueNumbers) {
      if (num > 0 && num <= sourceDocuments.length) {
        citations.push({
          text: `Reference ${num}`,
          source: sourceDocuments[num - 1],
        });
      }
    }
  }

  // Extract inline citations [Source: ...]
  let match;
  while ((match = INLINE_CITATION_PATTERN.exec(text)) !== null) {
    citations.push({
      text: match[1].trim(),
      source: match[1].trim(),
    });
  }

  // Remove citation markers from text for cleaner display
  cleanText = cleanText.replace(CITATION_MARKER_PATTERN, "");
  cleanText = cleanText.replace(INLINE_CITATION_PATTERN, "");
  cleanText = cleanText.replace(/\s+/g, " ").trim();

  return { cleanText, citations };
}

/**
 * Generate a link for a citation based on source type
 */
export function generateCitationLink(citation: Citation): string | null {
  const source = citation.source.toLowerCase();

  // GitHub documentation links
  if (source.includes("github.com") || source.includes("openbmc")) {
    // Try to construct a GitHub link
    if (source.startsWith("http")) {
      return source;
    }
    // Assume it's a file path in openbmc repos
    return `https://github.com/openbmc/docs/blob/master/${citation.source}`;
  }

  // Markdown files
  if (source.endsWith(".md") || source.endsWith(".rst")) {
    return `/docs/${citation.source}`;
  }

  // If it's already a URL
  if (source.startsWith("http://") || source.startsWith("https://")) {
    return citation.source;
  }

  // Section references
  if (citation.pageOrSection) {
    return `#${citation.pageOrSection.toLowerCase().replace(/\s+/g, "-")}`;
  }

  return null;
}

/**
 * Format citations for display with links
 */
export function formatCitationsForDisplay(
  citations: Citation[]
): Array<{ text: string; source: string; link: string | null }> {
  return citations.map((citation, index) => ({
    text: citation.text || `Source ${index + 1}`,
    source: citation.source,
    link: generateCitationLink(citation),
  }));
}

/**
 * Add citation links to text
 */
export function addCitationLinksToText(text: string, citations: Citation[]): string {
  let linkedText = text;

  // Replace numbered citations with linked versions
  linkedText = linkedText.replace(CITATION_MARKER_PATTERN, (match, num) => {
    const index = parseInt(num) - 1;
    if (index >= 0 && index < citations.length) {
      const link = generateCitationLink(citations[index]);
      if (link) {
        return `[${num}](${link})`;
      }
    }
    return match;
  });

  return linkedText;
}

/**
 * Extract source documents mentioned in NotebookLM response
 */
export function extractSourceMentions(text: string): string[] {
  const sources: string[] = [];

  // Look for patterns like "According to [document]" or "As mentioned in [document]"
  const mentionPatterns = [
    /according to\s+["']?([^"'\n,]+)["']?/gi,
    /as (?:mentioned|described|explained) in\s+["']?([^"'\n,]+)["']?/gi,
    /from\s+(?:the\s+)?["']?([^"'\n,]+\.(?:md|rst|txt))["']?/gi,
    /see\s+["']?([^"'\n,]+)["']?/gi,
  ];

  for (const pattern of mentionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const source = match[1].trim();
      if (source && !sources.includes(source)) {
        sources.push(source);
      }
    }
  }

  return sources;
}

/**
 * Create a citation summary block for display
 */
export function createCitationSummary(citations: Citation[]): string {
  if (citations.length === 0) {
    return "";
  }

  const formatted = formatCitationsForDisplay(citations);
  const lines = formatted.map((c, i) => {
    if (c.link) {
      return `${i + 1}. [${c.source}](${c.link})`;
    }
    return `${i + 1}. ${c.source}`;
  });

  return `\n\n**Sources:**\n${lines.join("\n")}`;
}
