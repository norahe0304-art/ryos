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

  // Wrap everything in try-catch to ensure we always return a valid response
  try {
    if (req.method === "OPTIONS") {
      return jsonResponse({}, 200, effectiveOrigin);
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, effectiveOrigin);
    }

    // Check if API key is configured
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      console.error("[chat-room-ai] GOOGLE_GENERATIVE_AI_API_KEY is not configured");
      console.error("[chat-room-ai] Available env vars:", Object.keys(process.env).filter(k => k.includes('GOOGLE')));
      return jsonResponse(
        { 
          error: "API key not configured",
          message: "GOOGLE_GENERATIVE_AI_API_KEY environment variable is missing or empty. Please configure it in your Vercel project settings."
        },
        500,
        effectiveOrigin
      );
    }
    
    // Log API key status (first 10 chars only for security)
    console.log(`[chat-room-ai] API key found: ${apiKey.substring(0, 10)}... (length: ${apiKey.length})`);

    try {
      // Parse request body with error handling
      let body;
      try {
        body = await req.json();
      } catch (parseError) {
        console.error("[chat-room-ai] Failed to parse request body:", parseError);
        return jsonResponse(
          { 
            error: "Invalid request body",
            message: "Request body must be valid JSON"
          },
          400,
          effectiveOrigin
        );
      }
      
      const { messages, username } = body;

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
      // @ai-sdk/google automatically reads from GOOGLE_GENERATIVE_AI_API_KEY env var
      console.log("[chat-room-ai] Attempting to generate text with Gemini...");
      console.log("[chat-room-ai] Message count:", modelMessages.length);
      
      const { text } = await generateText({
        model: google("gemini-2.5-flash"),
        messages: modelMessages,
        temperature: 0.8, // Higher temperature for more personality
        maxOutputTokens: 500, // Keep responses concise
      });
      
      console.log("[chat-room-ai] Successfully generated response, length:", text.length);

      return jsonResponse({ reply: text.trim() }, 200, effectiveOrigin);
    } catch (error) {
    console.error("[chat-room-ai] Error details:", error);
    
    // Log full error for debugging
    if (error instanceof Error) {
      console.error("[chat-room-ai] Error name:", error.name);
      console.error("[chat-room-ai] Error message:", error.message);
      console.error("[chat-room-ai] Error stack:", error.stack);
    }
    
    // Provide more specific error messages
    let errorMessage = "Failed to generate response";
    let errorCode = "unknown_error";
    
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      
      // Check for common API key errors
      if (errorMsg.includes("api key") || errorMsg.includes("authentication") || errorMsg.includes("unauthorized")) {
        errorMessage = "Invalid or missing API key. Please check your GOOGLE_GENERATIVE_AI_API_KEY configuration in Vercel.";
        errorCode = "api_key_error";
      } else if (errorMsg.includes("quota") || errorMsg.includes("limit") || errorMsg.includes("rate limit")) {
        errorMessage = "API quota exceeded. Please check your Google Cloud billing and quota limits.";
        errorCode = "quota_exceeded";
      } else if (errorMsg.includes("permission") || errorMsg.includes("forbidden")) {
        errorMessage = "API key does not have required permissions. Please check your Google Cloud API key settings.";
        errorCode = "permission_denied";
      } else if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
        errorMessage = "Network error connecting to Google AI. Please try again later.";
        errorCode = "network_error";
      } else {
        errorMessage = `Error: ${error.message}`;
        errorCode = "generation_error";
      }
    }
    
    return jsonResponse(
      { 
        error: "Failed to generate response",
        errorCode,
        message: errorMessage,
        // Include error details in development for debugging
        ...(process.env.NODE_ENV === "development" ? { 
          details: error instanceof Error ? error.message : String(error) 
        } : {})
      },
      500,
      effectiveOrigin
    );
    } catch (innerError) {
      // This catches errors from the inner try block
      console.error("[chat-room-ai] Inner error:", innerError);
      return jsonResponse(
        {
          error: "Failed to generate response",
          errorCode: "inner_error",
          message: innerError instanceof Error ? innerError.message : "Unknown error occurred"
        },
        500,
        effectiveOrigin
      );
    }
  } catch (outerError) {
    // This catches any errors from the outer handler (e.g., JSON parsing, etc.)
    console.error("[chat-room-ai] Outer handler error:", outerError);
    
    // Try to get a valid origin even if there was an error
    let fallbackOrigin: string | null = null;
    try {
      fallbackOrigin = getEffectiveOrigin(req);
    } catch {
      fallbackOrigin = "*";
    }
    
    return jsonResponse(
      {
        error: "Internal server error",
        errorCode: "handler_error",
        message: outerError instanceof Error ? outerError.message : "An unexpected error occurred",
        ...(process.env.NODE_ENV === "development" ? {
          details: outerError instanceof Error ? outerError.stack : String(outerError)
        } : {})
      },
      500,
      fallbackOrigin
    );
  }
}

