-- Remove NotebookLM-related tables (deprecated)
-- These tables were used for AI-generated content caching and analytics
-- Replaced by direct GitHub content delivery

-- Drop AI usage analytics tables
DROP TABLE IF EXISTS "AIUsageDaily";
DROP TABLE IF EXISTS "AIUsageEvent";

-- Drop AI content cache tables
DROP TABLE IF EXISTS "AIResponseCache";
DROP TABLE IF EXISTS "GeneratedContent";

-- Drop AI-related enums
DROP TYPE IF EXISTS "AIEventType";
DROP TYPE IF EXISTS "AIFeature";
DROP TYPE IF EXISTS "GeneratedContentType";

-- Note: notebookId column on Lesson is retained for now (can be removed later)
-- QuizSource enum retains NOTEBOOKLM value for historical quiz data
