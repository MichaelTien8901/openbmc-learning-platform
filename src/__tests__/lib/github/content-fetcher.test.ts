import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchRawContent,
  buildPagesUrl,
  parseMarkdown,
  GitHubContentError,
  DEFAULT_CONFIG,
} from "@/lib/github/content-fetcher";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("GitHub Content Fetcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchRawContent", () => {
    it("should fetch raw content from GitHub", async () => {
      const mockContent = "# Hello World\n\nThis is content.";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockContent),
        headers: new Headers({ "last-modified": "2024-01-01" }),
      });

      const result = await fetchRawContent("docs/intro/hello.md");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("raw.githubusercontent.com"),
        expect.any(Object)
      );
      expect(result.content).toBe(mockContent);
      expect(result.path).toBe("docs/intro/hello.md");
    });

    it("should throw GitHubContentError on fetch failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(fetchRawContent("docs/nonexistent.md")).rejects.toThrow(GitHubContentError);
    });
  });

  describe("buildPagesUrl", () => {
    it("should build correct GitHub Pages URL from repo path", () => {
      const url = buildPagesUrl("docs/intro/what-is-openbmc.md");
      expect(url).toBe(
        "https://MichaelTien8901.github.io/openbmc-guide-tutorial/intro/what-is-openbmc/"
      );
    });

    it("should handle index.md files", () => {
      const url = buildPagesUrl("docs/intro/index.md");
      expect(url).toBe("https://MichaelTien8901.github.io/openbmc-guide-tutorial/intro/");
    });

    it("should use custom config", () => {
      const customConfig = {
        ...DEFAULT_CONFIG,
        pagesBaseUrl: "https://example.com/docs",
      };
      const url = buildPagesUrl("docs/intro/test.md", customConfig);
      expect(url).toBe("https://example.com/docs/intro/test/");
    });
  });

  describe("parseMarkdown", () => {
    it("should extract frontmatter from markdown", () => {
      const content = `---
title: Test Title
description: Test description
order: 5
---

# Content

This is the body.`;

      const result = parseMarkdown(content);

      expect(result.frontmatter.title).toBe("Test Title");
      expect(result.frontmatter.description).toBe("Test description");
      expect(result.frontmatter.order).toBe(5);
      expect(result.body).toContain("# Content");
    });

    it("should handle content without frontmatter", () => {
      const content = "# Just Content\n\nNo frontmatter here.";
      const result = parseMarkdown(content);

      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe(content);
    });

    it("should parse boolean values in frontmatter", () => {
      const content = `---
published: true
draft: false
---

Content`;

      const result = parseMarkdown(content);

      expect(result.frontmatter.published).toBe(true);
      expect(result.frontmatter.draft).toBe(false);
    });
  });

  describe("DEFAULT_CONFIG", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_CONFIG.owner).toBe("MichaelTien8901");
      expect(DEFAULT_CONFIG.repo).toBe("openbmc-guide-tutorial");
      expect(DEFAULT_CONFIG.branch).toBe("main");
      expect(DEFAULT_CONFIG.pagesBaseUrl).toBe(
        "https://MichaelTien8901.github.io/openbmc-guide-tutorial"
      );
    });
  });
});
