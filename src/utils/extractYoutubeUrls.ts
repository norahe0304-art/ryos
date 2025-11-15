/**
 * Extract YouTube URLs from chat messages
 * Supports various YouTube URL formats
 */
export function extractYoutubeUrls(messages: Array<{ content?: string; text?: string; parts?: Array<{ text?: string }> }>): string[] {
  const urls: string[] = [];
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
  
  for (const message of messages) {
    let text = '';
    
    // Handle different message formats
    if (typeof message.content === 'string') {
      text = message.content;
    } else if (typeof message.text === 'string') {
      text = message.text;
    } else if (Array.isArray(message.parts)) {
      text = message.parts
        .map(part => part.text || '')
        .join(' ');
    }
    
    // Extract YouTube URLs
    const matches = text.matchAll(urlPattern);
    for (const match of matches) {
      const videoId = match[1];
      if (videoId && !urls.includes(videoId)) {
        urls.push(`https://www.youtube.com/watch?v=${videoId}`);
      }
    }
    
    // Also check for full URLs
    const fullUrlPattern = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
    const fullMatches = text.matchAll(fullUrlPattern);
    for (const match of fullMatches) {
      const url = match[0];
      if (url && !urls.includes(url)) {
        urls.push(url);
      }
    }
  }
  
  return urls;
}

