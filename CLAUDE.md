# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

OpenBMC Learning Platform - A web-based learning management system for OpenBMC education featuring:
- User registration and authentication
- Curated learning paths with progress tracking
- Interactive code sandbox with QEMU-based OpenBMC environments
- NotebookLM integration for AI-powered audio lessons, Q&A, and quizzes
- Content management for lessons imported from openbmc-guide-tutorial

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL
- **Auth**: NextAuth.js (Google, GitHub OAuth + email/password)
- **Code Sandbox**: Docker + QEMU ast2600-evb + xterm.js
- **AI Features**: NotebookLM via MCP protocol

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Database commands
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema to database
npx prisma studio        # Open database GUI

# Docker development
docker-compose up -d     # Start PostgreSQL and Redis
docker-compose down      # Stop services

# Testing
npm test                 # Run unit tests
npm run test:e2e         # Run end-to-end tests
```

## OpenSpec Workflow

This project uses OpenSpec for structured change management:

1. `/opsx:new` - Start a new change
2. `/opsx:continue` - Progress to next artifact
3. `/opsx:apply` - Implement tasks
4. `/opsx:verify` - Verify implementation
5. `/opsx:archive` - Archive completed changes

Current change: `openbmc-learning-platform` (in progress)

## Project Structure

```
openbmc-learning-platform/
├── openspec/                    # OpenSpec workspace
│   └── changes/                 # Active changes
│       └── openbmc-learning-platform/
├── src/
│   ├── app/                     # Next.js App Router pages
│   ├── components/              # React components
│   ├── lib/                     # Utilities and services
│   └── styles/                  # Global styles
├── prisma/
│   └── schema.prisma            # Database schema
├── public/                      # Static assets
└── docker/                      # Docker configurations
```

## Key Documentation

- `openspec/changes/openbmc-learning-platform/proposal.md` - Project motivation and scope
- `openspec/changes/openbmc-learning-platform/design.md` - Architecture decisions
- `openspec/changes/openbmc-learning-platform/specs/` - Detailed requirements (7 capabilities)
- `openspec/changes/openbmc-learning-platform/tasks.md` - Implementation checklist
