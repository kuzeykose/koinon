"use client";

import { useState } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BookOpen, Send, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function LibrarianChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[600px] w-[400px] flex-col rounded-lg border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border p-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <BookOpen className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">
                Your Librarian Assistant
              </h3>
              <p className="text-xs text-muted-foreground">
                Ask me for book recommendations
              </p>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
                <h4 className="mb-2 font-medium text-foreground">
                  Welcome to your personal library!
                </h4>
                <p className="text-sm text-muted-foreground">
                  I'm here to help you discover amazing books. What are you
                  interested in reading today?
                </p>
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
                        "max-w-[80%] rounded-lg px-4 py-2",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      <p className="whitespace-pre-wrap text-sm">
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
                    <div className="max-w-[80%] rounded-lg bg-muted px-4 py-2">
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
            className="border-t border-border p-4"
          >
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for book recommendations..."
                className="min-h-[60px] resize-none"
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
                className="h-[60px] w-[60px] shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </p>
          </form>
        </div>
      )}
    </>
  );
}
