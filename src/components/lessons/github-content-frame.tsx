"use client";

import { useState, useCallback } from "react";
import { ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GitHubContentFrameProps {
  sourceUrl: string;
  title?: string;
  className?: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

/**
 * GitHubContentFrame - Iframe mode for displaying GitHub Pages content
 *
 * Embeds the openbmc-guide-tutorial GitHub Pages directly,
 * preserving original styling and interactivity.
 */
export function GitHubContentFrame({
  sourceUrl,
  title,
  className = "",
  onLoad,
  onError,
}: GitHubContentFrameProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    const errorMsg = "Failed to load content. The page may have moved or be unavailable.";
    setError(errorMsg);
    setIsLoading(false);
    onError?.(errorMsg);
  }, [onError]);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setKey((k) => k + 1);
  }, []);

  return (
    <div className={`relative flex flex-col ${className}`}>
      {/* Header with source link */}
      <div className="bg-muted/50 flex items-center justify-between border-b px-4 py-2">
        <span className="text-muted-foreground text-sm">Content from openbmc-guide-tutorial</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading}>
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

      {/* Loading state */}
      {isLoading && (
        <div className="bg-background/80 absolute inset-0 top-10 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
            <span className="text-muted-foreground text-sm">Loading content...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="link" className="ml-2 h-auto p-0" onClick={handleRefresh}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Iframe - uses viewport height for better fit */}
      <iframe
        key={key}
        src={sourceUrl}
        title={title || "Lesson Content"}
        className="h-[calc(100vh-200px)] min-h-[600px] w-full border-0"
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        loading="lazy"
      />
    </div>
  );
}
