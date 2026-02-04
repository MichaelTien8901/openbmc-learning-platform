-- Add GitHub Content Delivery columns to Lesson table
-- Replaces NotebookLM integration with direct GitHub Pages content

-- Create DisplayMode enum
CREATE TYPE "DisplayMode" AS ENUM ('IFRAME', 'RENDER');

-- Add new columns to Lesson
ALTER TABLE "Lesson" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "repositoryPath" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "displayMode" "DisplayMode" NOT NULL DEFAULT 'RENDER';

-- Add index for sourceUrl lookups
CREATE INDEX "Lesson_sourceUrl_idx" ON "Lesson"("sourceUrl");
