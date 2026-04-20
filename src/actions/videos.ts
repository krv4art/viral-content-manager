"use server";

import { prisma } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { revalidatePath } from "next/cache";
import { scrapeAccountVideos, scrapeSingleVideo } from "@/lib/integrations/scrapecreators";
import { calculateEngagementRate } from "@/lib/utils/metrics";

export async function getVideos(
  projectId: string,
  filters?: {
    accountId?: string | string[];
    type?: string | string[];
    isBookmarked?: boolean;
    search?: string;
    take?: number;
    skip?: number;
  }
) {
  try {
    const accountIdWhere = filters?.accountId
      ? Array.isArray(filters.accountId)
        ? filters.accountId.length > 0
          ? { in: filters.accountId }
          : undefined
        : filters.accountId
      : undefined;
    const typeWhere = filters?.type
      ? Array.isArray(filters.type)
        ? filters.type.length > 0
          ? { in: filters.type }
          : undefined
        : filters.type
      : undefined;
    const where = {
      projectId,
      ...(accountIdWhere && { accountId: accountIdWhere }),
      ...(typeWhere && { type: typeWhere }),
      ...(filters?.isBookmarked !== undefined && {
        isBookmarked: filters.isBookmarked,
      }),
      ...(filters?.search && {
        OR: [
          { description: { contains: filters.search, mode: "insensitive" as const } },
          { hookText: { contains: filters.search, mode: "insensitive" as const } },
          { notes: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filters?.take ?? 50,
        skip: filters?.skip ?? 0,
        include: {
          account: {
            select: {
              id: true,
              username: true,
              displayName: true,
              platform: true,
            },
          },
          _count: {
            select: { hooks: true, scripts: true },
          },
        },
      }),
      prisma.video.count({ where }),
    ]);

    return { success: true, data: videos, total };
  } catch (error) {
    return { error: "Failed to fetch videos" };
  }
}

export async function getVideo(id: string) {
  try {
    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        account: true,
        hooks: { orderBy: { createdAt: "desc" } },
        scripts: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!video) return { error: "Video not found" };
    return { success: true, data: video };
  } catch (error) {
    return { error: "Failed to fetch video" };
  }
}

export async function createVideo(data: {
  accountId: string;
  projectId: string;
  platform: string;
  videoId: string;
  url: string;
  type?: string;
  thumbnailUrl?: string;
  description?: string;
  durationSeconds?: number;
  viewsCount?: number;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  savesCount?: number;
  engagementRate?: number;
  postedAt?: Date;
  hashtags?: string[];
  musicName?: string;
  tags?: string[];
  notes?: string;
}) {
  try {
    const video = await prisma.video.create({
      data,
    });
    revalidatePath(`/projects/${data.projectId}/videos`);
    return { success: true, data: video };
  } catch (error) {
    return { error: "Failed to create video" };
  }
}

export async function updateVideo(
  id: string,
  data: {
    thumbnailUrl?: string;
    description?: string;
    durationSeconds?: number;
    viewsCount?: number;
    likesCount?: number;
    commentsCount?: number;
    sharesCount?: number;
    savesCount?: number;
    engagementRate?: number;
    postedAt?: Date;
    hashtags?: string[];
    musicName?: string;
    tags?: string[];
    notes?: string;
  }
) {
  try {
    const video = await prisma.video.update({
      where: { id },
      data,
      select: { projectId: true },
    });
    revalidatePath(`/projects/${video.projectId}/videos`);
    return { success: true, data: video };
  } catch (error) {
    return { error: "Failed to update video" };
  }
}

