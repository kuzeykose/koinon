# AI Librarian Chatbot Component

## Component Structure

```
LibrarianChat
├── Toggle Button (Fixed position, bottom-right)
│   └── Sparkles icon (✨) or X icon when open
│
└── Chat Window (Appears when button is clicked)
    ├── Header
    │   ├── Avatar with Book icon
    │   ├── Title: "Your Librarian Assistant"
    │   └── Subtitle: "Ask me for book recommendations"
    │
    ├── Messages Area (Scrollable)
    │   ├── Welcome message (when no messages)
    │   ├── User messages (right-aligned, primary color)
    │   ├── Assistant messages (left-aligned, muted color)
    │   └── Loading indicator (3 pulsing dots)
    │
    └── Input Area
        ├── Textarea (resizable, multi-line support)
        ├── Send button
        └── Help text: "Press Enter to send"
```

## Usage in Code

The chatbot is automatically included in all dashboard pages through the layout:

```typescript
// app/dashboard/layout.tsx
import { LibrarianChat } from "@/components/dashboard/librarian-chat";

export default async function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userEmail={user.email} />
      <main>{children}</main>
      <LibrarianChat /> {/* ← Chatbot appears here */}
    </div>
  );
}
```

## Key Features

### 1. Fixed Positioning

```css
position: fixed
bottom: 24px (6 * 4px)
right: 24px (6 * 4px)
z-index: 50
```

### 2. Responsive Design

- Window size: 400px width × 600px height
- Automatically positions above the toggle button
- Scrollable message area
- Mobile-friendly (consider adding responsive breakpoints if needed)

### 3. Keyboard Shortcuts

- **Enter**: Send message
- **Shift + Enter**: New line in message

### 4. Message Types

**User Message:**

- Right-aligned
- Primary background color
- Shows user avatar

**Assistant Message:**

- Left-aligned
- Muted background color
- Shows book icon avatar
- Streams in real-time

**Loading State:**

- Three pulsing dots
- Shows while waiting for response

## Styling

All styling uses Tailwind CSS and respects the app's theme:

- **Light Mode**: Readable, clean interface
- **Dark Mode**: Comfortable for extended reading
- **Colors**: Uses design system tokens (primary, muted, foreground, etc.)

## State Management

```typescript
const [isOpen, setIsOpen] = useState(false); // Chat window visibility

const {
  messages, // Array of chat messages
  input, // Current input value
  handleInputChange, // Input change handler
  handleSubmit, // Form submission handler
  isLoading, // Loading state
} = useChat({ api: "/api/chat" });
```

## API Integration

The component communicates with `/app/api/chat/route.ts`:

1. User types message and presses Enter
2. `handleSubmit` sends message to API
3. API streams response in real-time
4. Component updates UI as response arrives
5. Message is added to conversation history

## Customization

### Change Position

```typescript
// Bottom-left instead of bottom-right
className = "fixed bottom-6 left-6 ...";
```

### Change Icon

```typescript
// Use a different icon
import { MessageCircle } from "lucide-react";
<MessageCircle className="h-6 w-6" />;
```

### Change Colors

```typescript
// User message color
className = "bg-secondary text-secondary-foreground";

// Assistant message color
className = "bg-accent text-accent-foreground";
```

### Change Window Size

```typescript
// Larger window
className = "h-[700px] w-[500px] ...";

// Full height on mobile
className = "h-[600px] w-[400px] md:h-screen md:w-full";
```

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- ARIA labels (consider adding for screen readers)
- Focus management when opening/closing
- Proper color contrast ratios

## Performance

- **Client-side only** (`"use client"`)
- Streaming responses for immediate feedback
- Minimal re-renders with proper state management
- Lazy loading (only renders when needed)

## Future Enhancements

Consider adding:

- [ ] Conversation history persistence (localStorage)
- [ ] Export chat transcript
- [ ] Clear conversation button
- [ ] Minimize/maximize animations
- [ ] Sound notifications
- [ ] Typing indicators
- [ ] Message reactions
- [ ] Code syntax highlighting for book quotes
- [ ] Image support for book covers
- [ ] Voice input/output
