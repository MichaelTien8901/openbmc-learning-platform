## Context

The OpenBMC community lacks an interactive learning platform. Currently, developers learn from:
- Static documentation (openbmc-guide-tutorial Jekyll site)
- Mailing lists and IRC/Discord discussions
- Trial and error with QEMU environments

This creates a high barrier to entry. A structured learning platform with guided paths, progress tracking, and interactive exercises would significantly improve onboarding.

**Constraints:**
- Minimize custom AI development by leveraging NotebookLM
- Support offline/self-hosted deployment for enterprises
- OpenBMC code execution requires QEMU (resource-intensive)
- Content must stay synchronized with upstream documentation

**Stakeholders:**
- OpenBMC newcomers (primary users)
- Experienced developers seeking specific topics
- Platform administrators managing content
- Contributors maintaining documentation

## Goals / Non-Goals

**Goals:**
- Provide structured learning paths from beginner to advanced
- Track individual progress with completion states and scores
- Enable hands-on coding practice with real OpenBMC environments
- Generate audio lessons and quizzes via NotebookLM (no custom ML)
- Support both cloud-hosted and self-hosted deployments
- Import content from existing openbmc-guide-tutorial docs

**Non-Goals:**
- Building custom AI/ML models for content generation
- Real hardware integration (QEMU only for MVP)
- Certification or credentialing system
- Multi-tenant SaaS with billing
- Mobile native apps (responsive web only)
- Live instructor-led sessions or video conferencing

## Decisions

### 1. Frontend Framework: Next.js 14+ (App Router)

**Decision:** Use Next.js with App Router for the frontend.

**Rationale:**
- Server-side rendering improves SEO and initial load
- App Router provides excellent code organization
- Strong TypeScript support
- Large ecosystem for UI components (shadcn/ui)
- API routes can handle simple backend needs

**Alternatives Considered:**
- Remix: Similar benefits but smaller ecosystem
- Vite + React: No SSR out of box, need more setup
- Vue/Nuxt: Team familiarity favors React ecosystem

### 2. Backend Architecture: Monolithic API with Service Separation

**Decision:** Single Next.js application with logical service separation, not microservices.

**Rationale:**
- Reduces operational complexity for MVP
- Next.js API routes + Server Actions sufficient for initial scale
- Can extract services later if needed
- Easier self-hosted deployment (single container)

**Alternatives Considered:**
- Microservices: Premature complexity for MVP
- Separate FastAPI backend: Extra deployment, good for Python ML (not needed with NotebookLM)
- Serverless functions: Cold start issues for QEMU sandbox

### 3. Database: PostgreSQL with Prisma ORM

**Decision:** PostgreSQL for primary storage, Prisma for type-safe database access.

**Rationale:**
- PostgreSQL handles relational data (users, courses, progress) well
- Prisma provides excellent TypeScript integration
- JSON columns for flexible lesson metadata
- Proven scalability for LMS workloads

**Alternatives Considered:**
- MongoDB: Overkill flexibility, weaker relational queries
- SQLite: Insufficient for multi-user production
- Drizzle ORM: Newer, less ecosystem support

### 4. Authentication: NextAuth.js (Auth.js)

**Decision:** Use NextAuth.js for authentication with multiple providers.

**Rationale:**
- Native Next.js integration
- Supports OAuth (Google, GitHub) + email/password
- Session management built-in
- Database adapter for Prisma available

**Alternatives Considered:**
- Clerk/Auth0: Adds external dependency, cost at scale
- Custom JWT: More work, security risk
- Supabase Auth: Ties to Supabase ecosystem

### 5. Code Sandbox: Containerized QEMU with WebSocket Bridge

**Decision:** Run QEMU ast2600-evb in Docker containers, accessed via web terminal.

**Architecture:**
```
Browser → WebSocket → Sandbox Service → Docker Container → QEMU
                                              ↓
                                        OpenBMC Shell
```

**Rationale:**
- QEMU required for realistic OpenBMC environment
- Container isolation for security and resource limits
- WebSocket provides real-time terminal interaction
- xterm.js for browser terminal emulation

**Alternatives Considered:**
- WebContainers: Cannot run QEMU (browser-only Linux)
- Remote SSH: Security concerns, hard to isolate
- Pre-built exercises only: Limits hands-on learning

**Resource Management:**
- Container pool with auto-scaling
- Session timeout (30 min idle)
- CPU/memory limits per container
- Shared base images to reduce startup time

### 6. NotebookLM Integration: MCP Protocol via Browser Automation

**Decision:** Use MCP (Model Context Protocol) to bridge NotebookLM capabilities.

**Architecture:**
```
Learning Platform → MCP Client → NotebookLM MCP Server → NotebookLM
                                        ↓
                              Audio, Q&A, Quizzes
```

**Rationale:**
- NotebookLM provides AI features without custom ML
- MCP is Anthropic's standard for tool integration
- Existing notebooklm skill provides reference implementation
- Free tier sufficient for initial deployment

**Alternatives Considered:**
- Custom LLM integration: Expensive, complex
- OpenAI API: No source-grounding like NotebookLM
- No AI features: Loses key differentiator

