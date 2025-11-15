import { Redis } from "@upstash/redis";
import { getRedisConfig } from "./utils/redis-config.js";

// Vercel Function configuration
// Using Node.js runtime instead of Edge to ensure environment variables are accessible
export const runtime = "nodejs";
export const maxDuration = 60; // Increased to 60 seconds (max for Hobby plan) to allow for slow Redis operations
export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

// CORS helper - standard Request object
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

// Initialize Redis lazily (environment variables may not be available at module level in Edge Runtime)
// Cache the instance to avoid re-initialization on each request
let redisInstance: Redis | null = null;

function getRedis(): Redis {
  if (!redisInstance) {
    // Use getRedisConfig() helper to ensure consistent environment variable handling
    // This supports both REDIS_KV_REST_API_* and UPSTASH_REDIS_REST_* naming conventions
    const config = getRedisConfig();
    
    // Fallback values if environment variables are not available
    const FALLBACK_REDIS_URL = "https://together-mite-31896.upstash.io";
    const FALLBACK_REDIS_TOKEN = "AXyYAAIncDJhNGZlOGZlNDQ3ZWI0YjIwYmRlMzk3YzY3MDg4MWM1NnAyMzE4OTY";
    
    const redisUrl = config.url || FALLBACK_REDIS_URL;
    const redisToken = config.token || FALLBACK_REDIS_TOKEN;
    
    console.log(`[message-in-bottle] Initializing Redis with URL: ${redisUrl.substring(0, 30)}...`);
    
    redisInstance = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  }
  return redisInstance;
}

export default async function handler(req: Request): Promise<Response> {
  // Wrap everything in try-catch to ensure we always return a valid JSON response
  let effectiveOrigin: string | null = null;
  try {
    // Standard Vercel handler - only accepts Request
    const method = req.method;
    effectiveOrigin = getEffectiveOrigin(req);

    if (method === "OPTIONS") {
      return jsonResponse({}, 200, effectiveOrigin);
    }

    // Get Redis client (lazy initialization)
    let redis: Redis;
    try {
      redis = getRedis();
    } catch (error) {
      console.error("[message-in-bottle] Failed to initialize Redis:", error);
      const isDevelopment = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "development";
      const errorMessage = isDevelopment
        ? "Redis is not configured. Please ensure:\n1. You're using 'vercel dev' (not 'vite dev')\n2. .env file exists in project root\n3. REDIS_KV_REST_API_URL and REDIS_KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN) are set in .env"
        : "Redis is not configured. Please check:\n1. Vercel Dashboard → Settings → Environment Variables\n2. Ensure REDIS_KV_REST_API_URL and REDIS_KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN) are set for Production, Preview, and Development\n3. Redeploy after adding environment variables";
      
      return jsonResponse(
        {
          error: "Server configuration error",
          message: errorMessage,
        },
        500,
        effectiveOrigin
      );
    }

    try {
    // Throw a bottle (POST)
    if (method === "POST") {
      let body;
      try {
        // Standard Request.json() method
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
        // Optimize: Push immediately without timeout protection
        // Upstash REST API can be slow, but we need to wait for it to complete
        const bottleJson = JSON.stringify(bottle);
        const startTime = Date.now();
        
        // Push to Redis (this is the critical operation)
        await redis.lpush(BOTTLES_KEY, bottleJson);
        
        const pushTime = Date.now() - startTime;
        console.log(`[message-in-bottle] Redis lpush completed in ${pushTime}ms`);
        
        // Trim asynchronously without waiting (fire and forget for better performance)
        // Don't await this - let it run in background
        redis.ltrim(BOTTLES_KEY, 0, MAX_BOTTLES - 1).catch(err => {
          console.error("[message-in-bottle] Background trim failed:", err);
        });

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
    if (method === "GET") {
      const getStartTime = Date.now();
      try {
        // Get total count with timeout protection
        const countStartTime = Date.now();
        const count = await redis.llen(BOTTLES_KEY);
        const countTime = Date.now() - countStartTime;
        console.log(`[message-in-bottle] Redis llen completed in ${countTime}ms, count: ${count}`);

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

        // Get random bottle with timeout protection
        const randomIndex = Math.floor(Math.random() * count);
        const lindexStartTime = Date.now();
        const bottleData = await redis.lindex(BOTTLES_KEY, randomIndex);
        const lindexTime = Date.now() - lindexStartTime;
        console.log(`[message-in-bottle] Redis lindex completed in ${lindexTime}ms, index: ${randomIndex}`);

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

        const totalGetTime = Date.now() - getStartTime;
        console.log(`[message-in-bottle] Bottle picked up: ${bottle.id}, total time: ${totalGetTime}ms`);

        // Return response immediately
        const response = jsonResponse(
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
        
        console.log(`[message-in-bottle] Response created, returning...`);
        return response;
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

    // Method not allowed
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
    } catch (outerError) {
      // Top-level error handler - ensure we always return valid JSON
      console.error("[message-in-bottle] Top-level error:", outerError);
      const fallbackOrigin = effectiveOrigin || "https://os.nora-he.com";
      return jsonResponse(
        {
          error: "Internal server error",
          message: outerError instanceof Error ? outerError.message : "An unexpected error occurred",
        },
        500,
        fallbackOrigin
      );
    }
  }
}

