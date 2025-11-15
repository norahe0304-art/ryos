/**
 * Redis configuration helper
 * Supports both naming conventions:
 * - REDIS_KV_REST_API_URL / REDIS_KV_REST_API_TOKEN (preferred)
 * - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (alternative)
 */
export function getRedisConfig() {
  const url =
    process.env.REDIS_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.REDIS_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  return { url, token };
}

