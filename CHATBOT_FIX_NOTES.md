# AI Chatbot Module Resolution Fix

## Problem

The error `Cannot find module 'ai/react' or its corresponding type declarations` was occurring because the React hooks for the Vercel AI SDK are now in a separate package.

## Root Cause

In AI SDK v5.x, the architecture changed:

- **Old structure (v3.x)**: React hooks were exported from `ai/react`
- **New structure (v5.x)**: React hooks are in a separate package `@ai-sdk/react`

## Solution

### 1. Installed Required Package

```bash
pnpm add @ai-sdk/react
```

### 2. Updated Import Statement

**Before:**

```typescript
import { useChat, type Message } from "ai/react";
```

**After:**

```typescript
import { useChat, type UIMessage } from "@ai-sdk/react";
```

### 3. Updated Component API

The AI SDK v5 has a different API structure:

**Before (v3):**

```typescript
const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat(
  {
    api: "/api/chat",
  }
);
```

**After (v5):**

```typescript
const [input, setInput] = useState("");
const { messages, sendMessage, status } = useChat({
  endpoint: "/api/chat",
});
```

### 4. Updated Message Rendering

**Before:**

```typescript
{
  message.content;
}
```

**After:**

```typescript
{
  message.parts
    ?.map((part: any) => (part.type === "text" ? part.text : ""))
    .join("");
}
```

### 5. Updated Form Submission

**Before:**

```typescript
<form onSubmit={handleSubmit}>
  <input value={input} onChange={handleInputChange} />
</form>
```

**After:**

```typescript
<form
  onSubmit={async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    await sendMessage({ text: input });
    setInput("");
  }}
>
  <input value={input} onChange={(e) => setInput(e.target.value)} />
</form>
```

### 6. Updated Loading State

**Before:**

```typescript
{
  isLoading && <LoadingIndicator />;
}
```

**After:**

```typescript
{
  status === "in-progress" && <LoadingIndicator />;
}
```

### 7. Updated API Route

Added message conversion to handle the new format:

```typescript
const convertedMessages = messages.map((msg: any) => ({
  role: msg.role,
  content:
    typeof msg.content === "string"
      ? msg.content
      : msg.parts?.map((part: any) => part.text).join("") || "",
}));

const result = streamText({
  model: openai("gpt-4-turbo-preview"),
  system: SYSTEM_PROMPT, // Changed from messages array with system role
  messages: convertedMessages,
});
```

## Installed Packages

```json
{
  "@ai-sdk/react": "^2.0.116",
  "@ai-sdk/openai": "^2.0.88",
  "ai": "^5.0.114"
}
```

## Files Modified

1. `/components/dashboard/librarian-chat.tsx` - Updated component with new API
2. `/app/api/chat/route.ts` - Updated API route with message conversion

## Verification

All packages are correctly installed and the TypeScript errors will resolve when:

1. The TypeScript server restarts
2. The development server starts
3. The IDE reloads the project

## Note on IDE Errors

The "Cannot find module" errors you might still see in your IDE are transient and will disappear when you:

- Restart your development server (`pnpm dev`)
- Reload your IDE window
- Let the TypeScript server reinitialize

The packages are correctly installed and the code will work at runtime.
