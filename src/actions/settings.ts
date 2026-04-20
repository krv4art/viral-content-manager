"use server";

import { prisma } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { revalidatePath } from "next/cache";

function maskKey(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.length <= 4) return "••••";
  return "••••" + key.slice(-4);
}

export async function getSettings() {
  try {
    const s = await prisma.settings.findUnique({ where: { id: "global" } });
    return {
      success: true,
      data: {
        scrapecreatorsApiKey: maskKey(s?.scrapecreatorsApiKey ?? process.env.SCRAPECREATORS_API_KEY),
        geminiApiKey: maskKey(s?.geminiApiKey ?? process.env.GEMINI_API_KEY),
        runwareApiKey: maskKey(s?.runwareApiKey ?? process.env.RUNWARE_API_KEY),
        scrapecreatorsSource: s?.scrapecreatorsApiKey ? "db" : process.env.SCRAPECREATORS_API_KEY ? "env" : "none",
        geminiSource: s?.geminiApiKey ? "db" : process.env.GEMINI_API_KEY ? "env" : "none",
        runwareSource: s?.runwareApiKey ? "db" : process.env.RUNWARE_API_KEY ? "env" : "none",
        autoScrapeEnabled: s?.autoScrapeEnabled ?? true,
        lastAutoScrapeAt: s?.lastAutoScrapeAt ?? null,
      },
    };
  } catch (error) {
    return { error: "Failed to fetch settings" };
  }
}

export async function updateSettings(data: {
  scrapecreatorsApiKey?: string;
  geminiApiKey?: string;
  runwareApiKey?: string;
  autoScrapeEnabled?: boolean;
}) {
  try {
    await prisma.settings.upsert({
      where: { id: "global" },
      create: { id: "global", ...data },
      update: data,
    });
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update settings" };
  }
}

export async function triggerManualScrapeAll() {
  try {
    const accounts = await prisma.account.findMany({
      where: { scrapeStatus: { not: "in_progress" } },
      select: { id: true },
    });
    if (accounts.length === 0) return { success: true, count: 0 };
    await inngest.send(
      accounts.map((a) => ({ name: "scrape-account" as const, data: { accountId: a.id } }))
    );
    return { success: true, count: accounts.length };
  } catch (error) {
    return { error: "Failed to trigger scrape" };
  }
}
