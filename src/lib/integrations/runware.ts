import { getApiKey } from "@/lib/settings";

const RUNWARE_API_URL = "https://api.runware.ai/v1";

interface RunwareImageResponse {
  imageURL: string;
}

interface RunwareRequest {
  taskType: string;
  taskUUID: string;
  positivePrompt: string;
  width?: number;
  height?: number;
  model?: string;
  steps?: number;
  CFGScale?: number;
  seed?: number;
  outputFormat?: string;
  outputQuality?: number;
  numberResults?: number;
}

export async function generateImage(
  prompt: string,
  options?: {
    width?: number;
    height?: number;
    model?: string;
    negativePrompt?: string;
  }
): Promise<string> {
  const apiKey = await getApiKey("runwareApiKey");
  if (!apiKey) {
    throw new Error("Runware API key not configured");
  }

  const taskUUID = crypto.randomUUID();

  const body: Record<string, unknown> = {
    taskType: "imageInference",
    taskUUID,
    positivePrompt: prompt,
    width: options?.width ?? 1024,
    height: options?.height ?? 1024,
    model: options?.model ?? "runware:100@1",
    steps: 30,
    CFGScale: 7,
    numberResults: 1,
    outputFormat: "PNG",
  };

  if (options?.negativePrompt) {
    body.negativePrompt = options.negativePrompt;
  }

  const response = await fetch(RUNWARE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify([body]),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Runware API request failed: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  const data = await response.json();

  const results: RunwareImageResponse[] = data?.data;
  if (!results || !Array.isArray(results) || results.length === 0) {
    throw new Error("Runware API returned no image results");
  }

  return results[0].imageURL;
}
