"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getHooks(
  projectId: string,
  filters?: {
    hookType?: string;
    language?: string;
    rating?: number;
    isUsed?: boolean;
    tags?: string[];
  }
) {
  try {
    const hooks = await prisma.hook.findMany({
      where: {
        projectId,
        ...(filters?.hookType && { hookType: filters.hookType }),
        ...(filters?.language && { language: filters.language }),
        ...(filters?.rating !== undefined && { rating: filters.rating }),
        ...(filters?.isUsed !== undefined && { isUsed: filters.isUsed }),
        ...(filters?.tags &&
          filters.tags.length > 0 && {
            tags: { hasSome: filters.tags },
          }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        video: {
          select: {
            id: true,
            url: true,
            viewsCount: true,
            account: {
              select: { username: true, platform: true },
            },
          },
        },
      },
    });
    return { success: true, data: hooks };
  } catch (error) {
    return { error: "Failed to fetch hooks" };
  }
}

export async function getHook(id: string) {
  try {
    const hook = await prisma.hook.findUnique({
      where: { id },
      include: {
        video: true,
      },
    });
    if (!hook) return { error: "Hook not found" };
    return { success: true, data: hook };
  } catch (error) {
    return { error: "Failed to fetch hook" };
  }
}

export async function createHook(data: {
  projectId: string;
  text: string;
  visualDescription?: string;
  hookType?: string;
  language?: string;
  videoId?: string;
  sourceViews?: number;
  sourceEr?: number;
  tags?: string[];
}) {
  try {
    const hook = await prisma.hook.create({
      data: {
        projectId: data.projectId,
        text: data.text,
        visualDescription: data.visualDescription,
        hookType: data.hookType,
        language: data.language ?? "en",
        videoId: data.videoId,
        sourceViews: data.sourceViews,
        sourceEr: data.sourceEr,
        tags: data.tags ?? [],
      },
    });
    revalidatePath(`/projects/${data.projectId}/hooks`);
    return { success: true, data: hook };
  } catch (error) {
    return { error: "Failed to create hook" };
  }
}

export async function updateHook(
  id: string,
  data: {
    text?: string;
    visualDescription?: string;
    hookType?: string;
    language?: string;
    sourceViews?: number;
    sourceEr?: number;
    adaptedText?: string;
    tags?: string[];
    rating?: number;
    notes?: string;
    isUsed?: boolean;
  }
) {
  try {
    const hook = await prisma.hook.update({
      where: { id },
      data,
    });
    revalidatePath(`/projects/${hook.projectId}/hooks`);
    return { success: true, data: hook };
  } catch (error) {
    return { error: "Failed to update hook" };
  }
}

export async function deleteHook(id: string) {
  try {
    const hook = await prisma.hook.delete({
      where: { id },
    });
    revalidatePath(`/projects/${hook.projectId}/hooks`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete hook" };
  }
}
