## ADDED Requirements

### Requirement: User registration with email
The system SHALL allow new users to register using an email address and password.

#### Scenario: Successful registration
- **WHEN** a visitor submits the registration form with a valid email and password (min 8 characters)
- **THEN** the system creates a new user account and sends a verification email

#### Scenario: Duplicate email rejection
- **WHEN** a visitor attempts to register with an email already in use
- **THEN** the system displays an error message without revealing whether the email exists

#### Scenario: Weak password rejection
- **WHEN** a visitor submits a password shorter than 8 characters
- **THEN** the system displays a password requirements error and does not create the account

### Requirement: OAuth provider authentication
The system SHALL allow users to authenticate using Google or GitHub OAuth providers.

#### Scenario: First-time OAuth login
- **WHEN** a user authenticates via Google or GitHub for the first time
- **THEN** the system creates a new account linked to that OAuth provider

#### Scenario: Existing account OAuth linking
- **WHEN** an authenticated user links a new OAuth provider in settings
- **THEN** the system associates the OAuth identity with their existing account

#### Scenario: OAuth login with existing linked account
- **WHEN** a user authenticates via an OAuth provider already linked to their account
- **THEN** the system logs them in and redirects to the dashboard

### Requirement: Email and password login
The system SHALL allow registered users to log in with their email and password.

#### Scenario: Successful login
- **WHEN** a user submits valid email and password credentials
- **THEN** the system creates a session and redirects to the dashboard

#### Scenario: Invalid credentials
- **WHEN** a user submits incorrect email or password
- **THEN** the system displays a generic "invalid credentials" error without specifying which field is wrong

#### Scenario: Unverified email login attempt
- **WHEN** a user attempts to log in before verifying their email
- **THEN** the system prompts them to verify their email and offers to resend the verification link

### Requirement: Session management
The system SHALL maintain user sessions with secure cookies.

#### Scenario: Session persistence
- **WHEN** a user closes and reopens the browser within 7 days
- **THEN** the user remains logged in

#### Scenario: Session expiration
- **WHEN** a user's session is older than 30 days
- **THEN** the system requires re-authentication

#### Scenario: Manual logout
- **WHEN** a user clicks the logout button
- **THEN** the system invalidates their session and redirects to the home page

### Requirement: Password reset
The system SHALL allow users to reset their password via email.

#### Scenario: Password reset request
- **WHEN** a user requests a password reset for a registered email
- **THEN** the system sends a reset link valid for 1 hour

#### Scenario: Password reset completion
- **WHEN** a user submits a new password via a valid reset link
- **THEN** the system updates their password and invalidates all existing sessions

#### Scenario: Expired reset link
- **WHEN** a user attempts to use a reset link older than 1 hour
- **THEN** the system displays an expiration error and prompts them to request a new link

### Requirement: User profile management
The system SHALL allow users to view and update their profile information.

#### Scenario: View profile
- **WHEN** an authenticated user navigates to the profile page
- **THEN** the system displays their email, display name, and linked OAuth providers

#### Scenario: Update display name
- **WHEN** a user updates their display name
- **THEN** the system saves the change and reflects it across the platform

#### Scenario: Change password
- **WHEN** a user submits their current password and a new password
- **THEN** the system updates the password if the current password is correct

### Requirement: Account deletion
The system SHALL allow users to delete their account.

#### Scenario: Account deletion with confirmation
- **WHEN** a user requests account deletion and confirms by typing their email
- **THEN** the system permanently deletes their account and all associated data

#### Scenario: Account deletion cancellation
- **WHEN** a user initiates deletion but does not confirm
- **THEN** the system retains the account unchanged
