## ADDED Requirements

### Requirement: Lesson CRUD operations
The system SHALL allow administrators to create, read, update, and delete lessons.

#### Scenario: Create lesson
- **WHEN** an admin submits the lesson creation form with title, content, and metadata
- **THEN** the system creates the lesson and makes it available for path assignment

#### Scenario: Edit lesson
- **WHEN** an admin updates lesson content
- **THEN** the system saves changes and preserves user progress on that lesson

#### Scenario: Delete lesson
- **WHEN** an admin deletes a lesson not assigned to any path
- **THEN** the system removes the lesson from the database

#### Scenario: Delete lesson in use
- **WHEN** an admin attempts to delete a lesson assigned to a path
- **THEN** the system prevents deletion and displays the paths using this lesson

### Requirement: Learning path management
The system SHALL allow administrators to create and manage learning paths.

#### Scenario: Create learning path
- **WHEN** an admin creates a path with title, description, difficulty, and lessons
- **THEN** the system creates the path and makes it available to users

#### Scenario: Reorder lessons in path
- **WHEN** an admin drags lessons to reorder them
- **THEN** the system updates the lesson sequence and navigation

#### Scenario: Set path prerequisites
- **WHEN** an admin specifies prerequisite paths
- **THEN** the system enforces prerequisite completion for access

#### Scenario: Publish/unpublish path
- **WHEN** an admin toggles path visibility
- **THEN** the system shows or hides the path from the public catalog

### Requirement: Documentation import
The system SHALL import lessons from markdown documentation.

#### Scenario: Import from file
- **WHEN** an admin uploads a markdown file with YAML frontmatter
- **THEN** the system parses metadata and creates a lesson

#### Scenario: Bulk import from directory
- **WHEN** an admin specifies a directory path (e.g., from openbmc-guide-tutorial)
- **THEN** the system imports all markdown files as lessons with directory structure as categories

#### Scenario: Import conflict handling
- **WHEN** importing a lesson with a title matching an existing lesson
- **THEN** the system prompts the admin to skip, overwrite, or create duplicate

### Requirement: Code exercise management
The system SHALL allow administrators to create code exercises.

#### Scenario: Create code exercise
- **WHEN** an admin defines a code exercise with starter code, instructions, and validation script
- **THEN** the system attaches the exercise to a lesson

#### Scenario: Edit validation script
- **WHEN** an admin updates the validation script
- **THEN** the system applies new validation to future submissions

#### Scenario: Test exercise in sandbox
- **WHEN** an admin clicks "Test Exercise"
- **THEN** the system launches a sandbox with the exercise for admin verification

### Requirement: Quiz management
The system SHALL allow administrators to manage quiz questions.

#### Scenario: View generated quiz questions
- **WHEN** an admin views a lesson's quiz
- **THEN** the system displays all questions with correct answers marked

#### Scenario: Edit quiz question
- **WHEN** an admin modifies a question or answer
- **THEN** the system saves the change and uses the edited version

#### Scenario: Add manual quiz question
- **WHEN** an admin adds a custom question
- **THEN** the system includes it in the quiz alongside generated questions

#### Scenario: Remove quiz question
- **WHEN** an admin removes a question
- **THEN** the system excludes it from future quiz attempts

### Requirement: Content versioning
The system SHALL track versions of lessons and paths.

#### Scenario: View version history
- **WHEN** an admin views a lesson's history
- **THEN** the system displays all previous versions with timestamps and editors

#### Scenario: Restore previous version
- **WHEN** an admin restores a previous version
- **THEN** the system reverts the lesson content to that version

#### Scenario: Compare versions
- **WHEN** an admin selects two versions to compare
- **THEN** the system displays a diff view highlighting changes

### Requirement: Admin role management
The system SHALL support different admin permission levels.

#### Scenario: Content editor role
- **WHEN** a user has the "editor" role
- **THEN** they can create and edit lessons but cannot delete or manage paths

#### Scenario: Full admin role
- **WHEN** a user has the "admin" role
- **THEN** they can perform all content management operations

#### Scenario: Assign roles
- **WHEN** an admin assigns a role to a user
- **THEN** the system grants the corresponding permissions immediately

### Requirement: Content analytics
The system SHALL provide analytics on content usage.

#### Scenario: Lesson completion rates
- **WHEN** an admin views lesson analytics
- **THEN** the system displays completion rate, average time, and drop-off points

#### Scenario: Path engagement metrics
- **WHEN** an admin views path analytics
- **THEN** the system displays enrollment count, completion rate, and average time to complete

#### Scenario: Low-performing content alerts
- **WHEN** a lesson has less than 50% completion rate
- **THEN** the system flags it for review on the admin dashboard
