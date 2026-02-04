# Design Delta: Direct Content Delivery from GitHub

## Summary

This design delta replaces the NotebookLM-based content generation approach with direct content delivery from the openbmc-guide-tutorial GitHub Pages site (https://MichaelTien8901.github.io/openbmc-guide-tutorial).

## Motivation

The NotebookLM MCP integration and voice lecture approach has proven ineffective:

- MCP connection complexity and reliability issues
- Browser TTS produces unnatural audio learning experience
- AI-generated content adds latency and inconsistency
- Rate limiting constrains interactive Q&A usefulness

Direct content delivery from the authoritative source is simpler, more reliable, and keeps learners connected to the actual documentation they'll reference in their work.

## Architectural Changes

### REMOVED: NotebookLM Architecture

```
REMOVED:
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Learning Platform → MCP Client → NotebookLM → Generated     │
│                                      ↓           Content     │
│                             Browser TTS → Audio              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### NEW: Direct GitHub Content Architecture

```
NEW:
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  User → Learning Platform → GitHub Pages Content             │
│                ↓                                             │
│         Lesson Metadata (DB) ←→ openbmc-guide-tutorial       │
│                                 (Source of Truth)            │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Content Flow:
┌─────────────────┐     ┌─────────────────────────────────────┐
│  Lesson Player  │────→│  https://MichaelTien8901.github.io  │
│  (iframe or     │     │  /openbmc-guide-tutorial/...        │
│   fetch+render) │     └─────────────────────────────────────┘
└─────────────────┘
         │
         ↓
┌─────────────────┐
│  Progress Track │ (Local DB - what user completed)
└─────────────────┘
```

## Decision Updates

### Decision 6 (REPLACED): Direct GitHub Pages Integration

**Original Decision:** NotebookLM Integration: Content Generation + Browser TTS

**New Decision:** Direct content delivery from openbmc-guide-tutorial GitHub Pages.

**New Architecture:**

```
Learning Platform → GitHub Pages → User
       │
       └── Lesson metadata in DB (sourceUrl, progress)
```

**Rationale:**

- Simpler architecture with fewer moving parts
- Content always up-to-date with source documentation
- No AI service dependencies or rate limits
- Users learn to navigate the actual documentation
- Lower infrastructure cost (no MCP server, no content generation)

**Content Delivery Modes:**

1. **Iframe Mode** - Embed GitHub Pages directly
   - Pros: Zero maintenance, always current, preserves original styling
   - Cons: Limited progress tracking granularity, cross-origin restrictions

2. **Fetch + Render Mode** - Fetch raw markdown, render with platform styling
   - Pros: Full control, better progress tracking, consistent UX
   - Cons: Needs CORS handling, styling divergence from source

**Recommendation:** Start with iframe mode for simplicity, add fetch+render for lessons needing enhanced tracking.

### Decision 7 (MODIFIED): Content Structure with GitHub Source Reference

**Updated Structure:**

```yaml
# Lesson metadata in database
title: "Understanding D-Bus in OpenBMC"
path: "core-concepts"
order: 3
difficulty: intermediate
prerequisites: ["dbus-basics"]
sourceUrl: "https://MichaelTien8901.github.io/openbmc-guide-tutorial/dbus/"
repositoryPath: "docs/dbus/index.md"
displayMode: "iframe" # or "render"
has_code_exercise: true
```

**Rationale:**

- `sourceUrl` is the authoritative content location
- `repositoryPath` enables raw markdown fetching if needed
- `displayMode` controls how content is presented
- Reduced metadata (no notebooklm_notebook reference)

## Data Model Changes

### Tables to Remove

```
REMOVE:
- GeneratedContent (was: cached AI teaching content)
- AIResponseCache (was: cached Q&A responses)
- AIUsageEvent (was: per-request AI analytics)
- AIUsageDaily (was: aggregated AI usage)
```

### Tables to Modify

```
MODIFY Lesson:
- REMOVE: notebookId
- ADD: sourceUrl (VARCHAR) - GitHub Pages URL
- ADD: repositoryPath (VARCHAR) - Path in repo for raw fetch
- ADD: displayMode (ENUM: 'iframe', 'render') - How to display content
```

### Tables to Keep (unchanged)

```
KEEP:
- User, Account, Session (auth)
- LearningPath, PathLesson (path structure)
- UserProgress, UserPathEnrollment (progress tracking)
- QuizQuestion, QuizAttempt (manual quizzes)
- CodeSession (sandbox)
- Bookmark, Note (user features)
```

## API Changes

### Endpoints to Remove

```
REMOVE:
- GET  /api/ai/audio/:lessonId (NotebookLM content + TTS)
- POST /api/ai/ask (NotebookLM Q&A)
- GET  /api/ai/quiz/:lessonId (AI quiz generation)
- POST /api/ai/quiz/:lessonId/regenerate
- GET  /api/notebooklm/status
```

### Endpoints to Modify

```
MODIFY:
- GET /api/lessons/:id
  Response now includes:
  {
    id, title, description, difficulty,
    sourceUrl: "https://MichaelTien8901.github.io/...",
    displayMode: "iframe" | "render",
    hasQuiz: boolean (manual quizzes only),
    hasExercise: boolean
  }

- GET /api/lessons/:id/content
  - If displayMode === "render": Fetch and return markdown
  - If displayMode === "iframe": Return sourceUrl for client embedding
```

### New Endpoints

```
ADD:
- POST /api/admin/sync-github
  Refreshes lesson metadata from GitHub repository structure

- GET /api/content/raw/:repositoryPath
  Proxies raw markdown from GitHub (handles CORS)
```

## Component Changes

### Components to Remove

```
REMOVE:
- src/lib/notebooklm/ (entire directory)
  - client.ts
  - service.ts
  - types.ts
- src/components/lessons/ai-audio-player.tsx
- src/components/lessons/ai-qa-panel.tsx
- src/components/lessons/ai-quiz-generator.tsx
- src/app/api/ai/ (entire directory)
```

### Components to Modify

```
MODIFY:
- src/components/lessons/lesson-player.tsx
  - Remove AI content tabs
  - Add iframe/render mode handling
  - Simplify to: content panel + optional quiz + optional exercise

- src/components/admin/lesson-editor.tsx
  - Remove NotebookLM configuration
  - Add sourceUrl and displayMode fields
  - Add "Sync from GitHub" button
```

### New Components

```
ADD:
- src/components/lessons/github-content-frame.tsx
  Iframe wrapper with loading state and error handling

- src/components/lessons/github-content-renderer.tsx
  Markdown renderer for fetched content with platform styling

- src/components/admin/github-sync-panel.tsx
  Admin UI for syncing content from GitHub repository
```

## Risk Assessment Updates

### Risks Removed

- ~~NotebookLM Availability~~ - No longer dependent on NotebookLM
- ~~NotebookLM Rate Limits~~ - No AI rate limits to manage

### Risks Modified

**Content Synchronization** (Medium → Low)

- Now simpler: GitHub is source of truth
- Platform just needs to track metadata, not generated content

### New Risks

**GitHub Pages Availability** (Low)

- GitHub Pages has high availability
- Mitigation: Can cache recent content for offline/fallback

**Cross-Origin Restrictions** (Medium)

- Iframe mode may have CORS issues for some interactions
- Mitigation: Fetch+render mode as alternative, proxy endpoint for raw content

**Content Drift** (Low)

- Lesson metadata could get out of sync with GitHub
- Mitigation: Admin sync functionality, periodic automated checks

## Migration Path

### Phase 1: Add GitHub Integration (Non-breaking)

1. Add new database columns (sourceUrl, repositoryPath, displayMode)
2. Create iframe content component
3. Map existing lessons to GitHub source URLs

### Phase 2: Switch Default Mode

1. Configure lessons to use iframe mode by default
2. Deploy and validate user experience
3. Gather feedback on content display

### Phase 3: Remove NotebookLM (Breaking)

1. Remove NotebookLM service code
2. Remove AI API endpoints
3. Drop unused database tables
4. Update documentation

## Open Questions (Updated)

1. ~~Sandbox Session Persistence~~ (keep as-is)
2. ~~Offline Mode~~ - Simpler now: can cache fetched markdown
3. ~~Gamification~~ (defer)
4. ~~Multi-language~~ (defer)
5. ~~Community Features~~ (defer)

**New Questions:**

1. **Iframe vs Render Default:** Should iframe or render be the default mode?
2. **Progress Granularity:** How to track progress with iframe mode (time-based? scroll position?)
3. **Quiz Strategy:** Keep manual quizzes or integrate quiz content into GitHub docs?
