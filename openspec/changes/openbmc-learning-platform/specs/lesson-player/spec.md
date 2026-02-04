## ADDED Requirements

### Requirement: Unified lesson interface
The system SHALL provide a single interface for consuming all lesson content types.

#### Scenario: Load lesson
- **WHEN** a user opens a lesson
- **THEN** the system displays a unified player with sections for content, audio, quiz, and code exercise

#### Scenario: Content type tabs
- **WHEN** a lesson has multiple content types (text, audio, code)
- **THEN** the system displays tabs to switch between them

#### Scenario: Responsive layout
- **WHEN** a user views a lesson on mobile
- **THEN** the system stacks content sections vertically for readability

### Requirement: Text content display
The system SHALL render markdown lesson content.

#### Scenario: Render markdown
- **WHEN** a lesson loads
- **THEN** the system renders markdown with syntax-highlighted code blocks

#### Scenario: Table of contents
- **WHEN** lesson content has multiple headings
- **THEN** the system displays a collapsible table of contents sidebar

#### Scenario: Internal navigation
- **WHEN** a user clicks a table of contents entry
- **THEN** the system scrolls to that section smoothly

### Requirement: Audio player
The system SHALL provide an audio player for NotebookLM-generated lessons.

#### Scenario: Play audio
- **WHEN** a user clicks play on the audio player
- **THEN** the system streams the audio and displays playback progress

#### Scenario: Playback controls
- **WHEN** audio is playing
- **THEN** the system provides play/pause, seek bar, speed control (0.5x-2x), and volume

#### Scenario: Resume audio position
- **WHEN** a user returns to a partially-listened audio lesson
- **THEN** the system resumes from their last position

#### Scenario: Audio transcript
- **WHEN** audio is available
- **THEN** the system displays a synchronized transcript with clickable timestamps

### Requirement: Quiz interface
The system SHALL provide an interactive quiz experience.

#### Scenario: Start quiz
- **WHEN** a user clicks "Take Quiz"
- **THEN** the system displays questions one at a time with multiple choice options

#### Scenario: Submit answer
- **WHEN** a user selects an answer and clicks next
- **THEN** the system records the answer and shows the next question

#### Scenario: Quiz completion
- **WHEN** a user answers all questions
- **THEN** the system displays score, correct answers, and explanations

#### Scenario: Retry quiz
- **WHEN** a user clicks "Retry Quiz"
- **THEN** the system resets the quiz with questions in a new random order

### Requirement: Code exercise interface
The system SHALL integrate code exercises into the lesson player.

#### Scenario: View exercise instructions
- **WHEN** a lesson has a code exercise
- **THEN** the system displays exercise instructions alongside the code editor

#### Scenario: Launch sandbox
- **WHEN** a user clicks "Start Coding"
- **THEN** the system opens the sandbox with exercise starter code loaded

#### Scenario: Split view
- **WHEN** the sandbox is active
- **THEN** the system displays instructions and terminal side-by-side

### Requirement: Lesson navigation
The system SHALL provide navigation between lessons in a path.

#### Scenario: Next lesson button
- **WHEN** a user completes a lesson
- **THEN** the system displays a "Next Lesson" button linking to the next in sequence

#### Scenario: Previous lesson button
- **WHEN** a user is not on the first lesson
- **THEN** the system displays a "Previous Lesson" button

#### Scenario: Path progress indicator
- **WHEN** viewing a lesson
- **THEN** the system displays a progress bar showing position in the learning path

#### Scenario: Lesson list sidebar
- **WHEN** a user clicks the lesson list toggle
- **THEN** the system displays all lessons in the path with completion status

### Requirement: Lesson bookmarking
The system SHALL allow users to bookmark lessons for later review.

#### Scenario: Add bookmark
- **WHEN** a user clicks the bookmark icon on a lesson
- **THEN** the system saves the bookmark to their profile

#### Scenario: View bookmarks
- **WHEN** a user navigates to their bookmarks
- **THEN** the system displays all bookmarked lessons with quick access links

#### Scenario: Remove bookmark
- **WHEN** a user clicks the bookmark icon on a bookmarked lesson
- **THEN** the system removes the bookmark

### Requirement: Note-taking
The system SHALL allow users to take notes within lessons.

#### Scenario: Add note
- **WHEN** a user types in the notes panel and saves
- **THEN** the system stores the note associated with that lesson

#### Scenario: View notes
- **WHEN** a user opens the notes panel
- **THEN** the system displays their saved notes for the current lesson

#### Scenario: Export notes
- **WHEN** a user exports notes
- **THEN** the system generates a markdown file with all notes organized by lesson

### Requirement: Accessibility
The system SHALL ensure lesson content is accessible.

#### Scenario: Keyboard navigation
- **WHEN** a user navigates with keyboard only
- **THEN** all interactive elements are focusable and operable

#### Scenario: Screen reader support
- **WHEN** a screen reader processes the lesson player
- **THEN** all content and controls have appropriate ARIA labels

#### Scenario: High contrast mode
- **WHEN** a user enables high contrast mode
- **THEN** the system adjusts colors for improved visibility
