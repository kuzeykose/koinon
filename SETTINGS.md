# Settings Page Documentation

## Overview

The Settings page (`app/dashboard/settings/page.tsx`) is a key component of the Koinon application, providing users with the ability to manage their account and integrate with external services, specifically **Literal.club**.

## Features

### 1. Account Information

- Displays the currently logged-in user's email address.
- Displays the unique User ID (UUID) from the authentication provider.

### 2. Literal.club Integration

This feature allows users to sync their reading history and current progress from [Literal.club](https://literal.club/).

#### Connection Process

1.  Users click "Connect Literal.club".
2.  A modal appears requesting Literal.club email and password.
3.  The application authenticates directly with Literal.club's GraphQL API (`https://literal.club/graphql/`) using the `login` mutation.
4.  Upon successful login, the returned authentication token and profile data are stored in the browser's `localStorage` (`literal_token`, `literal_profile`).

#### Sync Process

1.  **Fetch Data**: When the user initiates a sync (either immediately after login or via the "Sync Reading Data" button), the app fetches:
    - **Reading States**: Using the `myReadingStates` query, it retrieves the list of books the user has interacted with, including status (e.g., "reading", "completed") and book metadata (title, authors, cover, etc.).
    - **Reading Progress**: Using the `readingProgresses` query, it retrieves specific progress data (e.g., pages read, percentage) for the fetched books.
2.  **Review**: An approval modal ("Review Books Before Syncing") displays the fetched books with their covers, titles, authors, and current status. Users must review and approve this list before data is saved.
3.  **Save to Database**: Upon approval, the data is upserted into the Supabase database:
    - **Books**: Stored in the `books` table.
    - **Reading States**: Stored in the `reading_states` table (linked to user and book).
    - **Reading Progress**: Stored in the `reading_progresses` table.

### 3. Authentication Management

- **Sign Out**: Users can securely sign out of the application, which clears the session and redirects them to the landing page.

## Technical Details

### Component Structure

The page is built using a single main component `SettingsPage` which utilizes several UI components from the `components/ui` directory:

- `Card`: For grouping content (Literal.club Integration, Account Info).
- `Dialog`: For the login form and sync approval modal.
- `Button`: For actions.
- `ScrollArea`: For the list of books in the approval modal.
- `Toast`: For user feedback (success/error messages).

### External APIs

- **Literal.club GraphQL API**: Used for authentication and fetching user data.
  - Endpoint: `https://literal.club/graphql/`
  - Operations: `login`, `myReadingStates`, `readingProgresses`.

### Database Interactions (Supabase)

The sync process performs `upsert` operations on the following tables to ensure data is updated without creating duplicates:

- `books`: Stores book metadata.
- `reading_states`: Stores the relationship between user and book (status).
- `reading_progresses`: Stores detailed reading progress.

For the complete database schema and SQL definitions, please refer to [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md).

### State Management

The component manages several local states:

- `user`: Current authenticated user context.
- `isModalOpen`: Visibility of the Literal.club login modal.
- `isApprovalModalOpen`: Visibility of the sync approval modal.
- `pendingBooks`: Array of books fetched from Literal.club waiting for approval.
- `syncStatus`: Stores the count of synced states and progresses for display.
