## MODIFIED Requirements

### Requirement: Direct content delivery from GitHub Pages

The system SHALL deliver learning content directly from the openbmc-guide-tutorial GitHub Pages site instead of NotebookLM-generated content.

**Rationale**: NotebookLM MCP integration and voice lectures have proven ineffective for the learning experience. Direct content delivery from the authoritative source (MichaelTien8901.github.io/openbmc-guide-tutorial) provides a simpler, more reliable learning path.

#### Scenario: Fetch content from GitHub Pages

- **WHEN** a user opens a lesson
- **THEN** the system fetches or displays content sourced from https://MichaelTien8901.github.io/openbmc-guide-tutorial

#### Scenario: Embedded content view

- **WHEN** a lesson references openbmc-guide-tutorial content
- **THEN** the system can either embed the content via iframe or render fetched markdown directly

#### Scenario: Link to source documentation

- **WHEN** displaying lesson content
- **THEN** the system provides a "View Original" link to the corresponding GitHub Pages URL

#### Scenario: Content synchronization

- **WHEN** the source documentation is updated on GitHub
- **THEN** the system reflects changes on next page load (no caching of generated content)

### Requirement: GitHub-based content navigation

The system SHALL provide structured navigation through openbmc-guide-tutorial topics.

#### Scenario: Topic-based learning paths

- **WHEN** a user views available learning paths
- **THEN** the system organizes content by openbmc-guide-tutorial sections (D-Bus, Phosphor, Yocto, etc.)

#### Scenario: Sequential lesson progression

- **WHEN** a user completes a lesson
- **THEN** the system guides them to the next logical topic from the tutorial structure

#### Scenario: Cross-reference navigation

- **WHEN** lesson content references another topic
- **THEN** the system provides quick links to related lessons

### Requirement: Simplified content model

The system SHALL use a streamlined content model without AI-generated augmentation.

#### Scenario: Markdown-first content

- **WHEN** storing lesson references
- **THEN** the system stores the GitHub source URL and extracted metadata, not generated content

#### Scenario: No AI content generation dependency

- **WHEN** displaying lessons
- **THEN** the system renders documentation content directly without requiring NotebookLM or AI services

#### Scenario: Optional manual quizzes

- **WHEN** a lesson needs assessment
- **THEN** quizzes are manually created by admins, not AI-generated

## REMOVED Requirements

### Requirement: NotebookLM connection via MCP

**REMOVED** - The system no longer connects to NotebookLM via MCP.

### Requirement: Content generation via NotebookLM

**REMOVED** - The system no longer generates teaching content from NotebookLM.

### Requirement: Audio playback via Browser TTS

**REMOVED** - Browser TTS audio playback is removed in favor of text-based learning.

### Requirement: Interactive Q&A tutoring

**REMOVED** - NotebookLM-powered Q&A is removed. Users refer directly to source documentation.

### Requirement: Quiz question generation

**REMOVED** - AI quiz generation is removed. Quizzes are manually created when needed.

### Requirement: Notebook content management

**REMOVED** - NotebookLM notebook management is no longer required.

### Requirement: Fallback behavior (NotebookLM-specific)

**REMOVED** - No fallback needed as there is no AI dependency.

### Requirement: Usage analytics for AI features

**REMOVED** - AI feature analytics are no longer relevant.

## ADDED Requirements

### Requirement: GitHub Pages integration

The system SHALL integrate directly with the openbmc-guide-tutorial GitHub Pages site.

#### Scenario: Configure source repository

- **WHEN** an admin sets up the content source
- **THEN** the system accepts the GitHub Pages URL (https://MichaelTien8901.github.io/openbmc-guide-tutorial)

#### Scenario: Automatic content discovery

- **WHEN** the system initializes or refreshes
- **THEN** it discovers available documentation pages from the GitHub repository structure

#### Scenario: Lesson mapping

- **WHEN** mapping GitHub content to lessons
- **THEN** the system creates lesson entries with:
  - `sourceUrl`: Direct link to GitHub Pages content
  - `repositoryPath`: Path within the repository (e.g., `docs/dbus/basics.md`)
  - `title`: Extracted from document frontmatter or first heading
  - `category`: Derived from directory structure

### Requirement: Iframe or direct rendering modes

The system SHALL support multiple content display modes.

#### Scenario: Iframe mode

- **WHEN** displaying content in iframe mode
- **THEN** the system embeds the GitHub Pages URL directly, preserving original styling

#### Scenario: Direct render mode

- **WHEN** displaying content in direct render mode
- **THEN** the system fetches raw markdown from GitHub and renders with platform styling

#### Scenario: Mode selection

- **WHEN** an admin configures a learning path
- **THEN** they can choose between iframe and direct render mode per path or globally

### Requirement: Progress tracking for external content

The system SHALL track user progress through GitHub-sourced content.

#### Scenario: Mark lesson complete

- **WHEN** a user clicks "Mark Complete" or reaches end of content
- **THEN** the system records completion in the user's progress

#### Scenario: Time tracking

- **WHEN** a user views lesson content
- **THEN** the system tracks time spent for analytics (page focus time)

#### Scenario: Resume position

- **WHEN** a user returns to a partially-read lesson
- **THEN** the system scrolls to their approximate last position (if using direct render mode)

### Requirement: Simplified admin workflow

The system SHALL provide streamlined content management for GitHub-sourced content.

#### Scenario: Sync from GitHub

- **WHEN** an admin clicks "Sync Content"
- **THEN** the system refreshes lesson metadata from the GitHub repository

#### Scenario: Manual lesson ordering

- **WHEN** an admin arranges lessons in a path
- **THEN** the system saves the custom order independent of GitHub structure

#### Scenario: Supplementary content

- **WHEN** an admin adds platform-specific content (quizzes, exercises)
- **THEN** the system stores this alongside the GitHub source reference
