import { prisma } from "@/lib/db";

const ENV_MAP = {
  scrapecreatorsApiKey: "SCRAPECREATORS_API_KEY",
  geminiApiKey: "GEMINI_API_KEY",
  runwareApiKey: "RUNWARE_API_KEY",
} as const;

type ApiKeyField = keyof typeof ENV_MAP;

export async function getApiKey(field: ApiKeyField): Promise<string> {
  const settings = await prisma.settings.findUnique({ where: { id: "global" } });
  return settings?.[field] ?? process.env[ENV_MAP[field]] ?? "";
}
