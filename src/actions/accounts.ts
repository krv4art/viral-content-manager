"use server";

import { prisma } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { revalidatePath } from "next/cache";

function toWhere(val: string | string[] | undefined) {
  if (!val) return undefined;
  if (Array.isArray(val)) return val.length > 0 ? { in: val } : undefined;
  return val;
}

export async function getAccounts(
  projectId: string,
  filters?: {
    platform?: string | string[];
    category?: string | string[];
    tag?: string | string[];
    minAvgViews?: number;
    maxFollowers?: number;
    minMedianViews?: number;
  }
) {
  try {
    const accounts = await prisma.account.findMany({
      where: {
        projectId,
        ...(filters?.platform && { platform: toWhere(filters.platform) }),
        ...(filters?.category && { category: toWhere(filters.category) }),
        ...(filters?.tag && Array.isArray(filters.tag) && filters.tag.length > 0 && { tags: { hasSome: filters.tag } }),
        ...(filters?.minAvgViews && { avgViews: { gte: filters.minAvgViews } }),
        ...(filters?.maxFollowers && { followersCount: { lte: filters.maxFollowers } }),
        ...(filters?.minMedianViews && { medianViews: { gte: filters.minMedianViews } }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { videos: true },
        },
      },
    });
    return { success: true, data: accounts };
  } catch (error) {
    return { error: "Failed to fetch accounts" };
  }
}

export async function getAccount(id: string) {
  try {
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        videos: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { videos: true },
        },
      },
    });
    if (!account) return { error: "Account not found" };
    return { success: true, data: account };
  } catch (error) {
    return { error: "Failed to fetch account" };
  }
}

export async function createAccount(data: {
  projectId: string;
  platform: string;
  username: string;
  url: string;
  displayName?: string;
  category?: string;
  tags?: string[];
}) {
  try {
    const account = await prisma.account.create({
      data: {
        projectId: data.projectId,
        platform: data.platform,
        username: data.username,
        url: data.url,
        displayName: data.displayName,
        category: data.category ?? "competitor",
        tags: data.tags ?? [],
      },
    });
    await inngest.send({ name: "scrape-account", data: { accountId: account.id } });

    revalidatePath(`/projects/${data.projectId}`);
    revalidatePath(`/projects/${data.projectId}/accounts`);
    return { success: true, data: account };
  } catch (error) {
    return { error: "Failed to create account" };
  }
}

export async function triggerScrapeAccount(id: string) {
  try {
    const account = await prisma.account.findUnique({ where: { id }, select: { projectId: true } });
    if (!account) return { error: "Account not found" };

    await prisma.account.update({ where: { id }, data: { scrapeStatus: "in_progress" } });
    await inngest.send({ name: "scrape-account", data: { accountId: id } });

    revalidatePath(`/projects/${account.projectId}/accounts`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to trigger scrape" };
  }
}

export async function updateAccount(
  id: string,
  data: {
    platform?: string;
    username?: string;
    url?: string;
    displayName?: string;
    bio?: string;
    followersCount?: number;
    followingCount?: number;
    videosCount?: number;
    avgViews?: number;
    avgEngagementRate?: number;
    category?: string;
    tags?: string[];
    notes?: string;
    autoScrape?: boolean;
    medianViews?: number | null;
    colorLabels?: { color: string; text: string }[];
  }
) {
  try {
    const account = await prisma.account.update({
      where: { id },
      data,
    });
    revalidatePath(`/projects/${account.projectId}`);
    revalidatePath(`/projects/${account.projectId}/accounts`);
    return { success: true, data: account };
  } catch (error) {
    return { error: "Failed to update account" };
  }
}

export async function deleteAccount(id: string, deleteVideos: boolean = false) {
  try {
    if (deleteVideos) {
      await prisma.video.deleteMany({ where: { accountId: id } });
    }
    const account = await prisma.account.delete({
      where: { id },
    });
    revalidatePath(`/projects/${account.projectId}`);
    revalidatePath(`/projects/${account.projectId}/videos`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete account" };
  }
}

export async function resetStuckAccounts(projectId: string) {
  try {
    // Считаем задачу зависшей если она in_progress больше 5 минут
    const stuckThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const result = await prisma.account.updateMany({
      where: {
        projectId,
        scrapeStatus: "in_progress",
        updatedAt: { lt: stuckThreshold },
      },
      data: { scrapeStatus: "error" },
    });
    revalidatePath(`/projects/${projectId}/accounts`);
    revalidatePath("/accounts");
    return { success: true, count: result.count };
  } catch (error) {
    return { error: "Failed to reset stuck accounts" };
  }
}

export async function updateScrapeStatus(
  id: string,
  status: "idle" | "in_progress" | "error"
) {
  try {
    const account = await prisma.account.update({
      where: { id },
      data: {
        scrapeStatus: status,
        lastScrapedAt: status === "idle" ? new Date() : undefined,
      },
    });
    revalidatePath(`/projects/${account.projectId}/accounts`);
    return { success: true, data: account };
  } catch (error) {
    return { error: "Failed to update scrape status" };
  }
}
