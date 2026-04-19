"use server";

import { prisma } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { revalidatePath } from "next/cache";

export async function getVideos(
  projectId: string,
  filters?: {
    accountId?: string;
    type?: string;
    isBookmarked?: boolean;
    search?: string;
    take?: number;
    skip?: number;
  }
) {
  try {
    const where = {
      account: { projectId },
      ...(filters?.accountId && { accountId: filters.accountId }),
      ...(filters?.type && { type: filters.type }),
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
    const account = await prisma.account.findUnique({
      where: { id: data.accountId },
      select: { projectId: true },
    });
    if (account) {
      revalidatePath(`/projects/${account.projectId}/videos`);
    }
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
    });
    const account = await prisma.account.findUnique({
      where: { id: video.accountId },
      select: { projectId: true },
    });
    if (account) {
      revalidatePath(`/projects/${account.projectId}/videos`);
    }
    return { success: true, data: video };
  } catch (error) {
    return { error: "Failed to update video" };
  }
}

export async function deleteVideo(id: string) {
  try {
    const video = await prisma.video.delete({
      where: { id },
    });
    const account = await prisma.account.findUnique({
      where: { id: video.accountId },
      select: { projectId: true },
    });
    if (account) {
      revalidatePath(`/projects/${account.projectId}/videos`);
    }
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete video" };
  }
}

export async function toggleBookmark(id: string) {
  try {
    const video = await prisma.video.findUnique({
      where: { id },
      select: { isBookmarked: true, accountId: true },
    });
    if (!video) return { error: "Video not found" };

    const updated = await prisma.video.update({
      where: { id },
      data: { isBookmarked: !video.isBookmarked },
    });

    const account = await prisma.account.findUnique({
      where: { id: video.accountId },
      select: { projectId: true },
    });
    if (account) {
      revalidatePath(`/projects/${account.projectId}/videos`);
    }
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
    });
    const account = await prisma.account.findUnique({
      where: { id: video.accountId },
      select: { projectId: true },
    });
    if (account) {
      revalidatePath(`/projects/${account.projectId}/videos`);
    }
    return { success: true, data: video };
  } catch (error) {
    return { error: "Failed to update analysis" };
  }
}

export async function getTopVideos(projectId: string, limit: number = 10) {
  try {
    const videos = await prisma.video.findMany({
      where: {
        account: { projectId },
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
