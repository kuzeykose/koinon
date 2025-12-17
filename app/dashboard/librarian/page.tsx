"use client";

import { useState } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BookOpen, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function LibrarianPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-lg border border-border bg-card shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border p-6">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <BookOpen className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">
            Your Librarian Assistant
          </h1>
          <p className="text-sm text-muted-foreground">
            Ask me for book recommendations and reading advice
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <BookOpen className="mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 text-lg font-medium text-foreground">
              Welcome to your personal library!
            </h2>
            <p className="text-muted-foreground max-w-md">
              I'm here to help you discover amazing books. What are you
              interested in reading today?
            </p>
            <div className="mt-8 grid gap-2 text-left">
              <p className="text-sm text-muted-foreground">Try asking me:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• "Recommend me a science fiction book"</li>
                <li>• "What's a good book for learning Python?"</li>
                <li>• "Suggest something similar to 1984"</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message: UIMessage) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <BookOpen className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg px-4 py-3",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.parts
                      ?.map((part: any) =>
                        part.type === "text" ? part.text : ""
                      )
                      .join("")}
                  </p>
                </div>
                {message.role === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      U
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {status === "streaming" && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <BookOpen className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-[70%] rounded-lg bg-muted px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-foreground"></div>
                    <div
                      className="h-2 w-2 animate-pulse rounded-full bg-foreground"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="h-2 w-2 animate-pulse rounded-full bg-foreground"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!input.trim() || status === "streaming") return;

          try {
            await sendMessage({ text: input });
            setInput("");
          } catch (error) {
            console.error("Failed to send message:", error);
          }
        }}
        className="border-t border-border p-6"
      >
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for book recommendations..."
            className="min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || status === "streaming"}
            className="h-[80px] w-[80px] shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
