# System Overview & Documentation

This document provides a comprehensive overview of the "Koinon" system, including its architecture, data schema, key workflows, and current challenges.

## 1. System Architecture

The project is built using a modern full-stack web architecture:

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with Shadcn/UI components
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL + GoTrue)
- **External Data Source**: [Open Library API](https://openlibrary.org/developers/api)

### Directory Structure Key

- `app/`: Next.js App Router pages and API endpoints.
- `lib/actions/`: Server Actions for data mutations (Server-Side Logic).
- `lib/supabase/`: Supabase client initialization (Client/Server/Middleware).
- `components/`: React components (UI).
- `migrations/`: SQL migration files for Supabase.

## 2. Database Schema

The database design has evolved from a normalized structure (separating books and reading states) to a **denormalized** structure to simplify data management and reduce joins.

### Core Tables

#### `user_books`

This is the central table. It stores both the book metadata _and_ the user's interaction with that book.

| Column       | Type        | Description                                                                       |
| :----------- | :---------- | :-------------------------------------------------------------------------------- |
| `id`         | UUID/TEXT   | Primary Key.                                                                      |
| `user_id`    | UUID        | FK to `auth.users`. Owner of this entry.                                          |
| `book_key`   | TEXT        | Open Library identifier (e.g., `OL123W` or `OL456M`).                             |
| `title`      | TEXT        | Book title.                                                                       |
| `authors`    | JSONB       | Array of authors, e.g., `[{"name": "J.K. Rowling"}]`.                             |
| `cover`      | TEXT        | URL to the book cover.                                                            |
| `status`     | TEXT        | Reading status: `WANT_TO_READ`, `IS_READING`, `COMPLETED`, `PAUSED`, `ABANDONED`. |
| `progress`   | INTEGER     | Current progress (e.g., page number).                                             |
| `capacity`   | INTEGER     | Total pages or units.                                                             |
| `unit`       | TEXT        | Unit of progress (default: 'pages').                                              |
| `created_at` | TIMESTAMPTZ | When the user added the book.                                                     |

**Key Design Choice**: There is **no separate `books` table**. When a user adds a book, we snapshot the metadata from Open Library directly into this user's record. This ensures that even if external data changes, the user's personal shelf remains consistent unless they choose to update it.

#### `profiles`

Stores user profile information, automatically synced from `auth.users`.

| Column       | Type        | Description                                     |
| :----------- | :---------- | :---------------------------------------------- |
| `id`         | UUID        | PK, references `auth.users(id)`.                |
| `full_name`  | TEXT        | Display name.                                   |
| `avatar_url` | TEXT        | Profile picture URL.                            |
| `is_public`  | BOOLEAN     | Whether user's shelf is publicly viewable.      |
| `last_seen`  | TIMESTAMPTZ | Last activity timestamp for presence tracking.  |
| `status`     | TEXT        | Current status: `online`, `reading`, `offline`. |

- **Automation**: A PostgreSQL trigger `on_auth_user_created` automatically creates a row here when a new user signs up.

#### `communities` & `community_members`

(Based on RLS policies and documentation)
Supports social features where users can group together.

- `communities`: Groups of users.
- `community_members`: Join table linking `users` and `communities` with roles (`admin`, `member`).

### Security (RLS)

Row Level Security is strictly enforced:

- Users can only view/edit their own `user_books`.
- **Exception**: Community members can view each other's `user_books` if they are in the same accepted community (enforced via SQL policy).

## 3. Key Workflows

### Searching for Books

1.  Frontend sends query to `/api/works/search?q=...`.
2.  Route handler proxies request to Open Library Search API (`https://openlibrary.org/search.json`).
3.  Results are formatted and returned to the frontend.

### Adding a Book

1.  User selects a book from search results.
2.  `addBookToShelf` (Server Action) is called.
3.  Checks if `user_id` + `book_key` already exists to prevent duplicates.
4.  Inserts a new row into `user_books` with all metadata (`title`, `authors`, etc.) and default status (`WANT_TO_READ`).

### Tracking Progress

1.  User updates progress via UI.
2.  `updateUserBook` (Server Action) is called.
3.  Updates `progress`, `status`, and `completed` boolean in `user_books`.

### Online Presence System

The app tracks user online status using a database polling approach (no WebSocket/Realtime costs).

#### How It Works

1. **Heartbeat**: Every 30 seconds, the client updates `last_seen` timestamp in the `profiles` table.
2. **Status Query**: Periodically fetches users with `last_seen` within the last 2 minutes.
3. **Status Display**: Shows colored dot indicators on user avatars:
   - **Green**: User is online (active within 2 minutes)
   - **Purple**: User is reading (pomodoro timer active - future feature)
   - **No indicator**: User is offline

#### Key Components

- `contexts/presence-context.tsx`: React context managing presence state and heartbeat
- `components/ui/status-avatar.tsx`: Avatar wrapper with status indicator
- `profiles.last_seen`: Timestamp of last activity
- `profiles.status`: Current status (`online`, `reading`, `offline`)

#### Manual Status Control

Users can manually set themselves as "invisible" (offline) via the avatar dropdown in the header. When set to offline:

- Heartbeat stops updating `last_seen`
- User appears offline to other users
- Status persists until user manually switches back to online

#### Cost Considerations

This approach uses database polling instead of Supabase Realtime, resulting in:

- **$0 additional cost** (no Realtime connection fees)
- ~30-60 second latency (acceptable for this use case)
- Minimal database load with indexed queries

## 4. Challenges & Bottlenecks

### Data Consistency (Denormalization)

- **Issue**: Since we store book metadata per user, we have massive duplication. 100 users reading "Harry Potter" results in 100 rows containing "Harry Potter" string data.
- **Trade-off**: Simplifies queries (no joins needed for basic shelf view) and prevents "spooky action at a distance" (changing a global book record affecting all users). However, updating book metadata (e.g., fixing a typo in a title) is hard because it requires updating N rows.

### Dependency on Open Library

- **Bottleneck**: Search relies entirely on Open Library's API availability and rate limits.
- **Risk**: If Open Library goes down or changes their API, our search breaks.
- **Mitigation (Future)**: We might need a local cache of popular search results or a dedicated `books` table for cached metadata if we move away from the purely denormalized model.

### Scalability of `user_books`

- **Potential Issue**: The `user_books` table grows linearly with `Users * AvgBooksPerUser`. With 10k users each having 100 books, that's 1 million rows.
- **Current Solution**: Indexed columns (`user_id`, `status`, `book_key`) and RLS ensure queries remain fast for individual users. PostgreSQL handles this volume easily, but it's something to monitor.

### Offline Support

- **Current State**: The app is server-heavy (Server Actions).
- **Challenge**: Poor network connectivity will degrade the experience significantly (e.g., failing to update progress).
- **Future**: Better Optimistic UI updates and potentially local storage sync (PWA features).
