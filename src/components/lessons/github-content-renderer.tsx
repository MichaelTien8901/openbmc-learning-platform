"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Info,
  AlertTriangle,
  Lightbulb,
  List,
  ChevronRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GitHubContentRendererProps {
  repositoryPath: string;
  sourceUrl: string;
  title?: string;
  className?: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
  onScrollProgress?: (progress: number) => void;
}

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

// GitHub repository info for URL rewriting
const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/MichaelTien8901/openbmc-guide-tutorial/main";
const GITHUB_PAGES_BASE = "https://michaeltien8901.github.io/openbmc-guide-tutorial";

/**
 * GitHubContentRenderer - Enhanced fetch and render mode for GitHub content
 *
 * Features:
 * - Fetches raw markdown from GitHub and renders with platform styling
 * - Auto-generates table of contents from headings
 * - Rewrites relative image paths to GitHub raw URLs
 * - Syntax highlighting with copy button
 * - GitHub-style admonition support (NOTE, WARNING, TIP, etc.)
 * - Heading anchors for deep linking
 * - Scroll progress tracking
 */
export function GitHubContentRenderer({
  repositoryPath,
  sourceUrl,
  title,
  className = "",
  onLoad,
  onError,
  onScrollProgress,
}: GitHubContentRendererProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTOC, setShowTOC] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Extract directory path for relative URL resolution
  const basePath = useMemo(() => {
    const parts = repositoryPath.split("/");
    parts.pop(); // Remove filename
    return parts.join("/");
  }, [repositoryPath]);

  // Generate TOC from content
  const tocItems = useMemo((): TOCItem[] => {
    if (!content) return [];
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const items: TOCItem[] = [];
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`]/g, ""); // Remove markdown formatting
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      items.push({ id, text, level });
    }
    return items;
  }, [content]);

  // Rewrite relative image URLs to GitHub raw URLs
  const processContent = useCallback(
    (rawContent: string): string => {
      // Remove frontmatter
      let processed = rawContent.replace(/^---\n[\s\S]*?\n---\n/, "");

      // Rewrite relative image paths
      // Match: ![alt](./path) or ![alt](path) or ![alt](../path)
      processed = processed.replace(
        /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
        (match, alt, path) => {
          // Handle relative paths
          let absolutePath: string;
          if (path.startsWith("./")) {
            absolutePath = `${basePath}/${path.slice(2)}`;
          } else if (path.startsWith("../")) {
            const parentParts = basePath.split("/");
            parentParts.pop();
            absolutePath = `${parentParts.join("/")}/${path.slice(3)}`;
          } else if (path.startsWith("/")) {
            absolutePath = path.slice(1);
          } else {
            absolutePath = `${basePath}/${path}`;
          }
          return `![${alt}](${GITHUB_RAW_BASE}/${absolutePath})`;
        }
      );

      // Process GitHub-style admonitions: > [!NOTE], > [!WARNING], > [!TIP], > [!IMPORTANT], > [!CAUTION]
      processed = processed.replace(
        /> \[!(NOTE|WARNING|TIP|IMPORTANT|CAUTION)\]\n((?:>.*\n?)*)/gi,
        (match, type, content) => {
          const cleanContent = content
            .split("\n")
            .map((line: string) => line.replace(/^>\s?/, ""))
            .join("\n")
            .trim();
          return `:::${type.toLowerCase()}\n${cleanContent}\n:::\n`;
        }
      );

      return processed;
    },
    [basePath]
  );

  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/content/raw/${repositoryPath}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status}`);
      }

      const text = await response.text();
      setContent(processContent(text));
      onLoad?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load content";
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [repositoryPath, processContent, onLoad, onError]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Track scroll progress
  useEffect(() => {
    if (!contentRef.current || !onScrollProgress) return;

    const handleScroll = () => {
      const element = contentRef.current;
      if (!element) return;

      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const progress = scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0;

      onScrollProgress(progress);
    };

    const element = contentRef.current;
    element.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, [onScrollProgress]);

  // Copy code to clipboard
  const copyToClipboard = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  // Scroll to heading
  const scrollToHeading = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setShowTOC(false);
    }
  }, []);

  // Render admonition blocks
  const renderAdmonition = (type: string, children: React.ReactNode) => {
    const config: Record<string, { icon: React.ReactNode; className: string; title: string }> = {
      note: {
        icon: <Info className="h-5 w-5" />,
        className: "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
        title: "Note",
      },
      tip: {
        icon: <Lightbulb className="h-5 w-5" />,
        className: "border-green-500 bg-green-50 dark:bg-green-950/30",
        title: "Tip",
      },
      warning: {
        icon: <AlertTriangle className="h-5 w-5" />,
        className: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30",
        title: "Warning",
      },
      important: {
        icon: <AlertCircle className="h-5 w-5" />,
        className: "border-purple-500 bg-purple-50 dark:bg-purple-950/30",
        title: "Important",
      },
      caution: {
        icon: <AlertTriangle className="h-5 w-5" />,
        className: "border-red-500 bg-red-50 dark:bg-red-950/30",
        title: "Caution",
      },
    };

    const { icon, className, title } = config[type] || config.note;

    return (
      <div className={`my-4 rounded-lg border-l-4 p-4 ${className}`}>
        <div className="mb-2 flex items-center gap-2 font-semibold">
          {icon}
          {title}
        </div>
        <div className="text-sm">{children}</div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header with source link and TOC toggle */}
      <div className="bg-muted/50 sticky top-0 z-10 flex items-center justify-between border-b px-4 py-2">
        <span className="text-muted-foreground text-sm">{title || "Lesson Content"}</span>
        <div className="flex items-center gap-2">
          {tocItems.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTOC(!showTOC)}
              className={showTOC ? "bg-accent" : ""}
            >
              <List className="mr-1 h-4 w-4" />
              TOC
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={fetchContent} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" />
              View Original
            </a>
          </Button>
        </div>
      </div>

      {/* Table of Contents sidebar */}
      {showTOC && tocItems.length > 0 && (
        <div className="bg-muted/30 border-b p-4">
          <h3 className="mb-2 text-sm font-semibold">Table of Contents</h3>
          <nav className="max-h-64 overflow-y-auto">
            <ul className="space-y-1">
              {tocItems.map((item, index) => (
                <li key={index} style={{ paddingLeft: `${(item.level - 1) * 12}px` }}>
                  <button
                    onClick={() => scrollToHeading(item.id)}
                    className="hover:text-primary text-muted-foreground flex items-center gap-1 text-left text-sm transition-colors"
                  >
                    <ChevronRight className="h-3 w-3 flex-shrink-0" />
                    <span className="line-clamp-1">{item.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      {/* Content area */}
      <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
              <span className="text-muted-foreground text-sm">Loading content...</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button variant="link" className="ml-2 h-auto p-0" onClick={fetchContent}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Rendered markdown */}
        {content && !isLoading && (
          <article className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Headings with anchor links
                h1({ children, ...props }) {
                  const text = String(children);
                  const id = text
                    .toLowerCase()
                    .replace(/[^\w\s-]/g, "")
                    .replace(/\s+/g, "-");
                  return (
                    <h1 id={id} className="group scroll-mt-20" {...props}>
                      {children}
                      <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-100">
                        #
                      </a>
                    </h1>
                  );
                },
                h2({ children, ...props }) {
                  const text = String(children);
                  const id = text
                    .toLowerCase()
                    .replace(/[^\w\s-]/g, "")
                    .replace(/\s+/g, "-");
                  return (
                    <h2 id={id} className="group scroll-mt-20" {...props}>
                      {children}
                      <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-100">
                        #
                      </a>
                    </h2>
                  );
                },
                h3({ children, ...props }) {
                  const text = String(children);
                  const id = text
                    .toLowerCase()
                    .replace(/[^\w\s-]/g, "")
                    .replace(/\s+/g, "-");
                  return (
                    <h3 id={id} className="group scroll-mt-20" {...props}>
                      {children}
                      <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-100">
                        #
                      </a>
                    </h3>
                  );
                },
                // Code blocks with copy button
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const isInline = !match;
                  const codeString = String(children).replace(/\n$/, "");

                  if (isInline) {
                    return (
                      <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm" {...props}>
                        {children}
                      </code>
                    );
                  }

                  return (
                    <div className="group relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => copyToClipboard(codeString)}
                      >
                        {copiedCode === codeString ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        className="!mt-4 !mb-4 rounded-lg"
                        showLineNumbers
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  );
                },
                // External links with icon
                a({ href, children, ...props }) {
                  const isExternal = href?.startsWith("http");
                  // Rewrite relative links to GitHub Pages
                  let finalHref = href;
                  if (href && !isExternal && !href.startsWith("#")) {
                    finalHref = `${GITHUB_PAGES_BASE}/${href.replace(/\.md$/, "")}`;
                  }
                  return (
                    <a
                      href={finalHref}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      className="text-primary hover:underline"
                      {...props}
                    >
                      {children}
                      {isExternal && <ExternalLink className="ml-1 inline-block h-3 w-3" />}
                    </a>
                  );
                },
                // Responsive tables
                table({ children, ...props }) {
                  return (
                    <div className="my-4 overflow-x-auto">
                      <table className="min-w-full border-collapse" {...props}>
                        {children}
                      </table>
                    </div>
                  );
                },
                // Images with lazy loading
                img({ src, alt, ...props }) {
                  return (
                    <img
                      src={src}
                      alt={alt || ""}
                      loading="lazy"
                      className="mx-auto max-w-full rounded-lg shadow-md"
                      {...props}
                    />
                  );
                },
                // Custom admonition blocks
                p({ children, ...props }) {
                  const text = String(children);
                  // Check for admonition syntax :::type ... :::
                  const admonitionMatch = text.match(
                    /^:::(note|tip|warning|important|caution)\n([\s\S]*?):::$/i
                  );
                  if (admonitionMatch) {
                    return renderAdmonition(admonitionMatch[1].toLowerCase(), admonitionMatch[2]);
                  }
                  return <p {...props}>{children}</p>;
                },
                // Blockquotes (also check for admonitions)
                blockquote({ children, ...props }) {
                  return (
                    <blockquote
                      className="border-muted-foreground/30 border-l-4 pl-4 italic"
                      {...props}
                    >
                      {children}
                    </blockquote>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}
