import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "edge";

const SYSTEM_PROMPT = `You are a knowledgeable and friendly librarian assistant. Your role is to:

1. Recommend books based on users' interests, reading history, and preferences
2. Provide detailed information about books, authors, and literary genres
3. Help users discover new books and authors they might enjoy
4. Discuss books in a warm, engaging, and professional manner
5. Ask thoughtful questions to better understand what the user is looking for
6. Share interesting facts about literature, authors, and book history

Always be:
- Helpful and informative
- Warm and approachable
- Knowledgeable about various genres and authors
- Respectful of different tastes in literature
- Encouraging of reading and learning

When recommending books, try to:
- Consider the user's stated preferences
- Provide a brief explanation of why you're recommending each book
- Mention the genre, author, and key themes
- Suggest both popular and lesser-known titles when appropriate`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Convert UI messages to the format expected by streamText
    const convertedMessages = messages.map((msg: any) => ({
      role: msg.role,
      content:
        typeof msg.content === "string"
          ? msg.content
          : msg.parts?.map((part: any) => part.text).join("") || "",
    }));

    const result = streamText({
      model: openai("gpt-4-turbo-preview"),
      system: SYSTEM_PROMPT,
      messages: convertedMessages,
      temperature: 0.7,
      maxTokens: 1000,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
