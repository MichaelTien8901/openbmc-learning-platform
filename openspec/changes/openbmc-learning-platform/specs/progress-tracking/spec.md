## ADDED Requirements

### Requirement: Lesson completion tracking
The system SHALL track completion status for each lesson per user.

#### Scenario: Mark lesson complete
- **WHEN** a user finishes reading lesson content and clicks "Mark Complete"
- **THEN** the system records the completion with timestamp

#### Scenario: Automatic completion for quizzes
- **WHEN** a user passes a lesson's quiz (score >= 70%)
- **THEN** the system automatically marks the lesson as complete

#### Scenario: View lesson completion history
- **WHEN** a user views their progress dashboard
- **THEN** the system displays all completed lessons with completion dates

### Requirement: Quiz score tracking
The system SHALL record all quiz attempts and scores.

#### Scenario: Record quiz attempt
- **WHEN** a user submits a quiz
- **THEN** the system records the attempt with score, answers, and timestamp

#### Scenario: View quiz history
- **WHEN** a user views a completed lesson
- **THEN** the system displays their quiz attempts with scores and correct answers

#### Scenario: Best score display
- **WHEN** displaying quiz progress in the UI
- **THEN** the system shows the highest score achieved across all attempts

### Requirement: Code exercise tracking
The system SHALL track code exercise completion and submissions.

#### Scenario: Record code submission
- **WHEN** a user runs code in the sandbox that passes validation
- **THEN** the system records the successful completion

#### Scenario: View code exercise history
- **WHEN** a user returns to a completed code exercise
- **THEN** the system displays their last successful submission

#### Scenario: Track exercise attempts
- **WHEN** a user attempts a code exercise
- **THEN** the system increments the attempt counter for analytics

### Requirement: Learning streak tracking
The system SHALL track consecutive days of learning activity.

#### Scenario: Streak increment
- **WHEN** a user completes at least one lesson on a new calendar day
- **THEN** the system increments their streak counter

#### Scenario: Streak reset
- **WHEN** a user misses a full calendar day without activity
- **THEN** the system resets their streak to zero

#### Scenario: Streak display
- **WHEN** a user views their dashboard
- **THEN** the system displays current streak and longest streak achieved

### Requirement: Progress dashboard
The system SHALL provide a unified progress dashboard.

#### Scenario: View overall progress
- **WHEN** a user navigates to the progress dashboard
- **THEN** the system displays: total lessons completed, paths in progress, quiz average, streak

#### Scenario: Weekly activity chart
- **WHEN** viewing the dashboard
- **THEN** the system displays a chart showing learning activity over the past 7 days

#### Scenario: Path-specific progress
- **WHEN** a user selects a path on the dashboard
- **THEN** the system displays detailed progress for that path including lesson-by-lesson status

### Requirement: Progress export
The system SHALL allow users to export their learning progress.

#### Scenario: Export progress to JSON
- **WHEN** a user requests a progress export
- **THEN** the system generates a JSON file with all completion data, scores, and timestamps

#### Scenario: Export for resume/portfolio
- **WHEN** a user requests a summary export
- **THEN** the system generates a formatted PDF with completed paths and skills

### Requirement: Progress persistence across devices
The system SHALL synchronize progress across all user devices.

#### Scenario: Cross-device sync
- **WHEN** a user logs in on a new device
- **THEN** the system displays the same progress as on other devices

#### Scenario: Offline progress warning
- **WHEN** a user attempts to mark progress while offline
- **THEN** the system queues the update and syncs when connection is restored
