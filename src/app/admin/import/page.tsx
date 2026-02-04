"use client";

import { useState, useRef } from "react";
import { FileText, Upload, X, Plus, Check, AlertCircle } from "lucide-react";

interface ParsedDocument {
  title: string;
  content: string;
  fileName: string;
}

interface ImportResult {
  fileName: string;
  status: "success" | "error";
  lessonId?: string;
  error?: string;
}

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<ParsedDocument[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Parse markdown to extract title from first heading
  function parseMarkdown(content: string, fileName: string): ParsedDocument {
    // Try to extract title from first # heading
    const headingMatch = content.match(/^#\s+(.+)$/m);
    const title = headingMatch
      ? headingMatch[1].trim()
      : fileName.replace(/\.(md|markdown)$/i, "").replace(/[-_]/g, " ");

    return {
      title,
      content,
      fileName,
    };
  }

  // Handle file selection
  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;

    const newDocs: ParsedDocument[] = [];

    for (const file of Array.from(files)) {
      if (file.type === "text/markdown" || file.name.endsWith(".md")) {
        const text = await file.text();
        newDocs.push(parseMarkdown(text, file.name));
      }
    }

    setDocuments((prev) => [...prev, ...newDocs]);

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Handle drag and drop
  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (!files) return;

    const handleFiles = async () => {
      const newDocs: ParsedDocument[] = [];

      for (const file of Array.from(files)) {
        if (file.type === "text/markdown" || file.name.endsWith(".md")) {
          const text = await file.text();
          newDocs.push(parseMarkdown(text, file.name));
        }
      }

      setDocuments((prev) => [...prev, ...newDocs]);
    };

    handleFiles();
  }

  // Update document title
  function updateTitle(index: number, title: string) {
    setDocuments((prev) => prev.map((doc, i) => (i === index ? { ...doc, title } : doc)));
  }

  // Remove document from list
  function removeDocument(index: number) {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  }

  // Create slug from title
  function createSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // Import documents as lessons
  async function handleImport() {
    if (documents.length === 0) return;

    setImporting(true);
    setResults([]);
    setShowResults(false);

    const importResults: ImportResult[] = [];

    for (const doc of documents) {
      try {
        const response = await fetch("/api/admin/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: doc.title,
            slug: createSlug(doc.title),
            content: doc.content,
            contentType: "ARTICLE",
            published: false, // Import as draft
          }),
        });

        const data = await response.json();

        if (data.success) {
          importResults.push({
            fileName: doc.fileName,
            status: "success",
            lessonId: data.data.id,
          });
        } else {
          importResults.push({
            fileName: doc.fileName,
            status: "error",
            error: data.error || "Unknown error",
          });
        }
      } catch (error) {
        importResults.push({
          fileName: doc.fileName,
          status: "error",
          error: error instanceof Error ? error.message : "Import failed",
        });
      }
    }

    setResults(importResults);
    setShowResults(true);
    setImporting(false);

    // Clear successfully imported documents
    const successFileNames = new Set(
      importResults.filter((r) => r.status === "success").map((r) => r.fileName)
    );
    setDocuments((prev) => prev.filter((doc) => !successFileNames.has(doc.fileName)));
  }

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Import Documentation</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Import markdown files as lessons</p>
        </div>
      </div>

      {/* Results notification */}
      {showResults && results.length > 0 && (
        <div
          className={`rounded-lg p-4 ${
            errorCount > 0
              ? "bg-yellow-50 dark:bg-yellow-900/20"
              : "bg-green-50 dark:bg-green-900/20"
          }`}
        >
          <div className="flex items-start gap-3">
            {errorCount > 0 ? (
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            ) : (
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            )}
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">
                Import completed: {successCount} successful
                {errorCount > 0 && `, ${errorCount} failed`}
              </p>
              {results
                .filter((r) => r.status === "error")
                .map((r, i) => (
                  <p key={i} className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {r.fileName}: {r.error}
                  </p>
                ))}
            </div>
            <button
              onClick={() => setShowResults(false)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-blue-500 dark:border-gray-700 dark:hover:border-blue-400"
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Drag and drop markdown files here, or{" "}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            browse
          </button>
        </p>
        <p className="mt-1 text-sm text-gray-500">Supports .md and .markdown files</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,text/markdown"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Documents to Import ({documents.length})
            </h2>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Importing...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Import All as Lessons
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start gap-4">
                  <FileText className="h-8 w-8 flex-shrink-0 text-blue-600" />
                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Lesson Title
                      </label>
                      <input
                        type="text"
                        value={doc.title}
                        onChange={(e) => updateTitle(index, e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      File: {doc.fileName} • {doc.content.length.toLocaleString()} characters
                    </p>
                  </div>
                  <button
                    onClick={() => removeDocument(index)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {documents.length === 0 && !showResults && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">No documents selected for import</p>
          <p className="mt-1 text-sm text-gray-500">
            Upload markdown files to create lessons from them
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <h3 className="font-medium text-blue-900 dark:text-blue-300">Import Tips</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-800 dark:text-blue-300/80">
          <li>Files are imported as unpublished (draft) lessons</li>
          <li>The lesson title is extracted from the first # heading</li>
          <li>You can edit titles before importing</li>
          <li>After import, edit lessons to add paths, quizzes, and metadata</li>
          <li>Review imported content before publishing</li>
        </ul>
      </div>
    </div>
  );
}
