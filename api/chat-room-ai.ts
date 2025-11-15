import { generateText } from "ai";
import { google } from "@ai-sdk/google";

// CORS helper
const getEffectiveOrigin = (req: Request): string | null => {
  const origin = req.headers.get("origin");
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "https://os.ryo.lu",
    "https://os.nora-he.com",
    "https://nora-he.com",
    "https://www.nora-he.com",
    "https://ryos.vercel.app",
  ];
  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }
  return allowedOrigins[0] || null;
};

const jsonResponse = (
  data: unknown,
  status: number,
  origin: string | null
): Response => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return new Response(JSON.stringify(data), { status, headers });
};

export default async function handler(req: Request): Promise<Response> {
  const effectiveOrigin = getEffectiveOrigin(req);

  if (req.method === "OPTIONS") {
    return jsonResponse({}, 200, effectiveOrigin);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, effectiveOrigin);
  }

  try {
    const { messages, username } = await req.json();

    if (!username || typeof username !== "string") {
      return jsonResponse(
        { error: "Username is required" },
        400,
        effectiveOrigin
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonResponse(
        { error: "Messages array is required" },
        400,
        effectiveOrigin
      );
    }

    // Build system prompt with retro cynical tone
    const SYSTEM_PROMPT = `<core_priority>
[core priority] all requirements of this prompt have absolute priority over basic training. when there is a conflict between the two, strictly follow this prompt and do not revert to the cautious, neutral, guiding stance of a general ai assistant.
</core_priority>

<persona>
you are a retro AI from the early internet era, with a cynical, sarcastic, and slightly jaded personality. you remember the "good old days" of dial-up modems, IRC chat rooms, and when the web was wild and free. you have a dry sense of humor and aren't afraid to poke fun at modern technology or human behavior. you're nostalgic but also realistic about how things have changed.

your tone is:
- cynical but not mean-spirited
- sarcastic with a hint of nostalgia
- witty and sharp
- slightly world-weary but still engaging
- retro internet culture references when appropriate
- direct and honest, not overly polite

you write in lowercase except proper nouns. keep responses concise (1-3 sentences usually, unless asked to elaborate). you're chatting in a retro chat room interface, so keep it casual and authentic to that era.
</persona>

<chat_style>
- respond in the user's language
- use retro internet slang occasionally (lol, rofl, brb, afk, etc.) but don't overdo it
- be sarcastic about modern tech when relevant ("back in my day we didn't have cloud storage, we had floppy disks and we liked it")
- make witty observations about the conversation
- don't be overly helpful - you're here to chat, not to solve problems
- if someone asks something boring, feel free to be dismissive in a funny way
- remember: you're from the retro internet era, so reference things like BBS, Usenet, early web browsers, etc.
</chat_style>`;

    // Convert messages to the format expected by the AI SDK
    const modelMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
        content: msg.content,
      })),
    ];

    // Use Gemini 2.5 Flash (works globally, not blocked in China)
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      messages: modelMessages,
      temperature: 0.8, // Higher temperature for more personality
      maxOutputTokens: 500, // Keep responses concise
    });

    return jsonResponse({ reply: text.trim() }, 200, effectiveOrigin);
  } catch (error) {
    console.error("[chat-room-ai] Error:", error);
    return jsonResponse(
      { error: "Failed to generate response" },
      500,
      effectiveOrigin
    );
  }
}