**Content Sync:**
- Batch upload docs to NotebookLM notebooks
- One notebook per learning path/topic
- Periodic sync script for doc updates

### 7. Content Structure: Lesson-Based with Markdown Source

**Decision:** Lessons stored as markdown with YAML frontmatter, compiled to database.

**Structure:**
```yaml
# lesson.md frontmatter
title: "Understanding D-Bus in OpenBMC"
path: "core-concepts"
order: 3
difficulty: intermediate
prerequisites: ["dbus-basics"]
has_code_exercise: true
notebooklm_notebook: "openbmc-dbus"
```

**Rationale:**
- Markdown familiar to doc contributors
- Easy to sync from openbmc-guide-tutorial
- Frontmatter provides structured metadata
- Compile step validates and indexes content

**Alternatives Considered:**
- Database-only: Harder to version control
- CMS (Strapi, Contentful): External dependency
- MDX: Adds complexity, not needed initially

### 8. UI Component Library: shadcn/ui + Tailwind CSS

**Decision:** Use shadcn/ui components with Tailwind CSS for styling.

**Rationale:**
- Copy-paste components (no external dependency)
- Radix UI primitives for accessibility
- Tailwind for rapid styling iteration
- Consistent with modern Next.js patterns

**Alternatives Considered:**
- Material UI: Heavier, opinionated styling
- Chakra UI: Good but less ecosystem momentum
- Custom components: Too much effort for MVP

## Risks / Trade-offs

### High Risks

**NotebookLM Availability** → NotebookLM is a Google product that could change or deprecate.
- *Mitigation:* Abstract behind interface, prepare fallback to direct Claude API queries.

**QEMU Resource Cost** → Each code sandbox session uses significant CPU/memory.
- *Mitigation:* Container pooling, session timeouts, usage quotas per user.

### Medium Risks

**Content Synchronization** → Documentation updates may break lesson structure.
- *Mitigation:* Semantic versioning for lessons, review process for syncs.

**Self-Hosted Complexity** → QEMU + containers require significant infrastructure.
- *Mitigation:* Docker Compose for simple deployments, cloud-first development.

**NotebookLM Rate Limits** → Free tier may have usage constraints.
- *Mitigation:* Cache responses, batch requests, fallback to static content.

### Trade-offs Accepted

- **Monolith vs Microservices:** Accepting coupling for simplicity. Can refactor later.
- **QEMU Only:** No real hardware support limits advanced use cases.
- **Single Notebook Platform:** Tied to Google ecosystem for AI features.

## Data Model Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│    User     │────<│ UserProgress │>────│   Lesson    │
└─────────────┘     └──────────────┘     └─────────────┘
       │                                        │
       │            ┌──────────────┐            │
       └───────────<│  QuizAttempt │>───────────┘
                    └──────────────┘
                           │
                    ┌──────────────┐
                    │ QuizQuestion │
                    └──────────────┘

┌──────────────┐     ┌──────────────┐
│ LearningPath │────<│  PathLesson  │>────[Lesson]
└──────────────┘     └──────────────┘

┌──────────────┐
│ CodeSession  │──── [User, Lesson, container_id, status]
└──────────────┘
```

## API Design

### Public API Endpoints

```
Auth:
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/logout
  GET    /api/auth/me

Learning Paths:
  GET    /api/paths
  GET    /api/paths/:id
  GET    /api/paths/:id/lessons

Lessons:
  GET    /api/lessons/:id
  GET    /api/lessons/:id/content
  POST   /api/lessons/:id/complete

Progress:
  GET    /api/progress
  GET    /api/progress/path/:pathId

Code Sandbox:
  POST   /api/sandbox/start
  DELETE /api/sandbox/:sessionId
  WS     /api/sandbox/:sessionId/terminal

NotebookLM Bridge:
  GET    /api/ai/audio/:lessonId
  POST   /api/ai/ask
  GET    /api/ai/quiz/:lessonId
```

## Deployment Architecture

### Development
```bash
docker-compose up  # Next.js + PostgreSQL + Redis
```

### Production (Cloud)
```
┌─────────────────────────────────────────────────┐
│              Load Balancer (nginx)              │
└─────────────────────────────────────────────────┘
              │                    │
     ┌────────┴────────┐   ┌──────┴───────┐
     │   Web App (×2)  │   │ Sandbox Pool │
     │   Next.js       │   │ QEMU in Docker│
     └────────┬────────┘   └──────┬───────┘
              │                    │
     ┌────────┴────────────────────┴───────┐
     │          PostgreSQL + Redis          │
     └──────────────────────────────────────┘
```

### Self-Hosted (Minimal)
- Single Docker Compose stack
- SQLite instead of PostgreSQL (optional)
- Limited sandbox capacity (2-3 concurrent)

## Open Questions

1. **Sandbox Session Persistence:** Should code/files persist between sessions?
2. **Offline Mode:** Should lessons be downloadable for offline viewing?
3. **Gamification:** Add badges, leaderboards, or keep it minimal?
4. **Multi-language:** Support translations of lessons?
5. **Community Features:** Discussion forums, Q&A per lesson?
