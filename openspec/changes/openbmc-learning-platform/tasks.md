## 1. Project Setup

- [x] 1.1 Initialize Next.js 14+ project with App Router and TypeScript
- [x] 1.2 Configure Tailwind CSS and shadcn/ui component library
- [x] 1.3 Set up Prisma ORM with PostgreSQL connection
- [x] 1.4 Create initial database schema for users, lessons, paths, progress
- [x] 1.5 Configure ESLint, Prettier, and pre-commit hooks
- [x] 1.6 Set up Docker Compose for local development (Next.js, PostgreSQL, Redis)
- [x] 1.7 Create project directory structure following design document

## 2. User Authentication

- [x] 2.1 Implement custom JWT-based authentication
- [x] 2.2 Implement email/password registration with validation
- [x] 2.3 Add email verification flow with token generation
- [x] 2.4 Configure Google OAuth provider (SKIPPED - using email/password only)
- [x] 2.5 Configure GitHub OAuth provider (SKIPPED - using email/password only)
- [x] 2.6 Implement login page with email/password
- [x] 2.7 Implement session management with secure cookies
- [x] 2.8 Add password reset flow with email tokens
- [x] 2.9 Create user profile page with display name
- [x] 2.10 Implement account deletion with confirmation
- [x] 2.11 Add protected route middleware for authenticated pages

## 3. Database Models

- [x] 3.1 Create User model with auth fields and profile data
- [x] 3.2 Create LearningPath model with prerequisites and difficulty
- [x] 3.3 Create Lesson model with content, metadata, and path association
- [x] 3.4 Create UserProgress model for lesson completion tracking
- [x] 3.5 Create QuizAttempt model with scores and answers
- [x] 3.6 Create QuizQuestion model for storing generated/manual questions
- [x] 3.7 Create CodeSession model for sandbox tracking
- [x] 3.8 Create Bookmark and Note models for user content
- [x] 3.9 Add indexes for common queries (user progress, path lessons)
- [x] 3.10 Create seed script with sample learning paths and lessons

## 4. Learning Paths

- [x] 4.1 Create API routes for listing learning paths
- [x] 4.2 Create API route for path details with lessons
- [x] 4.3 Implement path enrollment endpoint
- [x] 4.4 Add prerequisite validation logic
- [x] 4.5 Create learning paths catalog page with filters
- [x] 4.6 Create path detail page with lesson list
- [x] 4.7 Implement path progress calculation
- [ ] 4.8 Add path completion detection and badge display
- [ ] 4.9 Create suggested next paths recommendation logic
- [x] 4.10 Add difficulty-based filtering UI

## 5. Progress Tracking

- [x] 5.1 Create API routes for recording lesson completion
- [x] 5.2 Implement quiz attempt recording endpoint
- [ ] 5.3 Add code exercise completion tracking
- [x] 5.4 Implement learning streak calculation logic
- [x] 5.5 Create progress dashboard page
- [ ] 5.6 Add weekly activity chart component
- [ ] 5.7 Implement path-specific progress view
- [ ] 5.8 Create progress export endpoint (JSON and PDF)
- [ ] 5.9 Add cross-device sync verification
- [ ] 5.10 Implement offline progress queueing

## 6. Lesson Player

- [x] 6.1 Create unified lesson player layout component
- [x] 6.2 Implement markdown content renderer with syntax highlighting
- [x] 6.3 Add table of contents sidebar with scroll sync
- [x] 6.4 Create audio player component with speed controls (Browser TTS)
- [x] 6.5 Implement audio resume from last position
- [ ] 6.6 Add audio transcript display with timestamp links
- [x] 6.7 Create quiz interface with question navigation
- [x] 6.8 Implement quiz scoring and results display
- [x] 6.9 Add lesson navigation (next/previous buttons)
- [x] 6.10 Create path progress indicator bar
- [x] 6.11 Implement bookmark functionality
- [x] 6.12 Add note-taking panel with save/export
- [ ] 6.13 Ensure keyboard navigation accessibility
- [ ] 6.14 Add screen reader ARIA labels
- [ ] 6.15 Implement responsive mobile layout

## 7. Code Sandbox

- [ ] 7.1 Create Docker image with QEMU ast2600-evb environment
- [ ] 7.2 Implement container orchestration service for sandbox management
- [ ] 7.3 Set up WebSocket server for terminal communication
- [ ] 7.4 Integrate xterm.js terminal emulator in frontend
- [ ] 7.5 Create sandbox start/stop API endpoints
- [ ] 7.6 Implement session timeout and extension logic
- [ ] 7.7 Add Monaco code editor component
- [ ] 7.8 Implement file sync between editor and container
- [ ] 7.9 Create exercise validation runner
- [ ] 7.10 Add validation result display with hints
- [ ] 7.11 Implement resource limits (CPU, memory, disk)
- [ ] 7.12 Add concurrent session limit enforcement
- [ ] 7.13 Implement daily usage quota tracking
- [ ] 7.14 Create session recovery for connection drops
- [ ] 7.15 Build container pool for faster startup

