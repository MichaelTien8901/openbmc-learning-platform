-- Initial database setup for OpenBMC Learning Platform
-- This script runs automatically when PostgreSQL container starts with empty data volume

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Create application role (for least privilege)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'openbmc_app') THEN
        CREATE ROLE openbmc_app WITH LOGIN PASSWORD 'app_password';
    END IF;
END
$$;

-- Grant privileges
GRANT CONNECT ON DATABASE openbmc_learning TO openbmc_app;
GRANT USAGE ON SCHEMA public TO openbmc_app;

-- Note: Prisma will handle table creation via migrations
-- This script only sets up the database-level configuration

-- Create indexes for common search patterns (will be applied after Prisma migrations)
-- These are examples; Prisma schema should define indexes properly

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialized successfully at %', NOW();
END
$$;