export async function deleteVideo(id: string) {
  try {
    const video = await prisma.video.delete({
      where: { id },
      select: { projectId: true },
    });
    revalidatePath(`/projects/${video.projectId}/videos`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete video" };
  }
}

export async function toggleBookmark(id: string) {
  try {
    const video = await prisma.video.findUnique({
      where: { id },
      select: { isBookmarked: true, projectId: true },
    });
    if (!video) return { error: "Video not found" };

    const updated = await prisma.video.update({
      where: { id },
      data: { isBookmarked: !video.isBookmarked },
    });

    revalidatePath(`/projects/${video.projectId}/videos`);
    return { success: true, data: updated };
  } catch (error) {
    return { error: "Failed to toggle bookmark" };
  }
}

export async function updateAnalysis(
  id: string,
  data: {
    hookText?: string;
    hookVisual?: string;
    fullScript?: string;
    analysis?: Record<string, unknown>;
    isAnalyzed: true;
  }
) {
  try {
    const { analysis, ...rest } = data;
    const video = await prisma.video.update({
      where: { id },
      data: {
        ...rest,
        ...(analysis && { analysis: JSON.parse(JSON.stringify(analysis)) }),
      },
      select: { projectId: true },
    });
    revalidatePath(`/projects/${video.projectId}/videos`);
    return { success: true, data: video };
  } catch (error) {
    return { error: "Failed to update analysis" };
  }
}

export async function getTopVideos(projectId: string, limit: number = 10) {
  try {
    const videos = await prisma.video.findMany({
      where: {
        projectId,
        viewsCount: { not: null },
      },
      orderBy: { viewsCount: "desc" },
      take: limit,
      include: {
        account: {
          select: {
            id: true,
            username: true,
            displayName: true,
            platform: true,
          },
        },
      },
    });
    return { success: true, data: videos };
  } catch (error) {
    return { error: "Failed to fetch top videos" };
  }
}

export async function triggerAnalyzeVideo(id: string) {
  try {
    const video = await prisma.video.findUnique({
      where: { id },
      select: { accountId: true },
    });
    if (!video) return { error: "Video not found" };

    await inngest.send({ name: "analyze-video", data: { videoId: id } });
    return { success: true };
  } catch (error) {
    return { error: "Failed to trigger analysis" };
  }
}

export async function triggerBatchAnalyze(accountId: string, limit: number = 10) {
  try {
    await inngest.send({ name: "batch-analyze", data: { accountId, limit } });
    return { success: true };
  } catch (error) {
    return { error: "Failed to trigger batch analysis" };
  }
}

export async function scrapeVideoStats(id: string) {
  try {
    const video = await prisma.video.findUnique({
      where: { id },
      select: {
        videoId: true,
        platform: true,
        accountId: true,
        projectId: true,
        account: { select: { username: true } },
      },
    });
    if (!video) return { error: "Video not found" };

    const videoRecord = await prisma.video.findUnique({ where: { id }, select: { url: true } });

    const videoUrl = videoRecord?.url ?? undefined;
    let found = await scrapeSingleVideo(video.platform, video.videoId, videoUrl);
    if (!found) {
      if (!video.account) {
        console.error(`[scrapeVideoStats] video ${video.videoId} has no account, cannot fallback to feed`);
        return { error: "Video not found and account is deleted" };
      }
      console.log(`[scrapeVideoStats] direct fetch failed, falling back to account feed for ${video.account.username}`);
      const videos = await scrapeAccountVideos(video.platform, video.account.username);
      found = videos.find((v) => v.videoId === video.videoId) ?? null;
      if (!found && videoUrl) {
        const extractId = (url: string) => {
          const m = url.match(/\/(?:video|reel|p|shorts)\/([A-Za-z0-9_-]+)/);
          return m ? m[1] : null;
        };
        const urlId = extractId(videoUrl);
        if (urlId) {
          found = videos.find((v) => v.videoId === urlId) ?? null;
        }
        if (!found) {
          found = videos.find((v) => videoUrl!.includes(v.videoId)) ?? null;
        }
      }
    }
    if (!found) {
      console.error(`[scrapeVideoStats] video ${video.videoId} not found via any method`);
      return { error: "Video not found in feed" };
    }

    const engagementRate = calculateEngagementRate(
      found.likesCount ?? 0,
      found.commentsCount ?? 0,
      found.sharesCount ?? 0,
      found.savesCount ?? 0,
      found.viewsCount ?? 0
    );

    const updated = await prisma.video.update({
      where: { id },
      data: {
        thumbnailUrl: found.thumbnailUrl,
        description: found.description,
        viewsCount: found.viewsCount,
        likesCount: found.likesCount,
        commentsCount: found.commentsCount,
        sharesCount: found.sharesCount,
        savesCount: found.savesCount,
        engagementRate,
        ...(found.postedAt ? { postedAt: new Date(found.postedAt) } : {}),
        hashtags: found.hashtags,
        musicName: found.musicName,
      },
    });

    revalidatePath(`/projects/${video.projectId}/videos`);
    return { success: true, data: updated };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[scrapeVideoStats] error:", msg);
    return { error: msg };
  }
}

export async function fixTikTokVideoUrls() {
  try {
    const videos = await prisma.video.findMany({
      where: { platform: "tiktok", account: { isNot: null } },
      select: { id: true, videoId: true, url: true, account: { select: { username: true } } },
    });

    const toFix = videos.filter((v) => !v.url.includes("tiktok.com") && v.account);
    if (toFix.length === 0) return { success: true, fixed: 0 };

    await Promise.all(
      toFix.map((v) =>
        prisma.video.update({
          where: { id: v.id },
          data: { url: `https://www.tiktok.com/@${v.account!.username}/video/${v.videoId}` },
        })
      )
    );

    return { success: true, fixed: toFix.length };
  } catch (error) {
    return { error: "Failed to fix TikTok video URLs" };
  }
}
