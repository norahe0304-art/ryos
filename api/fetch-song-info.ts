import { getEffectiveOrigin, isAllowedOrigin, preflightIfNeeded } from "./utils/cors.js";

export const config = {
  runtime: "edge",
};

interface FetchSongInfoRequest {
  url: string;
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    const effectiveOrigin = getEffectiveOrigin(req);
    const resp = preflightIfNeeded(req, ["POST", "OPTIONS"], effectiveOrigin);
    if (resp) return resp;
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const effectiveOrigin = getEffectiveOrigin(req);
    if (!isAllowedOrigin(effectiveOrigin)) {
      return new Response("Unauthorized", { status: 403 });
    }

    const { url } = (await req.json()) as FetchSongInfoRequest;

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "No URL provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract video ID from YouTube URL
    const extractVideoId = (input: string): string | null => {
      if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
        return input;
      }

      try {
        const urlObj = new URL(input);
        
        if (urlObj.hostname.includes("youtube.com") || urlObj.hostname.includes("youtu.be")) {
          const vParam = urlObj.searchParams.get("v");
          if (vParam) return vParam;
          
          if (urlObj.hostname === "youtu.be") {
            return urlObj.pathname.slice(1) || null;
          }
          
          const pathMatch = urlObj.pathname.match(/\/(?:embed\/|v\/)?([a-zA-Z0-9_-]{11})/);
          if (pathMatch) return pathMatch[1];
        }
        
        return null;
      } catch {
        return /^[a-zA-Z0-9_-]{11}$/.test(input) ? input : null;
      }
    };

    const videoId = extractVideoId(url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Use oEmbed as fallback
    let title = `Video ID: ${videoId}`;
    let artist: string | undefined = undefined;

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`;
      const oembedResponse = await fetch(oembedUrl);

      if (oembedResponse.ok) {
        const oembedData = await oembedResponse.json();
        title = oembedData.title || title;
        artist = oembedData.author_name;
      }
    } catch (error) {
      console.error("Error fetching oEmbed data:", error);
    }

    // Note: Chrome MCP tools are not directly available in edge runtime
    // This endpoint provides the oEmbed data as a fallback
    // The actual Chrome MCP integration would need to be done client-side
    // or through a different server environment that supports MCP

    return new Response(
      JSON.stringify({
        videoId,
        url: youtubeUrl,
        title,
        artist,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": effectiveOrigin!,
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error fetching song info:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

