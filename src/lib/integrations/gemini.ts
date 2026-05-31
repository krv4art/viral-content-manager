import { getApiKey } from "@/lib/settings";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface VideoAnalysis {
  hookText: string | null;
  hookVisual: string | null;
  fullScript: string | null;
  analysis: {
    hook: string | null;
    script: string | null;
    visual: string | null;
    insights: string | null;
    hookType: string | null;
  };
}

function buildAnalysisPrompt(videoUrl: string, description?: string): string {
  return `You are a viral content analyst. Analyze the following social media video and extract structured information.

Video URL: ${videoUrl}
${description ? `Video Description: ${description}` : ""}

Analyze this video and return a JSON object with the following structure (respond with ONLY valid JSON, no markdown):

{
  "hookText": "The exact or paraphrased hook text used in the first 3 seconds to grab attention. Null if no clear hook.",
  "hookVisual": "Description of the visual hook used to stop the scroll. Null if not applicable.",
  "fullScript": "The full spoken script or text overlay content of the video. Null if not available.",
  "analysis": {
    "hook": "Brief analysis of why the hook works or doesn't work",
    "script": "Brief analysis of the script structure and flow",
    "visual": "Brief analysis of visual elements, editing style, and production quality",
    "insights": "Key takeaways about why this video performs well. Include engagement patterns.",
    "hookType": "The type of hook used: question, shock, story, pattern_interrupt, controversy, value_promise, curiosity_gap, or other"
  }
}

Be specific and actionable in your analysis. Focus on patterns that can be replicated.`;
}

export async function analyzeVideo(
  videoUrl: string,
  description?: string
): Promise<VideoAnalysis> {
  const apiKey = await getApiKey("geminiApiKey");
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const prompt = buildAnalysisPrompt(videoUrl, description);

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
            ...(videoUrl
              ? [
                  {
                    fileData: {
                      fileUri: videoUrl,
                    },
                  },
                ]
              : []),
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Gemini API request failed: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  const data = await response.json();

  const textContent =
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

  if (!textContent) {
    throw new Error("Gemini API returned no content");
  }

  let parsed: Partial<VideoAnalysis>;
  try {
    parsed = JSON.parse(textContent);
  } catch {
    throw new Error(`Failed to parse Gemini response as JSON: ${textContent}`);
  }

  return {
    hookText: parsed.hookText ?? null,
    hookVisual: parsed.hookVisual ?? null,
    fullScript: parsed.fullScript ?? null,
    analysis: {
      hook: parsed.analysis?.hook ?? null,
      script: parsed.analysis?.script ?? null,
      visual: parsed.analysis?.visual ?? null,
      insights: parsed.analysis?.insights ?? null,
      hookType: parsed.analysis?.hookType ?? null,
    },
  };
}

export type CommentAnalysisResult = {
  painPoints: string[];
  audienceLanguage: string[];
  objections: string[];
  perComment: Array<{
    index: number;
    language: string | null;
    sentiment: "positive" | "negative" | "neutral";
    painPoint: string | null;
  }>;
};

export async function analyzeComments(
  comments: Array<{ text: string; likesCount?: number | null }>,
  productContext?: string
): Promise<CommentAnalysisResult> {
  const apiKey = await getApiKey("geminiApiKey");
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const commentList = comments
    .map((c, i) => `${i + 1}. "${c.text}" (likes: ${c.likesCount ?? 0})`)
    .join("\n");

  const prompt = `You are an audience research analyst. Analyze the following comments from a social media video and extract structured insights.

${productContext ? `Product context: ${productContext}` : "This is a social media video."}

Comments:
${commentList}

Analyze these comments and return a JSON object with this exact structure (respond with ONLY valid JSON, no markdown):

{
  "painPoints": ["3-7 short one-sentence formulations of audience pain points found in comments"],
  "audienceLanguage": ["5-10 typical phrases, slang, or language patterns used by the audience"],
  "objections": ["2-5 objections or skepticism expressed in comments, if any found"],
  "perComment": [
    {
      "index": 0,
      "language": "en",
      "sentiment": "positive",
      "painPoint": null
    }
  ]
}

For each comment provide:
- index: the 0-based index matching the comment order above
- language: ISO 639-1 code (en, ru, uk, es, pt, de, fr, etc.) or null
- sentiment: "positive", "negative", or "neutral"
- painPoint: if the comment contains a pain point, extract a short formulation; otherwise null

Be thorough but concise. Focus on actionable insights.`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Gemini comments analysis failed: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

  if (!textContent) {
    throw new Error("Gemini API returned no content for comment analysis");
  }

  let parsed: CommentAnalysisResult;
  try {
    parsed = JSON.parse(textContent);
  } catch {
    throw new Error(`Failed to parse Gemini comment analysis response: ${textContent}`);
  }

  return {
    painPoints: parsed.painPoints ?? [],
    audienceLanguage: parsed.audienceLanguage ?? [],
    objections: parsed.objections ?? [],
    perComment: parsed.perComment ?? [],
  };
}

