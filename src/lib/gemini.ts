import { optionalEnv, requiredEnv } from "./env";
import { parseJsonFromText } from "./metrics";
import type { StrategyInsight, ThumbnailInsight, YouTubeChannel, YouTubeVideo } from "./types";

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

async function callGemini(parts: GeminiPart[]): Promise<string> {
  const model = optionalEnv("GEMINI_MODEL", "gemini-2.5-flash");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${requiredEnv("GEMINI_API_KEY")}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.45,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part: any) => part.text).join("\n");
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

export async function analyzeStrategy(channel: YouTubeChannel, videos: YouTubeVideo[]): Promise<StrategyInsight> {
  const compactVideos = videos.map((video) => ({
    title: video.title,
    description: video.description.slice(0, 700),
    views: video.views,
    likes: video.likes,
    comments: video.comments,
    engagement_rate: video.engagement_rate,
    published_at: video.published_at
  }));

  const prompt = `
You are an AI competitor intelligence analyst for businesses.
Analyze this YouTube channel as a competitive strategy signal, not as a generic analytics dashboard.

Return only JSON with this schema:
{
  "content_theme": "dominant content theme in one sentence",
  "strategy_summary": "strategic read on what the competitor is doing",
  "virality_reason": "why the strongest content appears to perform",
  "audience_type": "target audience and underlying motivation",
  "emotional_hook": "primary emotional mechanism",
  "confidence_score": 0.0,
  "content_style": "format and production style",
  "storytelling_patterns": ["pattern 1", "pattern 2", "pattern 3"],
  "marketing_angle": "positioning or offer implied by content",
  "viral_mechanics": ["mechanic 1", "mechanic 2", "mechanic 3"],
  "positioning_strategy": "how this creator is positioned against alternatives",
  "upload_consistency": "cadence and consistency read",
  "creator_branding": "how the creator brand is reinforced",
  "strategic_insights": ["business-ready insight 1", "business-ready insight 2", "business-ready insight 3"],
  "recommended_response": ["action 1", "action 2", "action 3"],
  "sentiment": {"positive": 0.0, "neutral": 0.0, "negative": 0.0}
}

Channel:
${JSON.stringify(channel, null, 2)}

Recent videos:
${JSON.stringify(compactVideos, null, 2)}
`;

  return parseJsonFromText<StrategyInsight>(await callGemini([{ text: prompt }]));
}

async function imageToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to fetch thumbnail image");
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  return {
    data: Buffer.from(arrayBuffer).toString("base64"),
    mimeType: contentType.includes("png") ? "image/png" : "image/jpeg"
  };
}

export async function analyzeThumbnail(video: YouTubeVideo): Promise<ThumbnailInsight> {
  if (!video.thumbnail_url) throw new Error("Video has no thumbnail to analyze");
  const image = await imageToBase64(video.thumbnail_url);

  const prompt = `
You are a YouTube thumbnail strategist.
Analyze this thumbnail as a competitor intelligence signal. Use the video title as context.

Return only JSON:
{
  "video_id": "${video.video_id}",
  "visual_hook": "what grabs attention visually",
  "thumbnail_strategy": "the competitive thumbnail strategy being used",
  "text_overlay": "how text or readable symbols influence curiosity",
  "emotion_signal": "emotion the thumbnail is trying to trigger",
  "improvement_idea": "one tactical improvement a competitor could test",
  "confidence_score": 0.0
}

Video title: ${video.title}
Video metrics: ${video.views} views, ${video.engagement_rate}% engagement
`;

  const result = parseJsonFromText<ThumbnailInsight>(
    await callGemini([
      { text: prompt },
      { inline_data: { mime_type: image.mimeType, data: image.data } }
    ])
  );

  return { ...result, video_id: video.video_id };
}

export async function answerStrategicQuestion(input: {
  question: string;
  competitor: unknown;
  videos: unknown[];
  insights: unknown[];
  thumbnails: unknown[];
}): Promise<string> {
  const prompt = `
You are an AI competitor analyst for businesses.
Answer the user's question with direct strategic judgment. Use only the context below.
If useful, reference content themes, thumbnail strategy, audience psychology, positioning, and what changed recently.
Return JSON with one key: {"answer":"..."}

Question: ${input.question}
Competitor: ${JSON.stringify(input.competitor, null, 2)}
Recent videos: ${JSON.stringify(input.videos, null, 2)}
Recent insights: ${JSON.stringify(input.insights, null, 2)}
Thumbnail analyses: ${JSON.stringify(input.thumbnails, null, 2)}
`;

  const parsed = parseJsonFromText<{ answer: string }>(await callGemini([{ text: prompt }]));
  return parsed.answer;
}

