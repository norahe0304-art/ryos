import { getEffectiveOrigin, isAllowedOrigin, preflightIfNeeded } from "./utils/cors.js";

// Use Node.js runtime to access Chrome MCP tools if available
export const config = {
  runtime: "nodejs",
};

interface FetchSongInfoChromeRequest {
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

    const { url } = (await req.json()) as FetchSongInfoChromeRequest;

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "No URL provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Try to use Chrome MCP tools to fetch page content
    // Chrome MCP tools would be available through MCP server connection
    // Note: This requires Chrome MCP server to be running and accessible
    
    try {
      // Extract video ID for YouTube URLs
      const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;
      
      if (!videoId) {
        return new Response(
          JSON.stringify({ error: "Invalid YouTube URL" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": effectiveOrigin!,
            },
          }
        );
      }

      // Note: Chrome MCP tools are typically available through MCP server
      // In a Cursor/Composer environment, these tools might be accessible
      // For now, we'll use oEmbed as a fallback and return that data
      // In a full implementation, you would:
      // 1. Use mcp_chrome-devtools_new_page to create a new page
      // 2. Use mcp_chrome-devtools_navigate_page to navigate to the URL
      // 3. Wait for page to load
      // 4. Use mcp_chrome-devtools_take_snapshot to get page content
      // 5. Extract title from <title> tag or h1 element
      // 6. Extract artist from channel name or metadata
      // 7. Use mcp_chrome-devtools_close_page to clean up
      
      // Fallback to oEmbed for now
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const oembedResponse = await fetch(oembedUrl);
      
      if (oembedResponse.ok) {
        const oembedData = await oembedResponse.json();
        return new Response(
          JSON.stringify({
            title: oembedData.title,
            artist: oembedData.author_name,
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": effectiveOrigin!,
            },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to fetch video info" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": effectiveOrigin!,
          },
        }
      );
    } catch (error) {
      console.error("Error fetching song info with Chrome MCP:", error);
      return new Response(
        JSON.stringify({ 
          error: "Chrome MCP fetch failed",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": effectiveOrigin!,
          },
        }
      );
    }
  } catch (error: unknown) {
    console.error("Error in fetch-song-info-chrome:", error);
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

