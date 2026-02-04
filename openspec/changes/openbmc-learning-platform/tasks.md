## 1. Project Setup

- [ ] 1.1 Initialize Next.js 14+ project with App Router and TypeScript
- [ ] 1.2 Configure Tailwind CSS and shadcn/ui component library
- [ ] 1.3 Set up Prisma ORM with PostgreSQL connection
- [ ] 1.4 Create initial database schema for users, lessons, paths, progress
- [ ] 1.5 Configure ESLint, Prettier, and pre-commit hooks
- [ ] 1.6 Set up Docker Compose for local development (Next.js, PostgreSQL, Redis)
- [ ] 1.7 Create project directory structure following design document

## 2. User Authentication

- [ ] 2.1 Install and configure NextAuth.js with Prisma adapter
- [ ] 2.2 Implement email/password registration with validation
- [ ] 2.3 Add email verification flow with token generation
- [ ] 2.4 Configure Google OAuth provider
- [ ] 2.5 Configure GitHub OAuth provider
- [ ] 2.6 Implement login page with email/password and OAuth buttons
- [ ] 2.7 Implement session management with secure cookies
- [ ] 2.8 Add password reset flow with email tokens
- [ ] 2.9 Create user profile page with display name and linked accounts
- [ ] 2.10 Implement account deletion with confirmation
- [ ] 2.11 Add protected route middleware for authenticated pages

## 3. Database Models

- [ ] 3.1 Create User model with auth fields and profile data
- [ ] 3.2 Create LearningPath model with prerequisites and difficulty
- [ ] 3.3 Create Lesson model with content, metadata, and path association
- [ ] 3.4 Create UserProgress model for lesson completion tracking
- [ ] 3.5 Create QuizAttempt model with scores and answers
- [ ] 3.6 Create QuizQuestion model for storing generated/manual questions
- [ ] 3.7 Create CodeSession model for sandbox tracking
- [ ] 3.8 Create Bookmark and Note models for user content
- [ ] 3.9 Add indexes for common queries (user progress, path lessons)
- [ ] 3.10 Create seed script with sample learning paths and lessons

## 4. Learning Paths

- [ ] 4.1 Create API routes for listing learning paths
- [ ] 4.2 Create API route for path details with lessons
- [ ] 4.3 Implement path enrollment endpoint
- [ ] 4.4 Add prerequisite validation logic
- [ ] 4.5 Create learning paths catalog page with filters
- [ ] 4.6 Create path detail page with lesson list
- [ ] 4.7 Implement path progress calculation
- [ ] 4.8 Add path completion detection and badge display
- [ ] 4.9 Create suggested next paths recommendation logic
- [ ] 4.10 Add difficulty-based filtering UI

## 5. Progress Tracking

- [ ] 5.1 Create API routes for recording lesson completion
- [ ] 5.2 Implement quiz attempt recording endpoint
- [ ] 5.3 Add code exercise completion tracking
- [ ] 5.4 Implement learning streak calculation logic
- [ ] 5.5 Create progress dashboard page
- [ ] 5.6 Add weekly activity chart component
- [ ] 5.7 Implement path-specific progress view
- [ ] 5.8 Create progress export endpoint (JSON and PDF)
- [ ] 5.9 Add cross-device sync verification
- [ ] 5.10 Implement offline progress queueing

## 6. Lesson Player

- [ ] 6.1 Create unified lesson player layout component
- [ ] 6.2 Implement markdown content renderer with syntax highlighting
- [ ] 6.3 Add table of contents sidebar with scroll sync
- [ ] 6.4 Create audio player component with speed controls
- [ ] 6.5 Implement audio resume from last position
- [ ] 6.6 Add audio transcript display with timestamp links
- [ ] 6.7 Create quiz interface with question navigation
- [ ] 6.8 Implement quiz scoring and results display
- [ ] 6.9 Add lesson navigation (next/previous buttons)
- [ ] 6.10 Create path progress indicator bar
- [ ] 6.11 Implement bookmark functionality
- [ ] 6.12 Add note-taking panel with save/export
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

## 8. NotebookLM Integration

- [ ] 8.1 Set up MCP client for NotebookLM connection
- [ ] 8.2 Implement connection health check endpoint
- [ ] 8.3 Create audio lesson retrieval service
- [ ] 8.4 Add audio caching layer (24-hour TTL)
- [ ] 8.5 Implement Q&A query endpoint with context
- [ ] 8.6 Add citation parsing and link generation
- [ ] 8.7 Implement question rate limiting (20/hour)
- [ ] 8.8 Create quiz generation service
- [ ] 8.9 Add quiz caching to database
- [ ] 8.10 Implement notebook content management
- [ ] 8.11 Create content sync job for documentation updates
- [ ] 8.12 Add fallback behavior for audio (browser TTS)
- [ ] 8.13 Add fallback behavior for Q&A (disabled state)
- [ ] 8.14 Implement usage analytics tracking
- [ ] 8.15 Create degraded mode UI notifications

## 9. Content Management

- [ ] 9.1 Create admin layout and navigation
- [ ] 9.2 Implement lesson CRUD pages
- [ ] 9.3 Add markdown editor with preview
- [ ] 9.4 Create learning path management pages
- [ ] 9.5 Implement drag-and-drop lesson reordering
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

- [ ] 10.1 Create auth API routes (register, login, logout, me)
- [ ] 10.2 Implement learning paths API (list, detail, enroll)
- [ ] 10.3 Create lessons API (detail, content, complete)
- [ ] 10.4 Implement progress API (get, update, export)
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
