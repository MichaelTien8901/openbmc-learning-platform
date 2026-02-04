#!/bin/bash
# Database migration script for OpenBMC Learning Platform
# Usage: ./scripts/migrate.sh [command]
# Commands: deploy, reset, status, generate

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    echo "Please set DATABASE_URL before running migrations"
    exit 1
fi

COMMAND=${1:-deploy}

case $COMMAND in
    deploy)
        echo -e "${GREEN}Deploying migrations...${NC}"
        npx prisma migrate deploy
        echo -e "${GREEN}Migrations deployed successfully${NC}"
        ;;

    reset)
        echo -e "${YELLOW}WARNING: This will reset the database and delete all data!${NC}"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}Resetting database...${NC}"
            npx prisma migrate reset --force
            echo -e "${GREEN}Database reset complete${NC}"
        else
            echo "Aborted"
            exit 0
        fi
        ;;

    status)
        echo -e "${GREEN}Checking migration status...${NC}"
        npx prisma migrate status
        ;;

    generate)
        echo -e "${GREEN}Generating Prisma client...${NC}"
        npx prisma generate
        echo -e "${GREEN}Prisma client generated${NC}"
        ;;

    seed)
        echo -e "${GREEN}Seeding database...${NC}"
        npx tsx prisma/seed.ts
        echo -e "${GREEN}Database seeded successfully${NC}"
        ;;

    *)
        echo "Usage: $0 {deploy|reset|status|generate|seed}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Apply pending migrations to the database"
        echo "  reset    - Reset database (WARNING: deletes all data)"
        echo "  status   - Check migration status"
        echo "  generate - Generate Prisma client"
        echo "  seed     - Seed the database with initial data"
        exit 1
        ;;
esac
