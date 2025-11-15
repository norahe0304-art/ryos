import { extractYoutubeUrls } from './extractYoutubeUrls';
import { useChatsStore } from '@/stores/useChatsStore';
import { useIpodStore } from '@/stores/useIpodStore';
import type { AIChatMessage } from '@/types/chat';

/**
 * Extract YouTube URLs from chat messages and add them to iPod
 * @returns Array of added track titles
 */
export async function addSongsFromChatHistory(): Promise<Array<{ title: string; artist?: string }>> {
  const { aiMessages } = useChatsStore.getState();
  const urls = extractYoutubeUrls(aiMessages);
  
  if (urls.length === 0) {
    return [];
  }
  
  const addedTracks: Array<{ title: string; artist?: string }> = [];
  const existingTracks = useIpodStore.getState().tracks;
  const existingIds = new Set(existingTracks.map(t => t.id));
  
  for (const url of urls) {
    try {
      // Extract video ID to check if already exists
      const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;
      
      if (videoId && existingIds.has(videoId)) {
        console.log(`Skipping ${url} - already in library`);
        continue;
      }
      
      const track = await useIpodStore.getState().addTrackFromVideoId(url);
      if (track) {
        addedTracks.push({
          title: track.title,
          artist: track.artist,
        });
        existingIds.add(track.id);
      }
    } catch (error) {
      console.error(`Failed to add ${url}:`, error);
    }
  }
  
  return addedTracks;
}

