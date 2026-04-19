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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
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
