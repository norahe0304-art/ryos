import { sendPusherBeamsNotification } from "./utils/pusherBeams.js";

// Vercel Function configuration
export const runtime = "nodejs";
export const maxDuration = 30;
export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

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
  let effectiveOrigin: string | null = null;
  
  try {
    console.log("[pusher-beams] ===== Handler called =====");
    console.log("[pusher-beams] Method:", req.method);
    console.log("[pusher-beams] URL:", req.url);
    
    // Check if environment variable is available
    const secretKey = process.env.PUSHER_BEAMS_SECRET_KEY;
    console.log("[pusher-beams] Checking environment variable...");
    console.log("[pusher-beams] PUSHER_BEAMS_SECRET_KEY exists:", !!secretKey);
    console.log("[pusher-beams] PUSHER_BEAMS_SECRET_KEY length:", secretKey?.length || 0);
    console.log("[pusher-beams] All PUSHER env vars:", Object.keys(process.env).filter(k => k.includes('PUSHER')));
    
    if (!secretKey) {
      console.error("[pusher-beams] ERROR: PUSHER_BEAMS_SECRET_KEY is not set!");
      return jsonResponse(
        {
          error: "Configuration error",
          message: "PUSHER_BEAMS_SECRET_KEY environment variable is not set",
          debug: {
            availablePusherVars: Object.keys(process.env).filter(k => k.includes('PUSHER')),
          },
        },
        500,
        null
      );
    }
    
    const method = req.method;
    effectiveOrigin = getEffectiveOrigin(req);
    console.log("[pusher-beams] Effective origin:", effectiveOrigin);

    if (method === "OPTIONS") {
      return jsonResponse({}, 200, effectiveOrigin);
    }

    if (method !== "POST") {
      return jsonResponse(
        { error: "Method not allowed", message: "Only POST method is supported" },
        405,
        effectiveOrigin
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("[pusher-beams] Failed to parse request body:", parseError);
      return jsonResponse(
        { error: "Invalid request body", message: "Request body must be valid JSON" },
        400,
        effectiveOrigin
      );
    }

    const { interests, title, body: notificationBody, icon, deepLink } = body;

    // Validate required fields
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      return jsonResponse(
        { error: "Invalid interests", message: "interests must be a non-empty array" },
        400,
        effectiveOrigin
      );
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return jsonResponse(
        { error: "Invalid title", message: "title is required and must be a non-empty string" },
        400,
        effectiveOrigin
      );
    }

    if (!notificationBody || typeof notificationBody !== "string" || notificationBody.trim().length === 0) {
      return jsonResponse(
        { error: "Invalid body", message: "body is required and must be a non-empty string" },
        400,
        effectiveOrigin
      );
    }

    // Send notification
    try {
      console.log("[pusher-beams] About to call sendPusherBeamsNotification");
      console.log("[pusher-beams] Parameters:", {
        interests,
        title: title.trim(),
        body: notificationBody.trim(),
        icon,
        deepLink,
      });
      
      const result = await sendPusherBeamsNotification({
        interests,
        title: title.trim(),
        body: notificationBody.trim(),
        icon,
        deepLink,
      });
      
      console.log("[pusher-beams] Notification sent successfully:", result);

      return jsonResponse(
        {
          success: true,
          publishId: result.publishId,
        },
        200,
        effectiveOrigin
      );
    } catch (error) {
      console.error("[pusher-beams] Failed to send notification:", error);
      console.error("[pusher-beams] Error type:", error instanceof Error ? error.constructor.name : typeof error);
      console.error("[pusher-beams] Error message:", error instanceof Error ? error.message : String(error));
      console.error("[pusher-beams] Error stack:", error instanceof Error ? error.stack : "No stack trace");
      
      // Check if it's a configuration error
      if (error instanceof Error && error.message.includes("Pusher Beams 配置缺失")) {
        return jsonResponse(
          {
            error: "Server configuration error",
            message: "Pusher Beams is not configured. Please set PUSHER_BEAMS_SECRET_KEY environment variable.",
          },
          500,
          effectiveOrigin
        );
      }

      return jsonResponse(
        {
          error: "Failed to send notification",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          details: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 5).join('\n'),
          } : String(error),
        },
        500,
        effectiveOrigin
      );
    }
  } catch (error) {
    console.error("[pusher-beams] Unexpected error:", error);
    return jsonResponse(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      500,
      effectiveOrigin || "https://os.nora-he.com"
    );
  }
}

