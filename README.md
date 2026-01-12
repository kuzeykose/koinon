# Koinon

A book management and community platform built with Next.js and Supabase.

## Features

### Book Management

- Search and discover books from Open Library
- Track your reading status and progress
- Manage your personal bookshelf

### Communities

- Create and join book communities
- Share reading lists with other members
- Follow community activity and discussions

### User Accounts

- Sign up with email or social providers (Google, Microsoft)
- Manage your profile and preferences
- Secure authentication

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- Supabase account

### Installation

1. Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd koinon
pnpm install
```

2. Set up environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Set up your database using the migrations in the `migrations/` folder

4. Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
koinon/
├── app/                 # Next.js App Router
├── components/          # React components
├── lib/                 # Utilities and configurations
├── migrations/          # Database migrations
├── docs/                # Documentation
└── types/               # TypeScript types
```

## Documentation

- [Supabase Setup](./docs/SUPABASE_SETUP.md) - Initial setup and configuration
- [Social Authentication](./docs/SOCIAL_AUTH_SETUP.md) - Google and Microsoft OAuth setup
- [Database Schema](./docs/DATABASE_SCHEMA.md) - Database structure and relationships
- [API Structure](./docs/API_STRUCTURE.md) - API endpoints and data flow
- [Migration Guide](./docs/MIGRATION_GUIDE.md) - Database migration instructions

## Tech Stack

- Next.js 14
- TypeScript
- Supabase
- Tailwind CSS
- Open Library API

## License

MIT License