## 8. NotebookLM Integration + Browser TTS

- [ ] 8.1 Set up MCP client/service for NotebookLM connection
- [ ] 8.2 Implement connection health check endpoint
- [ ] 8.3 Create content generation service (queries NotebookLM for detailed teaching content)
- [ ] 8.4 Add generated content caching to database
- [ ] 8.5 Implement Q&A query endpoint with context
- [ ] 8.6 Add citation parsing and link generation
- [ ] 8.7 Implement question rate limiting (20/hour)
- [ ] 8.8 Create quiz generation service
- [ ] 8.9 Add quiz caching to database
- [x] 8.10 Create Browser TTS audio player component (Web Speech API)
- [x] 8.11 Add TTS controls: play/pause, speed (0.5x-2x), voice selection
- [x] 8.12 Implement TTS progress indicator and text highlighting
- [ ] 8.13 Add fallback behavior for content (static content)
- [ ] 8.14 Add fallback behavior for Q&A (disabled state)
- [x] 8.15 Add fallback behavior for TTS (text-only mode)
- [ ] 8.16 Implement usage analytics tracking
- [ ] 8.17 Create degraded mode UI notifications

## 9. Content Management

- [x] 9.1 Create admin layout and navigation
- [x] 9.2 Implement lesson CRUD pages
- [x] 9.3 Add markdown editor with preview
- [x] 9.4 Create learning path management pages
- [x] 9.5 Implement drag-and-drop lesson reordering
- [ ] 9.6 Add prerequisite path selector
- [ ] 9.7 Create documentation import tool
- [ ] 9.8 Implement bulk import from directory
- [ ] 9.9 Add import conflict resolution UI
- [ ] 9.10 Create code exercise editor with validation script
- [ ] 9.11 Add exercise testing in sandbox
- [ ] 9.12 Implement quiz question viewer/editor
- [ ] 9.13 Add manual quiz question creation
- [ ] 9.14 Create content version history viewer
- [ ] 9.15 Implement version restore functionality
- [ ] 9.16 Add admin role management (editor, admin)
- [ ] 9.17 Create content analytics dashboard
- [ ] 9.18 Add low-performing content alerts

## 10. API Layer

- [x] 10.1 Create auth API routes (register, login, logout, me)
- [x] 10.2 Implement learning paths API (list, detail, enroll)
- [x] 10.3 Create lessons API (detail, content, complete)
- [x] 10.4 Implement progress API (get, update, export)
- [ ] 10.5 Create sandbox API (start, stop, terminal WebSocket)
- [ ] 10.6 Implement AI bridge API (audio, ask, quiz)
- [ ] 10.7 Add API rate limiting middleware
- [ ] 10.8 Implement API error handling and logging
- [ ] 10.9 Create API documentation with OpenAPI spec

## 11. Testing

- [ ] 11.1 Set up Jest and React Testing Library
- [ ] 11.2 Write unit tests for auth logic
- [ ] 11.3 Write unit tests for progress calculation
- [ ] 11.4 Write unit tests for sandbox session management
- [ ] 11.5 Create integration tests for API routes
- [ ] 11.6 Add end-to-end tests with Playwright
- [ ] 11.7 Create sandbox container tests
- [ ] 11.8 Test NotebookLM integration with mocks
- [ ] 11.9 Add accessibility tests with axe-core

## 12. Deployment

- [ ] 12.1 Create production Dockerfile
- [ ] 12.2 Set up Docker Compose for self-hosted deployment
- [ ] 12.3 Configure environment variables for production
- [ ] 12.4 Create database migration scripts
- [ ] 12.5 Set up CI/CD pipeline (GitHub Actions)
- [ ] 12.6 Configure load balancer (nginx)
- [ ] 12.7 Set up container registry for QEMU images
- [ ] 12.8 Create deployment documentation
- [ ] 12.9 Add health check endpoints
- [ ] 12.10 Configure monitoring and logging

## 13. Content Import

- [ ] 13.1 Create import script for openbmc-guide-tutorial docs
- [ ] 13.2 Map existing doc structure to learning paths
- [ ] 13.3 Extract code examples as sandbox exercises
- [ ] 13.4 Upload documentation to NotebookLM notebooks
- [ ] 13.5 Generate initial quizzes for imported lessons
- [ ] 13.6 Review and curate imported content
- [ ] 13.7 Create initial learning path sequences
