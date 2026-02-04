## Why

There is no structured, interactive learning platform for OpenBMC development. The existing documentation (openbmc-guide-tutorial) provides static content, but learners lack guided paths, progress tracking, and interactive practice environments. Creating a web-based learning management system will make OpenBMC education more accessible and effective, while leveraging NotebookLM for AI-powered content generation reduces development effort significantly.

## What Changes

- Create a new web-based learning platform for OpenBMC education
- Implement user registration and authentication system
- Build curated learning paths with prerequisite tracking
- Integrate code sandbox for interactive OpenBMC examples (QEMU-based)
- Connect to Google NotebookLM via MCP for:
  - AI-generated audio lessons (replacing traditional video)
  - Interactive Q&A tutoring with source-grounded answers
  - Dynamic quiz generation from documentation
- Track user progress across lessons and learning paths
- Reuse existing openbmc-guide-tutorial documentation as source content

## Capabilities

### New Capabilities

- `user-auth`: User registration, login, profile management, and session handling
- `learning-paths`: Curated learning sequences with prerequisites, difficulty levels, and completion tracking
- `progress-tracking`: Track lesson completion, quiz scores, code exercise results, and learning streaks
- `code-sandbox`: Interactive code editor with QEMU-based OpenBMC execution environment
- `notebooklm-integration`: MCP bridge to NotebookLM for audio lessons, Q&A, and quiz generation
- `content-management`: Admin interface for managing lessons, paths, and importing documentation
- `lesson-player`: Unified UI for consuming audio, reading docs, taking quizzes, and running code

### Modified Capabilities

<!-- No existing specs to modify - this is a new project -->

## Impact

### New Systems
- **Frontend**: Next.js web application with lesson player, code editor, dashboard
- **Backend**: API server for auth, progress, content management
- **Database**: PostgreSQL for users, progress, content metadata
- **Code Execution**: Containerized QEMU environments for OpenBMC code testing
- **External Integration**: NotebookLM via MCP protocol

### Dependencies
- Google NotebookLM (free tier, requires Google account)
- OpenBMC documentation repository (content source)
- QEMU ast2600-evb images for code sandbox
- MCP SDK for NotebookLM integration

### Deployment
- Self-hosted or cloud deployment (Docker/Kubernetes)
- Separate services: web app, API, code executor, NotebookLM bridge

### Content Pipeline
- Import markdown from openbmc-guide-tutorial
- Upload to NotebookLM for AI processing
- Sync content updates periodically
