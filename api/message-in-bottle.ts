import { Redis } from "@upstash/redis";
import { getRedisConfig } from "./utils/redis-config.js";

// Vercel Edge Function configuration
export const runtime = "edge";
export const edge = true;
export const maxDuration = 60;
export const config = {
  runtime: "edge",
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
    headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return new Response(JSON.stringify(data), { status, headers });
};

// Redis key for storing all bottles
const BOTTLES_KEY = "message-in-bottle:all";
const MAX_BOTTLES = 10000; // Maximum number of bottles to keep

interface Bottle {
  id: string;
  message: string;
  timestamp: number;
}

export default async function handler(req: Request): Promise<Response> {
  const effectiveOrigin = getEffectiveOrigin(req);

  if (req.method === "OPTIONS") {
    return jsonResponse({}, 200, effectiveOrigin);
  }

  // Check Redis environment variables (supports both naming conventions)
  const { url: redisUrl, token: redisToken } = getRedisConfig();

  if (!redisUrl || !redisToken) {
    console.error("[message-in-bottle] Redis credentials not configured");
    console.error("[message-in-bottle] REDIS_KV_REST_API_URL:", process.env.REDIS_KV_REST_API_URL ? "exists" : "missing");
    console.error("[message-in-bottle] REDIS_KV_REST_API_TOKEN:", process.env.REDIS_KV_REST_API_TOKEN ? "exists" : "missing");
    console.error("[message-in-bottle] UPSTASH_REDIS_REST_URL:", process.env.UPSTASH_REDIS_REST_URL ? "exists" : "missing");
    console.error("[message-in-bottle] UPSTASH_REDIS_REST_TOKEN:", process.env.UPSTASH_REDIS_REST_TOKEN ? "exists" : "missing");
    console.error("[message-in-bottle] Available env vars with REDIS:", Object.keys(process.env).filter(k => k.includes('REDIS')));
    console.error("[message-in-bottle] Available env vars with UPSTASH:", Object.keys(process.env).filter(k => k.includes('UPSTASH')));
    
    // Different messages for development vs production
    const isDevelopment = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "development";
    const errorMessage = isDevelopment
      ? "Redis is not configured. Please ensure:\n1. You're using 'vercel dev' (not 'vite dev')\n2. .env file exists in project root\n3. REDIS_KV_REST_API_URL and REDIS_KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN) are set in .env"
      : "Redis is not configured. Please add REDIS_KV_REST_API_URL and REDIS_KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN) in Vercel Dashboard → Settings → Environment Variables";
    
    return jsonResponse(
      {
        error: "Server configuration error",
        message: errorMessage,
      },
      500,
      effectiveOrigin
    );
  }

  // Initialize Redis
  const redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });

  try {
    // Throw a bottle (POST)
    if (req.method === "POST") {
      let body;
      try {
        body = await req.json();
      } catch (parseError) {
        console.error("[message-in-bottle] Failed to parse request body:", parseError);
        return jsonResponse(
          { error: "Invalid request body", message: "Request body must be valid JSON" },
          400,
          effectiveOrigin
        );
      }

      const { message } = body;

      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return jsonResponse(
          { error: "Message is required and cannot be empty" },
          400,
          effectiveOrigin
        );
      }

      if (message.length > 1000) {
        return jsonResponse(
          { error: "Message is too long (max 1000 characters)" },
          400,
          effectiveOrigin
        );
      }

      // Create bottle
      const bottle: Bottle = {
        id: `bottle-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        message: message.trim(),
        timestamp: Date.now(),
      };

      try {
        // Add to Redis list
        await redis.lpush(BOTTLES_KEY, JSON.stringify(bottle));

        // Trim list to keep only MAX_BOTTLES
        await redis.ltrim(BOTTLES_KEY, 0, MAX_BOTTLES - 1);

        console.log(`[message-in-bottle] Bottle thrown: ${bottle.id}`);

        return jsonResponse(
          {
            success: true,
            bottle: {
              id: bottle.id,
              timestamp: bottle.timestamp,
            },
          },
          200,
          effectiveOrigin
        );
      } catch (redisError) {
        console.error("[message-in-bottle] Redis error when throwing bottle:", redisError);
        return jsonResponse(
          {
            error: "Failed to save bottle",
            message: redisError instanceof Error ? redisError.message : "Database error occurred",
          },
          500,
          effectiveOrigin
        );
      }
    }

    // Pick up a bottle (GET)
    if (req.method === "GET") {
      try {
        // Get total count
        const count = await redis.llen(BOTTLES_KEY);

        if (count === 0) {
          return jsonResponse(
            {
              error: "No bottles in the sea",
              message: "The sea is empty. Be the first to throw a bottle!",
            },
            404,
            effectiveOrigin
          );
        }

        // Get random bottle
        const randomIndex = Math.floor(Math.random() * count);
        const bottleData = await redis.lindex(BOTTLES_KEY, randomIndex);

        if (!bottleData) {
          console.error(`[message-in-bottle] Failed to retrieve bottle at index ${randomIndex}`);
          return jsonResponse(
            { error: "Failed to retrieve bottle", message: "Could not fetch bottle from database" },
            500,
            effectiveOrigin
          );
        }

        let bottle: Bottle;
        try {
          // Handle different return types from Redis
          let parsedData: unknown;
          
          if (typeof bottleData === "string") {
            try {
              parsedData = JSON.parse(bottleData);
              // If it's still a string after parsing, it might be double-encoded
              if (typeof parsedData === "string") {
                parsedData = JSON.parse(parsedData as string);
              }
            } catch (e) {
              // If parsing fails, try to use the string directly as a fallback
              throw new Error(`Failed to parse bottle JSON string: ${e instanceof Error ? e.message : String(e)}`);
            }
          } else if (typeof bottleData === "object" && bottleData !== null) {
            // Already parsed object
            parsedData = bottleData;
          } else {
            throw new Error(`Unexpected bottle data type: ${typeof bottleData}`);
          }

          // Cast and validate bottle structure
          bottle = parsedData as Bottle;
          
          if (!bottle || typeof bottle !== "object") {
            throw new Error("Bottle data is not an object");
          }
          
          if (!bottle.id || typeof bottle.id !== "string") {
            throw new Error("Bottle missing or invalid id");
          }
          
          if (!bottle.message || typeof bottle.message !== "string") {
            throw new Error("Bottle missing or invalid message");
          }
          
          if (typeof bottle.timestamp !== "number") {
            throw new Error("Bottle missing or invalid timestamp");
          }
        } catch (parseError) {
          console.error("[message-in-bottle] Failed to parse bottle:", parseError);
          console.error("[message-in-bottle] Bottle data type:", typeof bottleData);
          console.error("[message-in-bottle] Bottle data (first 200 chars):", 
            typeof bottleData === "string" ? bottleData.substring(0, 200) : String(bottleData).substring(0, 200));
          return jsonResponse(
            { error: "Failed to parse bottle", message: "Bottle data is corrupted" },
            500,
            effectiveOrigin
          );
        }

        console.log(`[message-in-bottle] Bottle picked up: ${bottle.id}`);

        return jsonResponse(
          {
            success: true,
            bottle: {
              id: bottle.id,
              message: bottle.message,
              timestamp: bottle.timestamp,
            },
          },
          200,
          effectiveOrigin
        );
      } catch (redisError) {
        console.error("[message-in-bottle] Redis error when picking bottle:", redisError);
        return jsonResponse(
          {
            error: "Failed to retrieve bottle",
            message: redisError instanceof Error ? redisError.message : "Database error occurred",
          },
          500,
          effectiveOrigin
        );
      }
    }

    return jsonResponse({ error: "Method not allowed" }, 405, effectiveOrigin);
  } catch (error) {
    console.error("[message-in-bottle] Unexpected error:", error);
    if (error instanceof Error) {
      console.error("[message-in-bottle] Error name:", error.name);
      console.error("[message-in-bottle] Error message:", error.message);
      console.error("[message-in-bottle] Error stack:", error.stack);
    }
    return jsonResponse(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        ...(process.env.NODE_ENV === "development" ? {
          details: error instanceof Error ? error.stack : String(error)
        } : {})
      },
      500,
      effectiveOrigin
    );
  }
}

