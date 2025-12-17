This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

1. Copy `.env.example` to `.env.local` and fill in the required environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key for the AI Librarian chatbot (get it from [OpenAI Platform](https://platform.openai.com/api-keys))
   - Supabase credentials (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))

### Running the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Features

### AI Librarian Chatbot

The application includes an AI-powered librarian assistant that helps users discover books and get personalized recommendations. The chatbot:

- Provides personalized book recommendations based on your interests
- Discusses books, authors, and literary genres
- Helps you discover new reading material
- Acts as a knowledgeable and friendly librarian

**Access the chatbot:** Look for the sparkles icon (✨) in the bottom-right corner of the dashboard.

## Project Documentation

- [AI Librarian Chatbot](./AI_CHATBOT.md)
- [Settings Page & Literal.club Integration](./SETTINGS.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Supabase Setup](./SUPABASE_SETUP.md)
