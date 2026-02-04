"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
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

/**
 * GitHubContentRenderer - Fetch and render mode for GitHub content
 *
 * Fetches raw markdown from GitHub and renders with platform styling.
 * Provides better progress tracking and consistent UX.
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
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/content/raw/${repositoryPath}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status}`);
      }

      const text = await response.text();

      // Remove frontmatter if present
      const contentWithoutFrontmatter = text.replace(/^---\n[\s\S]*?\n---\n/, "");
      setContent(contentWithoutFrontmatter);
      onLoad?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load content";
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [repositoryPath, onLoad, onError]);

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

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header with source link */}
      <div className="bg-muted/50 sticky top-0 z-10 flex items-center justify-between border-b px-4 py-2">
        <span className="text-muted-foreground text-sm">{title || "Lesson Content"}</span>
        <div className="flex items-center gap-2">
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
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const isInline = !match;

                  return isInline ? (
                    <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm" {...props}>
                      {children}
                    </code>
                  ) : (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      className="!mt-4 !mb-4 rounded-lg"
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  );
                },
                a({ href, children, ...props }) {
                  const isExternal = href?.startsWith("http");
                  return (
                    <a
                      href={href}
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
                table({ children, ...props }) {
                  return (
                    <div className="my-4 overflow-x-auto">
                      <table className="min-w-full border-collapse" {...props}>
                        {children}
                      </table>
                    </div>
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
