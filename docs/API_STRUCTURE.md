# API Structure

This document describes the separation between Works and Books (Editions) in the API.

## Concepts

### Work

A **Work** represents the abstract concept of a book - the intellectual content created by an author(s). For example, "Harry Potter and the Philosopher's Stone" by J.K. Rowling is a work.

**Key characteristics:**

- Has a unique Open Library work key (e.g., `OL123W`)
- Contains work-level metadata: title, authors, description, subjects, first publish year
- Does NOT have ISBNs (ISBNs belong to editions)
- Multiple editions can belong to the same work

### Edition (Book)

An **Edition** represents a specific physical or digital publication of a work. For example, the 1997 UK hardcover edition published by Bloomsbury is an edition.

**Key characteristics:**

- Has a unique Open Library edition key (e.g., `OL123M`)
- Contains edition-specific metadata: ISBN, publisher, page count, format, language
- Always belongs to a work (via `workKey`)
- Multiple editions can exist for the same work (different publishers, years, formats, etc.)

## API Endpoints

### Works API

#### `GET /api/works/[id]`

Fetches details about a work.

**Parameters:**

- `id` (path): Work key from Open Library (e.g., `OL123W`)

**Response:**

```json
{
  "work": {
    "workKey": "OL123W",
    "title": "Harry Potter and the Philosopher's Stone",
    "subtitle": null,
    "authors": [{ "name": "J.K. Rowling" }],
    "cover": "https://covers.openlibrary.org/b/id/123-L.jpg",
    "description": "The first book in the Harry Potter series...",
    "subjects": ["Magic", "Fantasy", "Wizards"],
    "firstPublishYear": 1997,
    "source": "openlibrary"
  }
}
```

#### `GET /api/works/search`

Searches for works by title, author, or other metadata.

**Query Parameters:**

- `q` (required): Search query string

**Response:**

```json
{
  "results": [
    {
      "workKey": "OL123W",
      "title": "Harry Potter and the Philosopher's Stone",
      "authors": [{ "name": "J.K. Rowling" }],
      "cover": "https://covers.openlibrary.org/b/id/123-M.jpg",
      "firstPublishYear": 1997,
      "source": "openlibrary"
    }
  ]
}
```

### Editions API

#### `GET /api/editions`

Fetches all editions for a given work with pagination.

**Query Parameters:**

- `workKey` (required): Work key from Open Library (e.g., `OL123W`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**

```json
{
  "editions": [
    {
      "key": "OL123M",
      "title": "Harry Potter and the Philosopher's Stone",
      "isbn13": "9780747532699",
      "isbn10": "0747532699",
      "cover": "https://covers.openlibrary.org/b/id/456-M.jpg",
      "publisher": "Bloomsbury",
      "publish_date": "1997",
      "page_count": 223,
      "format": "Hardcover",
      "language": "eng"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasMore": true
  },
  "source": "openlibrary"
}
```

### Books API (Specific Editions)

#### `GET /api/books/[id]`

Fetches details about a specific book edition.

**Parameters:**

- `id` (path): Edition key from Open Library (e.g., `OL123M`)

**Response:**

```json
{
  "book": {
    "isbn13": "9780747532699",
    "isbn10": "0747532699",
    "openLibraryKey": "OL123M",
    "workKey": "OL456W",
    "title": "Harry Potter and the Philosopher's Stone",
    "subtitle": null,
    "authors": [{ "name": "J.K. Rowling" }],
    "cover": "https://covers.openlibrary.org/b/id/456-L.jpg",
    "publishDate": "1997",
    "publisher": "Bloomsbury",
    "pageCount": 223,
    "description": "The first book in the Harry Potter series...",
    "subjects": ["Magic", "Fantasy", "Wizards"],
    "format": "Hardcover",
    "language": "eng",
    "source": "openlibrary"
  }
}
```

## Frontend Components

### Book Search (`/components/shelf/book-search.tsx`)

- Uses `/api/works/search` to search for works
- Displays work-level results
- Navigates to `/dashboard/book/[workKey]` when a work is selected

### Book Detail Page (`/app/dashboard/book/[id]/page.tsx`)

- Smart component that handles both works and editions
- Determines type by checking the key format:
  - Work keys contain 'W' (e.g., `OL123W`)
  - Edition keys contain 'M' (e.g., `OL123M`)
- Fetches from `/api/works/[id]` or `/api/books/[id]` accordingly
- Shows work-level or edition-level metadata based on the type

### Book Editions Component (`/components/book/book-editions.tsx`)

- Uses `/api/editions` to fetch all editions for a work
- Displays a horizontal scrollable list of editions
- Clicking an edition navigates to `/dashboard/book/[editionKey]`

## Data Flow

1. **User searches for a book**

   - Search component queries `/api/works/search`
   - Returns list of works

2. **User clicks on a search result**

   - Navigates to `/dashboard/book/[workKey]`
   - Page fetches work details from `/api/works/[workKey]`
   - Displays work information
   - Automatically fetches editions from `/api/editions?workKey=...`

3. **User clicks on an edition**

   - Navigates to `/dashboard/book/[editionKey]`
   - Page detects it's an edition key (contains 'M')
   - Fetches edition details from `/api/books/[editionKey]`
   - Displays edition-specific information
   - Shows other editions using the edition's `workKey`

4. **User adds a book to shelf**
   - Can add from either work or edition view
   - `addBookToShelf` action handles both cases
   - Creates/finds work in database
   - Creates specific edition if ISBN is provided
   - Links work to user's shelf

## Key Differences

| Aspect                     | Work              | Edition                |
| -------------------------- | ----------------- | ---------------------- |
| **ID Format**              | `OL[number]W`     | `OL[number]M`          |
| **API Endpoint**           | `/api/works/[id]` | `/api/books/[id]`      |
| **Has ISBN**               | ❌ No             | ✅ Yes                 |
| **Has Publisher**          | ❌ No             | ✅ Yes                 |
| **Has Page Count**         | ❌ No\*           | ✅ Yes                 |
| **Has Format**             | ❌ No             | ✅ Yes                 |
| **Has First Publish Year** | ✅ Yes            | ❌ No\*                |
| **Unique to**              | Content           | Physical manifestation |

\*Note: The books table may cache some edition data (like page_count, publisher) for convenience, but these are edition-specific properties.

## Database Schema

### `books` table (Works)

- `id`: UUID (primary key)
- `work_key`: Open Library work key (e.g., `OL123W`)
- `title`, `subtitle`, `description`
- `authors`: JSON array
- `subjects`: JSON array
- Cached edition data: `cover`, `publisher`, `page_count`, `isbn13` (from a representative edition)

### `editions` table

- `id`: UUID (primary key)
- `book_id`: Foreign key to `books` table
- `isbn13`, `isbn10`
- `title`, `publisher`, `page_count`, `published_date`
- `cover`, `language`, `format` (physical format like "Hardcover")

### `user_books` table

- Links users to **works** (not editions)
- Users track their reading status at the work level
- Can later be extended to track specific editions if needed
