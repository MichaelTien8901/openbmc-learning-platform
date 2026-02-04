## ADDED Requirements

### Requirement: NotebookLM connection via MCP

The system SHALL connect to Google NotebookLM using the Model Context Protocol for content generation.

#### Scenario: Establish MCP connection

- **WHEN** the system starts
- **THEN** it initializes an MCP client connection to the NotebookLM server

#### Scenario: Connection health check

- **WHEN** the system performs a health check
- **THEN** it verifies NotebookLM connectivity and reports status

#### Scenario: Connection failure handling

- **WHEN** the NotebookLM connection fails
- **THEN** the system falls back to static content and displays a degraded mode notice

### Requirement: Content generation via NotebookLM

The system SHALL generate detailed teaching content from NotebookLM for lessons.

#### Scenario: Generate lesson content

- **WHEN** a lesson requires AI-generated content
- **THEN** the system queries NotebookLM to generate detailed explanations, code examples, and summaries

#### Scenario: Content structure

- **WHEN** generating lesson content
- **THEN** the system requests: learning objectives, detailed explanations, code examples, real-world use cases, and summary

#### Scenario: Content caching

- **WHEN** content is generated from NotebookLM
- **THEN** the system stores the content in the database for consistent access

### Requirement: Audio playback via Browser TTS

The system SHALL use the Web Speech API (Browser TTS) to speak generated content.

#### Scenario: Play lesson audio

- **WHEN** a user clicks play on a lesson
- **THEN** the system uses the browser's speechSynthesis API to speak the text content

#### Scenario: Audio controls

- **WHEN** playing audio via TTS
- **THEN** the system provides play/pause, speed control (0.5x-2x), and progress indicators

#### Scenario: Voice selection

- **WHEN** the user has multiple voices available
- **THEN** the system allows selection of preferred voice and remembers the choice

#### Scenario: TTS unavailable

- **WHEN** the browser does not support Web Speech API
- **THEN** the system displays a message and offers text-only mode

### Requirement: Interactive Q&A tutoring

The system SHALL provide AI-powered Q&A using NotebookLM's source-grounded answers.

#### Scenario: Ask a question

- **WHEN** a user submits a question while viewing a lesson
- **THEN** the system queries NotebookLM with the question scoped to relevant notebooks

#### Scenario: Display answer with citations

- **WHEN** NotebookLM returns an answer
- **THEN** the system displays the answer with clickable citations to source documentation

#### Scenario: Question rate limiting

- **WHEN** a user exceeds 20 questions per hour
- **THEN** the system displays a rate limit message and suggests reviewing existing answers

#### Scenario: Follow-up questions

- **WHEN** a user asks a follow-up question
- **THEN** the system includes conversation context in the query for continuity

### Requirement: Quiz question generation

The system SHALL generate quiz questions from NotebookLM based on lesson content.

#### Scenario: Generate quiz for lesson

- **WHEN** a lesson requires a quiz and none exists
- **THEN** the system queries NotebookLM to generate 5-10 multiple choice questions

#### Scenario: Quiz caching

- **WHEN** quiz questions are generated
- **THEN** the system stores them in the database for consistent user experience

#### Scenario: Quiz regeneration

- **WHEN** an admin requests quiz regeneration for a lesson
- **THEN** the system fetches new questions from NotebookLM and replaces cached ones

### Requirement: Notebook content management

The system SHALL manage NotebookLM notebooks for content organization.

#### Scenario: Content upload to notebook

- **WHEN** an admin imports documentation to a learning path
- **THEN** the system uploads the content to the corresponding NotebookLM notebook

#### Scenario: Notebook per learning path

- **WHEN** a new learning path is created
- **THEN** the system creates or assigns a NotebookLM notebook for that path

#### Scenario: Content sync

- **WHEN** documentation is updated
- **THEN** the system syncs changes to the relevant NotebookLM notebooks within 24 hours

### Requirement: Fallback behavior

The system SHALL gracefully degrade when NotebookLM is unavailable.

#### Scenario: Fallback for content generation

- **WHEN** NotebookLM content generation fails
- **THEN** the system uses static lesson content stored in the database

#### Scenario: Fallback for Q&A

- **WHEN** NotebookLM Q&A is unavailable
- **THEN** the system disables the Q&A feature and shows a maintenance message

#### Scenario: Fallback for quizzes

- **WHEN** quiz generation fails
- **THEN** the system uses manually-created quiz questions if available, otherwise skips the quiz

#### Scenario: Fallback for TTS

- **WHEN** Browser TTS is unavailable
- **THEN** the system displays text-only mode with a notice about audio unavailability

### Requirement: Usage analytics for AI features

The system SHALL track usage of NotebookLM-powered features.

#### Scenario: Track audio plays

- **WHEN** a user plays an audio lesson
- **THEN** the system records the play event with duration listened

#### Scenario: Track Q&A usage

- **WHEN** a user asks a question
- **THEN** the system records the question, answer, and user feedback (helpful/not helpful)

#### Scenario: Track quiz generation

- **WHEN** quizzes are generated
- **THEN** the system records generation time and question count for optimization
