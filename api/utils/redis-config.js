/**
 * Redis configuration helper
 * Supports both naming conventions:
 * - REDIS_KV_REST_API_URL / REDIS_KV_REST_API_TOKEN (preferred)
 * - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (alternative)
 * 
 * Automatically trims whitespace and removes surrounding quotes if present.
 */
export function getRedisConfig() {
  const rawUrl =
    process.env.REDIS_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const rawToken =
    process.env.REDIS_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  // Trim whitespace and remove surrounding quotes if present
  const url = rawUrl
    ? rawUrl.trim().replace(/^["']|["']$/g, "").trim()
    : undefined;
  const token = rawToken
    ? rawToken.trim().replace(/^["']|["']$/g, "").trim()
    : undefined;

  return { url, token };
}

