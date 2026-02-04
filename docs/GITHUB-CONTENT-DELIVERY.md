# GitHub Content Delivery

This document describes the GitHub content delivery system used by the OpenBMC Learning Platform.

## Overview

The platform delivers lesson content directly from the [openbmc-guide-tutorial](https://MichaelTien8901.github.io/openbmc-guide-tutorial) GitHub Pages site. This approach provides:

- **Simplicity**: No AI service dependencies or complex integrations
- **Reliability**: Content always reflects the authoritative source
- **Maintainability**: Updates to documentation automatically reflect in lessons
- **Familiarity**: Learners work with the same documentation they'll reference professionally

## Architecture

```
┌─────────────────┐     ┌─────────────────────────────────────┐
│  Lesson Player  │────→│  https://MichaelTien8901.github.io  │
│  (iframe or     │     │  /openbmc-guide-tutorial/...        │
│   fetch+render) │     └─────────────────────────────────────┘
└─────────────────┘
         │
         ↓
┌─────────────────┐
│  Progress Track │ (Local DB - completion status)
└─────────────────┘
```

## Display Modes

### RENDER Mode (Default)

Fetches raw markdown from GitHub and renders with platform styling:

- Consistent look and feel across all lessons
- Better progress tracking (scroll position)
- Syntax highlighting with platform theme
- Table of contents sidebar

### IFRAME Mode

Embeds GitHub Pages directly:

- Original styling preserved
- Zero rendering overhead
- Limited progress tracking
- May have cross-origin restrictions

## Database Schema

The `Lesson` model includes these fields for GitHub integration:

```prisma
model Lesson {
  // ... other fields
  sourceUrl       String?     // GitHub Pages URL
  repositoryPath  String?     // Path in repo (e.g., "docs/intro/hello.md")
  displayMode     DisplayMode @default(RENDER)
}

enum DisplayMode {
  IFRAME
  RENDER
}
```

## API Endpoints

### Content Proxy

```
GET /api/content/raw/docs/intro/hello.md
```

Returns raw markdown from GitHub, handling CORS. Only allows files from `docs/` directory.

### Admin Sync

```
GET /api/admin/sync-github
```

Preview available content from GitHub repository.

```
POST /api/admin/sync-github
Body: { "dryRun": false, "overwrite": false }
```

Sync lessons from GitHub. Creates new lessons, optionally updates existing.

## Components

### GitHubContentFrame

```tsx
<GitHubContentFrame
  sourceUrl="https://MichaelTien8901.github.io/openbmc-guide-tutorial/intro/"
  title="Introduction"
/>
```

Iframe wrapper with loading state and "View Original" link.

### GitHubContentRenderer

```tsx
<GitHubContentRenderer
  repositoryPath="docs/intro/index.md"
  sourceUrl="https://MichaelTien8901.github.io/openbmc-guide-tutorial/intro/"
  onScrollProgress={(progress) => console.log(`${progress * 100}%`)}
/>
```

Fetch and render mode with scroll tracking.

## Admin Workflow

### Syncing Content

1. Go to Admin Dashboard
2. Find "GitHub Content Sync" panel
3. Click "Preview Sync" to see available content
4. Click "Sync New Lessons" to import

### Editing Lessons

In the lesson editor:

1. Set **GitHub Pages URL** (e.g., `https://MichaelTien8901.github.io/openbmc-guide-tutorial/intro/`)
2. Set **Repository Path** (e.g., `docs/intro/index.md`)
3. Choose **Display Mode** (Render or Iframe)

Leave fields empty to use local content instead.

## Configuration

Default repository settings in `src/lib/github/content-fetcher.ts`:

```typescript
export const DEFAULT_CONFIG = {
  owner: "MichaelTien8901",
  repo: "openbmc-guide-tutorial",
  branch: "main",
  pagesBaseUrl: "https://MichaelTien8901.github.io/openbmc-guide-tutorial",
};
```

## Caching

- Raw content: 1 hour (via `next` revalidate)
- API responses: Varies by endpoint
- Browser: Standard HTTP caching headers

## Error Handling

- **404**: Content not found on GitHub
- **Rate Limit**: GitHub API has limits (60/hour unauthenticated)
- **Network**: Fallback to local content if stored

## Migration from NotebookLM

The previous NotebookLM integration has been removed. Key changes:

- Removed: `src/lib/notebooklm/` - AI service integration
- Removed: `/api/ai/*` - AI endpoints (audio, Q&A, quiz generation)
- Removed: TTS audio player components
- Removed: AI-related database tables (GeneratedContent, AIResponseCache, etc.)
- Added: `src/lib/github/` - GitHub content fetching
- Added: `/api/admin/sync-github` - Content sync endpoint
- Added: GitHub content display components

## Future Improvements

- Webhook integration for automatic sync on repository updates
- Offline caching with Service Worker
- Search across GitHub-sourced content
- Version tracking (link to specific commits)
