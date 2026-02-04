## ADDED Requirements

### Requirement: NotebookLM connection via MCP
The system SHALL connect to Google NotebookLM using the Model Context Protocol.

#### Scenario: Establish MCP connection
- **WHEN** the system starts
- **THEN** it initializes an MCP client connection to the NotebookLM server

#### Scenario: Connection health check
- **WHEN** the system performs a health check
- **THEN** it verifies NotebookLM connectivity and reports status

#### Scenario: Connection failure handling
- **WHEN** the NotebookLM connection fails
- **THEN** the system falls back to static content and displays a degraded mode notice

### Requirement: Audio lesson generation
The system SHALL retrieve audio overviews from NotebookLM for lessons.

#### Scenario: Request audio for lesson
- **WHEN** a user plays an audio lesson
- **THEN** the system requests the Audio Overview from the corresponding NotebookLM notebook

#### Scenario: Audio caching
- **WHEN** audio is retrieved from NotebookLM
- **THEN** the system caches the audio file for 24 hours to reduce API calls

#### Scenario: Audio unavailable
- **WHEN** NotebookLM cannot generate audio for a lesson
- **THEN** the system displays the lesson content in text form with a "audio unavailable" notice

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

#### Scenario: Fallback for audio
- **WHEN** audio generation fails
- **THEN** the system offers text-to-speech using browser APIs as an alternative

#### Scenario: Fallback for Q&A
- **WHEN** NotebookLM Q&A is unavailable
- **THEN** the system disables the Q&A feature and shows a maintenance message

#### Scenario: Fallback for quizzes
- **WHEN** quiz generation fails
- **THEN** the system uses manually-created quiz questions if available, otherwise skips the quiz

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
