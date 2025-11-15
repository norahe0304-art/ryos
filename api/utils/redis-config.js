/**
 * Redis configuration helper
 * Supports both naming conventions:
 * - REDIS_KV_REST_API_URL / REDIS_KV_REST_API_TOKEN (preferred)
 * - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (alternative)
 * 
 * Automatically trims whitespace and removes surrounding quotes if present.
 * Validates URL format and falls back to alternative if URL is invalid.
 */
export function getRedisConfig() {
  const rawUrl1 = process.env.REDIS_KV_REST_API_URL;
  const rawUrl2 = process.env.UPSTASH_REDIS_REST_URL;
  const rawToken1 = process.env.REDIS_KV_REST_API_TOKEN;
  const rawToken2 = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Helper to clean and validate URL
  const cleanAndValidateUrl = (rawUrl) => {
    if (!rawUrl) return null;
    const cleaned = rawUrl.trim().replace(/^["']|["']$/g, "").trim();
    // Validate URL format (must start with http:// or https://)
    if (cleaned && (cleaned.startsWith("http://") || cleaned.startsWith("https://"))) {
      return cleaned;
    }
    return null;
  };

  // Helper to clean token
  const cleanToken = (rawToken) => {
    if (!rawToken) return null;
    return rawToken.trim().replace(/^["']|["']$/g, "").trim();
  };

  // Try first set, validate URL format
  const url1 = cleanAndValidateUrl(rawUrl1);
  const token1 = cleanToken(rawToken1);

  // If first set has valid URL and token, use it
  if (url1 && token1) {
    return { url: url1, token: token1 };
  }

  // Fall back to second set
  const url2 = cleanAndValidateUrl(rawUrl2);
  const token2 = cleanToken(rawToken2);

  if (url2 && token2) {
    return { url: url2, token: token2 };
  }

  // If first set has URL but invalid format, but second set is valid, use second
  if (rawUrl1 && !url1 && url2 && token2) {
    return { url: url2, token: token2 };
  }

  // Return whatever we have (may be undefined)
  return { 
    url: url1 || url2 || undefined, 
    token: token1 || token2 || undefined 
  };
}

