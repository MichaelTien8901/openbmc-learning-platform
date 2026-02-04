# Local Development Guide

This guide covers how to start, stop, and manage the local development environment for the OpenBMC Learning Platform.

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- npm or yarn

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start database services (PostgreSQL + Redis)
docker compose up -d

# 3. Set up the database
npx prisma generate
npx prisma db push
npm run db:seed  # Optional: seed with sample data

# 4. Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

## Starting the Environment

### Step 1: Start Database Services

```bash
docker compose up -d
```

This starts:

- **PostgreSQL** (port 5432) - Main database
- **Redis** (port 6379) - Caching and sessions

Verify containers are running:

```bash
docker ps
```

### Step 2: Start Next.js Development Server

```bash
npm run dev
```

The server starts with hot-reload enabled at `http://localhost:3000`

## Stopping the Environment

### Stop Next.js Server

Press `Ctrl+C` in the terminal running `npm run dev`

Or from another terminal:

```bash
pkill -f "next dev"
```

### Stop Database Services

```bash
docker compose down
```

To also remove volumes (deletes all data):

```bash
docker compose down -v
```

## Database Commands

| Command               | Description                                    |
| --------------------- | ---------------------------------------------- |
| `npm run db:generate` | Generate Prisma client after schema changes    |
| `npm run db:push`     | Push schema changes to database                |
| `npm run db:seed`     | Seed database with sample users and content    |
| `npm run db:studio`   | Open Prisma Studio (database GUI at port 5555) |

## Development Commands

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Start development server with hot-reload |
| `npm run build`    | Build for production                     |
| `npm run start`    | Start production server                  |
| `npm run lint`     | Run ESLint                               |
| `npm run lint:fix` | Run ESLint and fix issues                |
| `npm run format`   | Format code with Prettier                |

## Testing Commands

| Command                   | Description                        |
| ------------------------- | ---------------------------------- |
| `npm test`                | Run unit tests                     |
| `npm run test:watch`      | Run tests in watch mode            |
| `npm run test:coverage`   | Run tests with coverage report     |
| `npm run test:e2e`        | Run Playwright end-to-end tests    |
| `npm run test:e2e:headed` | Run e2e tests with browser visible |
| `npm run test:e2e:ui`     | Run e2e tests with Playwright UI   |

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/openbmc_learning"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Email (for password reset)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="user"
SMTP_PASS="password"
```

## Troubleshooting

### Database Connection Failed

1. Check if Docker containers are running:

   ```bash
   docker ps
   ```

2. Restart the containers:

   ```bash
   docker compose down
   docker compose up -d
   ```

3. Verify DATABASE_URL in `.env` matches docker-compose settings

### Port Already in Use

If port 3000 is busy:

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or start on a different port
npm run dev -- -p 3001
```

### Prisma Client Issues

Regenerate the Prisma client:

```bash
npx prisma generate
```

### Reset Everything

```bash
# Stop all services
docker compose down -v
pkill -f "next dev"

# Remove node_modules and reinstall
rm -rf node_modules .next
npm install

# Start fresh
docker compose up -d
npx prisma db push
npm run db:seed
npm run dev
```

## Health Check

Verify the application is running correctly:

```bash
curl http://localhost:3000/api/health | jq .
```

Expected response:

```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "healthy", "latency": 15 },
    "memory": { "status": "healthy", "percentage": 45 }
  }
}
```

## Sample Accounts

After running `npm run db:seed`, these accounts are available:

| Email             | Password    | Role  |
| ----------------- | ----------- | ----- |
| admin@example.com | password123 | Admin |
| user@example.com  | password123 | User  |
