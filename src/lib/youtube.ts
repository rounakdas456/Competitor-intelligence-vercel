import { requiredEnv } from "./env";
import { normalizeHandle } from "./metrics";
import type { YouTubeChannel, YouTubeVideo } from "./types";

const YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3";

async function youtubeGet(path: string, params: Record<string, string | number>): Promise<any> {
  const url = new URL(`${YOUTUBE_BASE_URL}/${path}`);
  Object.entries({ ...params, key: requiredEnv("YOUTUBE_API_KEY") }).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`YouTube API request failed with status ${response.status}`);
  }
  return response.json();
}

function toInt(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function resolveChannel(inputHandle: string): Promise<YouTubeChannel> {
  const handle = normalizeHandle(inputHandle);
  let data = await youtubeGet("channels", {
    part: "snippet,contentDetails,statistics",
    forHandle: handle
  });

  if (!data.items?.length) {
    const search = await youtubeGet("search", {
      part: "snippet",
      q: handle,
      type: "channel",
      maxResults: 1
    });
    const channelId = search.items?.[0]?.snippet?.channelId;
    if (!channelId) throw new Error(`No YouTube channel found for ${handle}`);
    data = await youtubeGet("channels", {
      part: "snippet,contentDetails,statistics",
      id: channelId
    });
  }

  const item = data.items?.[0];
  if (!item) throw new Error(`No YouTube channel found for ${handle}`);

  return {
    handle,
    channel_id: item.id,
    title: item.snippet?.title || null,
    description: item.snippet?.description || null,
    thumbnail_url: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || null,
    uploads_playlist_id: item.contentDetails?.relatedPlaylists?.uploads || null,
    subscriber_count: toInt(item.statistics?.subscriberCount),
    video_count: toInt(item.statistics?.videoCount)
  };
}

export async function fetchRecentVideos(channelId: string, maxResults = 12): Promise<YouTubeVideo[]> {
  const channelData = await youtubeGet("channels", {
    part: "contentDetails",
    id: channelId
  });
  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return [];

  const playlist = await youtubeGet("playlistItems", {
    part: "snippet,contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults: Math.min(maxResults, 50)
  });

  const videoIds = (playlist.items || [])
    .map((item: any) => item.contentDetails?.videoId)
    .filter(Boolean);

  if (!videoIds.length) return [];

  const videoData = await youtubeGet("videos", {
    part: "snippet,statistics,contentDetails",
    id: videoIds.join(",")
  });

  return (videoData.items || []).map((item: any) => {
    const views = toInt(item.statistics?.viewCount);
    const likes = toInt(item.statistics?.likeCount);
    const comments = toInt(item.statistics?.commentCount);
    const engagement = views ? ((likes + comments) / views) * 100 : 0;

    return {
      video_id: item.id,
      title: item.snippet?.title || "",
      description: item.snippet?.description || "",
      thumbnail_url: item.snippet?.thumbnails?.maxres?.url || item.snippet?.thumbnails?.high?.url || null,
      video_url: `https://www.youtube.com/watch?v=${item.id}`,
      views,
      likes,
      comments,
      engagement_rate: Number(engagement.toFixed(3)),
      published_at: item.snippet?.publishedAt || new Date().toISOString(),
      raw_data: item
    };
  });
}

export async function fetchChannelAnalysis(handle: string, maxResults: number) {
  const channel = await resolveChannel(handle);
  const videos = await fetchRecentVideos(channel.channel_id, maxResults);
  return { channel, videos };
}

