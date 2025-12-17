# Quick Setup Guide for AI Librarian Chatbot

## Step-by-Step Setup

### 1. Install Dependencies (Already Done ✅)

The required packages have been installed:

- `ai` - Vercel AI SDK
- `@ai-sdk/openai` - OpenAI provider for Vercel AI SDK

### 2. Set Up Environment Variable

Create a `.env.local` file in the root directory of the project and add:

```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**To get your OpenAI API key:**

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key and paste it into your `.env.local` file

### 3. Start the Development Server

```bash
pnpm dev
```

### 4. Test the Chatbot

1. Navigate to http://localhost:3000
2. Log in to your account
3. Go to the Dashboard
4. Look for the sparkles icon (✨) in the bottom-right corner
5. Click to open the chatbot
6. Try asking: "Can you recommend a good science fiction book?"

## Files Created

```
app/
  └── api/
      └── chat/
          └── route.ts          # API endpoint for chat (Edge function)

components/
  └── dashboard/
      └── librarian-chat.tsx    # Chat UI component

app/
  └── dashboard/
      └── layout.tsx            # Updated to include chatbot
```

## Features

✨ **Floating Chat Button**: Always accessible from the dashboard
💬 **Streaming Responses**: Real-time response streaming for better UX
📚 **Librarian Personality**: Specialized in book recommendations
🎨 **Beautiful UI**: Matches your existing design system
🌙 **Dark Mode Support**: Works with your theme toggle

## Customization Options

### Change the AI Model

In `app/api/chat/route.ts`, you can change the model:

```typescript
model: openai('gpt-4-turbo-preview'),  // Current (most capable)
// or
model: openai('gpt-3.5-turbo'),        // Faster and cheaper
```

### Adjust Response Style

Modify the `SYSTEM_PROMPT` in `app/api/chat/route.ts` to change how the librarian behaves.

### Change Temperature

```typescript
temperature: 0.7,  // 0.0 = very focused, 1.0 = very creative
```

## Troubleshooting

### "Module not found" errors in IDE

- Restart your IDE/TypeScript server
- These are transient and will resolve when the dev server starts

### Chat not responding

- Check that `OPENAI_API_KEY` is set in `.env.local`
- Restart the development server
- Check the browser console for errors

### API Rate Limits

- OpenAI has rate limits based on your account tier
- Check usage at https://platform.openai.com/usage
- Consider using `gpt-3.5-turbo` for development

## Cost Estimates

Approximate costs per 1000 requests (with typical book recommendation conversations):

- GPT-4 Turbo: ~$0.30-0.60
- GPT-3.5 Turbo: ~$0.03-0.06

Monitor your usage in the OpenAI dashboard to avoid surprises!

## Next Steps

Consider enhancing the chatbot with:

- [ ] Integration with user's reading history
- [ ] Book database for accurate ISBN/metadata
- [ ] Conversation history persistence
- [ ] Multi-language support
- [ ] Voice input/output

Enjoy your new AI librarian! 📚✨
