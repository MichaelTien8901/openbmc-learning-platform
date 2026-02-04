"use client";

import { useState, useRef } from "react";
import {
  FileText,
  Upload,
  X,
  Check,
  AlertCircle,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Folder,
  Shield,
} from "lucide-react";
import {
  ImportConflictResolver,
  useConflictCheck,
  type ConflictResolution,
} from "@/components/admin/import-conflict-resolver";

interface ParsedDocument {
  title: string;
  content: string;
  fileName: string;
  relativePath: string;
  directory: string;
}

interface ImportResult {
  fileName: string;
  status: "success" | "error";
  lessonId?: string;
  pathId?: string;
  error?: string;
}

interface DirectoryGroup {
  name: string;
  path: string;
  documents: ParsedDocument[];
  createAsPath: boolean;
  expanded: boolean;
}

type ImportMode = "files" | "directory";

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<ParsedDocument[]>([]);
  const [directoryGroups, setDirectoryGroups] = useState<DirectoryGroup[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("files");
  const [showConflictResolver, setShowConflictResolver] = useState(false);

  const { checking, conflicts, checkConflicts, clearConflicts } = useConflictCheck();

  // Parse markdown to extract title from first heading
  function parseMarkdown(
    content: string,
    fileName: string,
    relativePath: string = ""
  ): ParsedDocument {
    // Try to extract title from first # heading
    const headingMatch = content.match(/^#\s+(.+)$/m);
    const title = headingMatch
      ? headingMatch[1].trim()
      : fileName.replace(/\.(md|markdown)$/i, "").replace(/[-_]/g, " ");

    // Extract directory from relative path
    const pathParts = relativePath.split("/");
    const directory = pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : "";

    return {
      title,
      content,
      fileName,
      relativePath,
      directory,
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
        newDocs.push(parseMarkdown(text, file.name, file.name));
      }
    }

    setDocuments((prev) => [...prev, ...newDocs]);
    setImportMode("files");

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Handle directory selection
  async function handleDirectorySelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;

    const newDocs: ParsedDocument[] = [];
    const groups = new Map<string, ParsedDocument[]>();

    for (const file of Array.from(files)) {
      if (file.name.endsWith(".md") || file.name.endsWith(".markdown")) {
        // webkitRelativePath gives us the full path including directory name
        const relativePath =
          (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        const text = await file.text();
        const doc = parseMarkdown(text, file.name, relativePath);
        newDocs.push(doc);

        // Group by top-level directory
        const topDir = relativePath.split("/")[0] || "root";
        if (!groups.has(topDir)) {
          groups.set(topDir, []);
        }
        groups.get(topDir)!.push(doc);
      }
    }

    // Create directory groups
    const newGroups: DirectoryGroup[] = Array.from(groups.entries()).map(([name, docs]) => ({
      name,
      path: name,
      documents: docs.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
      createAsPath: docs.length > 1, // Auto-enable path creation if multiple docs
      expanded: true,
    }));

    setDirectoryGroups(newGroups);
    setDocuments(newDocs);
    setImportMode("directory");

    // Reset the input
    if (directoryInputRef.current) {
      directoryInputRef.current.value = "";
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
          newDocs.push(parseMarkdown(text, file.name, file.name));
        }
      }

      setDocuments((prev) => [...prev, ...newDocs]);
      setImportMode("files");
    };

    handleFiles();
  }

  // Update document title
  function updateTitle(index: number, title: string) {
    setDocuments((prev) => prev.map((doc, i) => (i === index ? { ...doc, title } : doc)));
  }

  // Remove document from list
  function removeDocument(index: number) {
    const doc = documents[index];
    setDocuments((prev) => prev.filter((_, i) => i !== index));

    // Also update directory groups
    if (importMode === "directory") {
      setDirectoryGroups((prev) =>
        prev
          .map((group) => ({
            ...group,
            documents: group.documents.filter((d) => d.relativePath !== doc.relativePath),
          }))
          .filter((group) => group.documents.length > 0)
      );
    }
  }

  // Toggle directory group expansion
  function toggleGroupExpanded(groupPath: string) {
    setDirectoryGroups((prev) =>
      prev.map((group) =>
        group.path === groupPath ? { ...group, expanded: !group.expanded } : group
      )
    );
  }

  // Toggle create as path
  function toggleCreateAsPath(groupPath: string) {
    setDirectoryGroups((prev) =>
      prev.map((group) =>
        group.path === groupPath ? { ...group, createAsPath: !group.createAsPath } : group
      )
    );
  }

  // Create slug from title
  function createSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // Check for conflicts before import
  async function handleCheckConflicts() {
    const items: Array<{ title: string; slug: string; type: "lesson" | "path" }> = [];

    if (importMode === "directory") {
      for (const group of directoryGroups) {
        if (group.createAsPath && group.documents.length > 1) {
          items.push({
            title: group.name.replace(/[-_]/g, " "),
            slug: createSlug(group.name),
            type: "path",
          });
        }
        for (const doc of group.documents) {
          items.push({
            title: doc.title,
            slug: createSlug(doc.title),
            type: "lesson",
          });
        }
      }
    } else {
      for (const doc of documents) {
        items.push({
          title: doc.title,
          slug: createSlug(doc.title),
          type: "lesson",
        });
      }
    }

    const result = await checkConflicts(items);
    if (result && result.conflicts.length > 0) {
      setShowConflictResolver(true);
    } else {
      // No conflicts, proceed with import
      handleImport();
    }
  }

  // Handle conflict resolutions from the modal
  function handleConflictResolutions(resolutions: ConflictResolution[]) {
    const resolutionMap = new Map<string, ConflictResolution>();
    resolutions.forEach((r) => resolutionMap.set(r.slug, r));
    setShowConflictResolver(false);
    clearConflicts();
    handleImportWithResolutions(resolutionMap);
  }

  // Import with conflict resolutions applied
  async function handleImportWithResolutions(resolutions: Map<string, ConflictResolution>) {
    setImporting(true);
    setResults([]);
    setShowResults(false);

    const importResults: ImportResult[] = [];

    if (importMode === "directory") {
      for (const group of directoryGroups) {
        let pathId: string | undefined;
        const pathSlug = createSlug(group.name);
        const pathResolution = resolutions.get(pathSlug);

        // Skip path if resolution says so
        if (pathResolution?.action === "skip") {
          importResults.push({
            fileName: `[Path] ${group.name}`,
            status: "error",
            error: "Skipped due to conflict",
          });
          continue;
        }

        if (group.createAsPath && group.documents.length > 1) {
          try {
            const finalSlug =
              pathResolution?.action === "keep_both" && pathResolution.newSlug
                ? pathResolution.newSlug
                : pathSlug;

            const method = pathResolution?.action === "replace" ? "PUT" : "POST";
            const url =
              pathResolution?.action === "replace"
                ? `/api/admin/paths/${conflicts.find((c) => c.slug === pathSlug)?.existingId}`
                : "/api/admin/paths";

            const pathResponse = await fetch(url, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: group.name.replace(/[-_]/g, " "),
                slug: finalSlug,
                description: `Imported from ${group.name} directory`,
                difficulty: "BEGINNER",
                published: false,
              }),
            });

            const pathData = await pathResponse.json();
            if (pathData.success) {
              pathId = pathData.data.id;
              importResults.push({
                fileName: `[Path] ${group.name}`,
                status: "success",
                pathId,
              });
            }
          } catch (error) {
            importResults.push({
              fileName: `[Path] ${group.name}`,
              status: "error",
              error: error instanceof Error ? error.message : "Path creation failed",
            });
          }
        }

        for (let i = 0; i < group.documents.length; i++) {
          const doc = group.documents[i];
          const docSlug = createSlug(doc.title);
          const docResolution = resolutions.get(docSlug);

          if (docResolution?.action === "skip") {
            importResults.push({
              fileName: doc.fileName,
              status: "error",
              error: "Skipped due to conflict",
            });
            continue;
          }

          try {
            const finalSlug =
              docResolution?.action === "keep_both" && docResolution.newSlug
                ? docResolution.newSlug
                : docSlug;

            const method = docResolution?.action === "replace" ? "PUT" : "POST";
            const existingId = conflicts.find((c) => c.slug === docSlug)?.existingId;
            const url =
              docResolution?.action === "replace" && existingId
                ? `/api/admin/lessons/${existingId}`
                : "/api/admin/lessons";

            const response = await fetch(url, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: doc.title,
                slug: finalSlug,
                content: doc.content,
                contentType: "ARTICLE",
                published: false,
                pathId: pathId,
                orderIndex: i,
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
      }
    } else {
      for (const doc of documents) {
        const docSlug = createSlug(doc.title);
        const docResolution = resolutions.get(docSlug);

        if (docResolution?.action === "skip") {
          importResults.push({
            fileName: doc.fileName,
            status: "error",
            error: "Skipped due to conflict",
          });
          continue;
        }

        try {
          const finalSlug =
            docResolution?.action === "keep_both" && docResolution.newSlug
              ? docResolution.newSlug
              : docSlug;

          const method = docResolution?.action === "replace" ? "PUT" : "POST";
          const existingId = conflicts.find((c) => c.slug === docSlug)?.existingId;
          const url =
            docResolution?.action === "replace" && existingId
              ? `/api/admin/lessons/${existingId}`
              : "/api/admin/lessons";

          const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: doc.title,
              slug: finalSlug,
              content: doc.content,
              contentType: "ARTICLE",
              published: false,
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
    }

    setResults(importResults);
    setShowResults(true);
    setImporting(false);

    const successFileNames = new Set(
      importResults.filter((r) => r.status === "success").map((r) => r.fileName)
    );
    setDocuments((prev) => prev.filter((doc) => !successFileNames.has(doc.fileName)));
    setDirectoryGroups([]);
  }

  // Import documents as lessons (and optionally paths) - direct import without conflict check
  async function handleImport() {
    if (documents.length === 0) return;

    setImporting(true);
    setResults([]);
    setShowResults(false);

    const importResults: ImportResult[] = [];

    if (importMode === "directory") {
      // Import directory structure with optional paths
      for (const group of directoryGroups) {
        let pathId: string | undefined;

        // Create learning path if enabled
        if (group.createAsPath && group.documents.length > 1) {
          try {
            const pathResponse = await fetch("/api/admin/paths", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: group.name.replace(/[-_]/g, " "),
                slug: createSlug(group.name),
                description: `Imported from ${group.name} directory`,
                difficulty: "BEGINNER",
                published: false,
              }),
            });

            const pathData = await pathResponse.json();
            if (pathData.success) {
              pathId = pathData.data.id;
              importResults.push({
                fileName: `[Path] ${group.name}`,
                status: "success",
                pathId,
              });
            }
          } catch (error) {
            importResults.push({
              fileName: `[Path] ${group.name}`,
              status: "error",
              error: error instanceof Error ? error.message : "Path creation failed",
            });
          }
        }

        // Import lessons in this group
        for (let i = 0; i < group.documents.length; i++) {
          const doc = group.documents[i];
          try {
            const response = await fetch("/api/admin/lessons", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: doc.title,
                slug: createSlug(doc.title),
                content: doc.content,
                contentType: "ARTICLE",
                published: false,
                pathId: pathId,
                orderIndex: i,
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
      }
    } else {
      // Simple file import (existing behavior)
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
              published: false,
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
    }

    setResults(importResults);
    setShowResults(true);
    setImporting(false);

    // Clear successfully imported documents
    const successFileNames = new Set(
      importResults.filter((r) => r.status === "success").map((r) => r.fileName)
    );
    setDocuments((prev) => prev.filter((doc) => !successFileNames.has(doc.fileName)));
    setDirectoryGroups([]);
  }

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Import Documentation</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Import markdown files or entire directories as lessons
          </p>
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

      {/* Import options */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* File drop zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-blue-500 dark:border-gray-700 dark:hover:border-blue-400"
        >
          <Upload className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-3 font-medium text-gray-700 dark:text-gray-300">Import Files</p>
          <p className="mt-1 text-sm text-gray-500">
            Drag and drop or{" "}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              browse
            </button>
          </p>
          <p className="mt-1 text-xs text-gray-400">Individual .md files</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,text/markdown"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Directory drop zone */}
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-blue-500 dark:border-gray-700 dark:hover:border-blue-400">
          <FolderOpen className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-3 font-medium text-gray-700 dark:text-gray-300">Import Directory</p>
          <p className="mt-1 text-sm text-gray-500">
            <button
              onClick={() => directoryInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Select folder
            </button>{" "}
            to import
          </p>
          <p className="mt-1 text-xs text-gray-400">Creates paths from folder structure</p>
          <input
            ref={directoryInputRef}
            type="file"
            // @ts-expect-error - webkitdirectory is not in standard types
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleDirectorySelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Directory structure view */}
      {importMode === "directory" && directoryGroups.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Directory Structure ({documents.length} files in {directoryGroups.length} folder
              {directoryGroups.length !== 1 ? "s" : ""})
            </h2>
            <button
              onClick={handleCheckConflicts}
              disabled={importing || checking}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {importing || checking ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {checking ? "Checking..." : "Importing..."}
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Check & Import
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {directoryGroups.map((group) => (
              <div
                key={group.path}
                className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              >
                {/* Directory header */}
                <div className="flex items-center gap-3 border-b border-gray-200 p-3 dark:border-gray-700">
                  <button
                    onClick={() => toggleGroupExpanded(group.path)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {group.expanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </button>
                  <Folder className="h-5 w-5 text-yellow-500" />
                  <span className="flex-1 font-medium text-gray-900 dark:text-white">
                    {group.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {group.documents.length} file{group.documents.length !== 1 ? "s" : ""}
                  </span>
                  {group.documents.length > 1 && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={group.createAsPath}
                        onChange={() => toggleCreateAsPath(group.path)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-gray-600 dark:text-gray-400">
                        Create as Learning Path
                      </span>
                    </label>
                  )}
                </div>

                {/* Files in directory */}
                {group.expanded && (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {group.documents.map((doc) => {
                      const globalIndex = documents.findIndex(
                        (d) => d.relativePath === doc.relativePath
                      );
                      return (
                        <div key={doc.relativePath} className="flex items-center gap-3 p-3 pl-12">
                          <FileText className="h-4 w-4 flex-shrink-0 text-blue-500" />
                          <div className="min-w-0 flex-1">
                            <input
                              type="text"
                              value={doc.title}
                              onChange={(e) => updateTitle(globalIndex, e.target.value)}
                              className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm hover:border-gray-300 focus:border-blue-500 focus:outline-none dark:text-white dark:hover:border-gray-600"
                            />
                            <p className="truncate px-2 text-xs text-gray-400">
                              {doc.relativePath}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {(doc.content.length / 1000).toFixed(1)}k chars
                          </span>
                          <button
                            onClick={() => removeDocument(globalIndex)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simple file list (files mode) */}
      {importMode === "files" && documents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Documents to Import ({documents.length})
            </h2>
            <button
              onClick={handleCheckConflicts}
              disabled={importing || checking}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {importing || checking ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {checking ? "Checking..." : "Importing..."}
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Check & Import
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
            Upload markdown files or select a directory to import
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <h3 className="font-medium text-blue-900 dark:text-blue-300">Import Tips</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-800 dark:text-blue-300/80">
          <li>Files are imported as unpublished (draft) lessons</li>
          <li>The lesson title is extracted from the first # heading</li>
          <li>Directory import can automatically create learning paths</li>
          <li>Files within a directory are ordered alphabetically</li>
          <li>You can edit titles before importing</li>
          <li>Conflicts are detected before import (duplicate slugs/titles)</li>
          <li>After import, edit lessons to add quizzes and metadata</li>
        </ul>
      </div>

      {/* Conflict Resolution Modal */}
      {showConflictResolver && conflicts.length > 0 && (
        <ImportConflictResolver
          conflicts={conflicts}
          onResolve={handleConflictResolutions}
          onCancel={() => {
            setShowConflictResolver(false);
            clearConflicts();
          }}
        />
      )}
    </div>
  );
}
