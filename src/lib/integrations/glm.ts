import { getApiKey } from "@/lib/settings";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

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

export type ThumbnailAnalysis = {
  hookText: string | null;
  hookVisual: string | null;
  hookType: string | null;
};

async function getHeaders(): Promise<Record<string, string>> {
  const apiKey = await getApiKey("groqApiKey");
  if (!apiKey) throw new Error("Groq API key not configured");
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function parseJsonResponse(text: string): unknown {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

export async function analyzeCommentsGLM(
  comments: Array<{ text: string; likesCount?: number | null }>,
  productContext?: string,
  summaryOnly = false
): Promise<CommentAnalysisResult> {
  const headers = await getHeaders();

  const commentList = comments
    .map((c, i) => `${i + 1}. "${c.text}" (likes: ${c.likesCount ?? 0})`)
    .join("\n");

  const prompt = summaryOnly
    ? `You are an audience research analyst. Analyze the following comments and return a JSON object (ONLY valid JSON, no markdown):

${productContext ? `Product context: ${productContext}` : "This is a social media video."}

Comments:
${commentList}

{
  "painPoints": ["3-7 short one-sentence audience pain points"],
  "audienceLanguage": ["5-10 typical phrases or slang used by the audience"],
  "objections": ["2-5 objections or skepticism, if any"],
  "perComment": []
}`
    : `You are an audience research analyst. Analyze the following comments from a social media video and extract structured insights.

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

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `GLM comments analysis failed: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  const data = await response.json();
  const textContent = data.choices?.[0]?.message?.content ?? null;

  if (!textContent) {
    throw new Error("GLM API returned no content for comment analysis");
  }

  let parsed: CommentAnalysisResult;
  try {
    parsed = parseJsonResponse(textContent) as CommentAnalysisResult;
  } catch {
    throw new Error(
      `Failed to parse GLM comment analysis response: ${textContent}`
    );
  }

  return {
    painPoints: parsed.painPoints ?? [],
    audienceLanguage: parsed.audienceLanguage ?? [],
    objections: parsed.objections ?? [],
    perComment: parsed.perComment ?? [],
  };
}

export type AdaptedSlide = {
  order: number;
  slideType: string;
  text: string;
  imagePrompt: string;
};

export async function adaptCarouselGLM(
  referenceSlides: Array<{ order: number; slideType: string; text: string | null; imagePrompt: string | null }>,
  productDoc: string
): Promise<{ formula: string; slides: AdaptedSlide[] }> {
  const headers = await getHeaders();

  const slidesText = referenceSlides
    .map(s => `Slide ${s.order} (${s.slideType}):\nText: ${s.text ?? "(none)"}\nVisual: ${s.imagePrompt ?? "(none)"}`)
    .join("\n\n");

  const prompt = `You are a viral content strategist. Your task is to adapt a successful carousel formula for a new product.

PRODUCT CONTEXT:
${productDoc}

REFERENCE CAROUSEL (formula to adapt):
${slidesText}

Create an adapted carousel for the product above. Keep the same structural formula (number of slides, cover/body/cta order, narrative flow) but replace all content to match the product, its audience, and pain points.

Return ONLY valid JSON (no markdown):

{
  "formula": "1-2 sentence description of the adapted carousel formula",
  "slides": [
    {
      "order": 1,
      "slideType": "cover",
      "text": "Text for this slide (compelling, adapted for the product audience)",
      "imagePrompt": "Detailed visual description for AI image generation: scene, style, lighting, mood"
    }
  ]
}

Rules:
- Keep the same number of slides as the reference
- Match slideType (cover/body/cta) from reference
- Make text engaging and specific to the product audience
- imagePrompt should describe a realistic scene (UGC-style photography if human, lifestyle context)
- Do NOT use generic stock photo descriptions`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Carousel adaptation failed: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  const data = await response.json();
  const textContent = data.choices?.[0]?.message?.content ?? null;

  if (!textContent) {
    throw new Error("GLM API returned no content for carousel adaptation");
  }

  let parsed: { formula: string; slides: AdaptedSlide[] };
  try {
    parsed = parseJsonResponse(textContent) as { formula: string; slides: AdaptedSlide[] };
  } catch {
    throw new Error(`Failed to parse carousel adaptation response: ${textContent}`);
  }

  return {
    formula: parsed.formula ?? "",
    slides: (parsed.slides ?? []).map((s, i) => ({
      order: s.order ?? i + 1,
      slideType: s.slideType ?? "body",
      text: s.text ?? "",
      imagePrompt: s.imagePrompt ?? "",
    })),
  };
}

export async function analyzeThumbnailGLM(
  thumbnailUrl: string
): Promise<ThumbnailAnalysis> {
  const headers = await getHeaders();

  let base64: string;
  try {
    const imageRes = await fetch(thumbnailUrl, {
      signal: AbortSignal.timeout(15000),
    });
    const buffer = await imageRes.arrayBuffer();
    base64 = Buffer.from(buffer).toString("base64");
  } catch {
    return { hookText: null, hookVisual: null, hookType: null };
  }

  const prompt = `Read the hook text from this video thumbnail. Return JSON with this structure (respond with ONLY valid JSON, no markdown):

{
  "hookText": "The text visible on the thumbnail, or null if no text",
  "hookVisual": "Short description of the visual elements on the thumbnail",
  "hookType": "One of: question, shock, story, pattern_interrupt, controversy, value_promise, curiosity_gap, other, or null"
}

If the thumbnail has no text, return hookText as null.`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "llama-3.2-11b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 512,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `GLM thumbnail analysis failed: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  const data = await response.json();
  const textContent = data.choices?.[0]?.message?.content ?? null;

  if (!textContent) {
    return { hookText: null, hookVisual: null, hookType: null };
  }

  try {
    const parsed = parseJsonResponse(textContent) as ThumbnailAnalysis;
    return {
      hookText: parsed.hookText ?? null,
      hookVisual: parsed.hookVisual ?? null,
      hookType: parsed.hookType ?? null,
    };
  } catch {
    return { hookText: null, hookVisual: null, hookType: null };
  }
}
