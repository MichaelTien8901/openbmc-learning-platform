## ADDED Requirements

### Requirement: QEMU-based code execution
The system SHALL provide interactive OpenBMC environments using QEMU ast2600-evb.

#### Scenario: Start sandbox session
- **WHEN** a user clicks "Start Sandbox" on a code exercise
- **THEN** the system provisions a QEMU container and displays a terminal within 30 seconds

#### Scenario: Execute commands
- **WHEN** a user types a command in the terminal
- **THEN** the system executes it in the QEMU environment and displays output in real-time

#### Scenario: Sandbox isolation
- **WHEN** multiple users start sandbox sessions
- **THEN** each user receives an isolated container with no access to other sessions

### Requirement: Web-based terminal interface
The system SHALL provide a terminal emulator in the browser.

#### Scenario: Terminal display
- **WHEN** a sandbox session starts
- **THEN** the system displays a full-featured terminal with xterm.js supporting colors and cursor movement

#### Scenario: Terminal resize
- **WHEN** a user resizes the browser window
- **THEN** the terminal adjusts to the new dimensions

#### Scenario: Copy/paste support
- **WHEN** a user pastes text into the terminal
- **THEN** the system inserts the text at the cursor position

### Requirement: Code editor integration
The system SHALL provide a code editor alongside the terminal.

#### Scenario: Edit code files
- **WHEN** a user opens the code editor
- **THEN** the system displays a Monaco-based editor with syntax highlighting for C, Python, and shell

#### Scenario: Save to sandbox
- **WHEN** a user saves a file in the editor
- **THEN** the system writes the file to the QEMU filesystem

#### Scenario: Load exercise template
- **WHEN** a user starts a code exercise
- **THEN** the system pre-populates the editor with the exercise's starter code

### Requirement: Session management
The system SHALL manage sandbox session lifecycle.

#### Scenario: Session timeout
- **WHEN** a sandbox session is idle for 30 minutes
- **THEN** the system terminates the container and notifies the user

#### Scenario: Extend session
- **WHEN** a user clicks "Extend Session" before timeout
- **THEN** the system resets the idle timer for another 30 minutes

#### Scenario: Graceful session end
- **WHEN** a user clicks "End Session"
- **THEN** the system terminates the container and returns to the lesson

#### Scenario: Session recovery
- **WHEN** a user's connection drops and reconnects within 5 minutes
- **THEN** the system reconnects to the existing session

### Requirement: Resource limits
The system SHALL enforce resource limits per sandbox session.

#### Scenario: CPU limit
- **WHEN** a process in the sandbox exceeds CPU allocation
- **THEN** the system throttles the process without crashing the session

#### Scenario: Memory limit
- **WHEN** a process exceeds memory allocation (2GB default)
- **THEN** the system terminates the process and displays an out-of-memory error

#### Scenario: Disk limit
- **WHEN** files in the sandbox exceed disk allocation (10GB)
- **THEN** the system prevents further writes and displays a disk full error

### Requirement: Exercise validation
The system SHALL validate code exercise solutions.

#### Scenario: Run validation tests
- **WHEN** a user clicks "Check Solution"
- **THEN** the system runs predefined validation commands and reports pass/fail

#### Scenario: Validation feedback
- **WHEN** validation fails
- **THEN** the system displays which checks failed with hints for correction

#### Scenario: Successful validation
- **WHEN** all validation checks pass
- **THEN** the system marks the exercise complete and unlocks the next lesson

### Requirement: Sandbox usage quotas
The system SHALL enforce usage quotas to manage resources.

#### Scenario: Concurrent session limit
- **WHEN** a user attempts to start a second sandbox while one is active
- **THEN** the system prompts them to end the existing session first

#### Scenario: Daily usage limit
- **WHEN** a user exceeds 4 hours of sandbox time in a day
- **THEN** the system displays a limit reached message and suggests returning tomorrow

#### Scenario: Admin quota override
- **WHEN** an admin increases a user's quota
- **THEN** the system applies the new limits immediately
