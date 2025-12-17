# AI Librarian Chatbot

## Overview

The Book Shelf application includes an AI-powered librarian assistant that provides personalized book recommendations and literary guidance. The chatbot is powered by OpenAI's GPT-4 and uses the Vercel AI SDK for streaming responses.

## Features

- **Personalized Recommendations**: Get book suggestions based on your interests and reading preferences
- **Literary Knowledge**: Ask about authors, genres, and book themes
- **Interactive Conversations**: Natural, flowing conversations about books and literature
- **Real-time Streaming**: Responses stream in real-time for a smooth user experience
- **Accessible Design**: Fixed floating button in the bottom-right corner of the dashboard

## Setup

### 1. Get an OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in to your account
3. Navigate to "API Keys" section
4. Click "Create new secret key"
5. Copy your API key

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Restart Development Server

After adding the environment variable, restart your development server:

```bash
pnpm dev
```

## Usage

1. Navigate to any page in the dashboard (Shelf, Communities, Settings, etc.)
2. Look for the sparkles icon (✨) in the bottom-right corner
3. Click the button to open the chat interface
4. Start asking questions or requesting book recommendations!

### Example Questions

- "Can you recommend some science fiction books similar to Dune?"
- "I'm interested in historical fiction set in World War II"
- "What are some good mystery novels for beginners?"
- "Tell me about Margaret Atwood's writing style"
- "I want to read more diverse authors. What do you suggest?"

## Technical Details

### Architecture

- **API Route**: `/app/api/chat/route.ts` - Edge function that handles chat requests
- **Component**: `/components/dashboard/librarian-chat.tsx` - React component with chat UI
- **Integration**: Mounted in `/app/dashboard/layout.tsx` - Available across all dashboard pages

### Technologies Used

- **Vercel AI SDK**: Core framework for AI interactions
- **OpenAI GPT-4 Turbo**: Language model for generating responses
- **Edge Runtime**: Fast, globally distributed API responses
- **Streaming**: Real-time response streaming for better UX

### Customization

You can customize the chatbot's behavior by modifying the system prompt in `/app/api/chat/route.ts`:

```typescript
const SYSTEM_PROMPT = `You are a knowledgeable and friendly librarian assistant...`;
```

You can also:

- Change the model (e.g., `gpt-3.5-turbo` for faster/cheaper responses)
- Adjust temperature for more/less creative responses
- Modify max tokens for longer/shorter responses

## Cost Considerations

Using the OpenAI API incurs costs based on token usage:

- **GPT-4 Turbo**: More expensive but more capable
- **GPT-3.5 Turbo**: More affordable alternative

Monitor your usage in the [OpenAI dashboard](https://platform.openai.com/usage).

## Troubleshooting

### Chat not working

1. Verify `OPENAI_API_KEY` is set in `.env.local`
2. Restart the development server
3. Check browser console for errors
4. Verify your OpenAI API key is valid and has credits

### API errors

- Check OpenAI API status at [status.openai.com](https://status.openai.com)
- Verify your API key hasn't exceeded rate limits
- Check if your OpenAI account has available credits

## Future Enhancements

Potential improvements for the chatbot:

- Integration with user's reading history from the shelf
- Book database integration for accurate recommendations
- Support for multiple languages
- Voice input/output capabilities
- Conversation history persistence
- RAG (Retrieval Augmented Generation) with book database