export type CarouselSlideAnalysis = {
  order: number;
  slideType: "cover" | "body" | "cta";
  text: string | null;
  imagePrompt: string | null;
};

export type CarouselAnalysis = {
  formula: string;
  slides: CarouselSlideAnalysis[];
};

export async function analyzeCarousel(carouselUrl: string): Promise<CarouselAnalysis> {
  const apiKey = await getApiKey("geminiApiKey");
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const prompt = `You are a viral content analyst specializing in carousel posts (slideshows) for TikTok and Instagram.

Analyze this carousel post and extract its structure slide by slide.

Return a JSON object (respond with ONLY valid JSON, no markdown):

{
  "formula": "1-2 sentence description of the carousel formula: what type it is (list/how-to/before-after/myth-vs-reality/etc), how the hook works, how the body is structured, and what CTA is used",
  "slides": [
    {
      "order": 1,
      "slideType": "cover",
      "text": "Exact text visible on this slide, or null if no text",
      "imagePrompt": "Detailed description of the visual: scene, style, lighting, mood, composition in 1-2 sentences. Suitable for image generation."
    }
  ]
}

slideType must be one of: "cover" (first slide / hook), "body" (middle slides with content), "cta" (last slide with call to action).

For each slide describe:
- text: all visible text exactly as shown
- imagePrompt: the visual scene in enough detail to recreate it with AI image generation

Be thorough. Capture every slide.`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { fileData: { fileUri: carouselUrl } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Gemini carousel analysis failed: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

  if (!textContent) {
    throw new Error("Gemini API returned no content for carousel analysis");
  }

  let parsed: CarouselAnalysis;
  try {
    parsed = JSON.parse(textContent);
  } catch {
    throw new Error(`Failed to parse carousel analysis response: ${textContent}`);
  }

  return {
    formula: parsed.formula ?? "",
    slides: (parsed.slides ?? []).map((s, i) => ({
      order: s.order ?? i + 1,
      slideType: (["cover", "body", "cta"].includes(s.slideType) ? s.slideType : "body") as "cover" | "body" | "cta",
      text: s.text ?? null,
      imagePrompt: s.imagePrompt ?? null,
    })),
  };
}

export type ThumbnailAnalysis = {
  hookText: string | null;
  hookVisual: string | null;
  hookType: string | null;
};

export async function analyzeThumbnail(
  thumbnailUrl: string
): Promise<ThumbnailAnalysis> {
  const apiKey = await getApiKey("geminiApiKey");
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const prompt = `Read the hook text from this video thumbnail. Return JSON with this structure (respond with ONLY valid JSON, no markdown):

{
  "hookText": "The text visible on the thumbnail, or null if no text",
  "hookVisual": "Short description of the visual elements on the thumbnail",
  "hookType": "One of: question, shock, story, pattern_interrupt, controversy, value_promise, curiosity_gap, other, or null"
}

If the thumbnail has no text, return hookText as null.`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: await fetch(thumbnailUrl, {
                  signal: AbortSignal.timeout(15000),
                })
                  .then((r) => r.arrayBuffer())
                  .then((b) => Buffer.from(b).toString("base64")),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 512,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Gemini thumbnail analysis failed: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

  if (!textContent) {
    return { hookText: null, hookVisual: null, hookType: null };
  }

  try {
    const parsed = JSON.parse(textContent);
    return {
      hookText: parsed.hookText ?? null,
      hookVisual: parsed.hookVisual ?? null,
      hookType: parsed.hookType ?? null,
    };
  } catch {
    return { hookText: null, hookVisual: null, hookType: null };
  }
}
