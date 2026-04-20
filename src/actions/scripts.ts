"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

function toWhere(val: string | string[] | undefined) {
  if (!val) return undefined;
  if (Array.isArray(val)) return val.length > 0 ? { in: val } : undefined;
  return val;
}

function toNumberWhere(val: number | number[] | undefined) {
  if (!val) return undefined;
  if (Array.isArray(val)) return val.length > 0 ? { in: val } : undefined;
  return val;
}

export async function getScripts(
  projectId: string,
  filters?: {
    format?: string | string[];
    language?: string | string[];
    rating?: number | number[];
    isUsed?: boolean;
  }
) {
  try {
    const scripts = await prisma.script.findMany({
      where: {
        projectId,
        ...(filters?.format && { format: toWhere(filters.format) }),
        ...(filters?.language && { language: toWhere(filters.language) }),
        ...(filters?.rating !== undefined && { rating: toNumberWhere(filters.rating) }),
        ...(filters?.isUsed !== undefined && { isUsed: filters.isUsed }),
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
    return { success: true, data: scripts };
  } catch (error) {
    return { error: "Failed to fetch scripts" };
  }
}

export async function getScript(id: string) {
  try {
    const script = await prisma.script.findUnique({
      where: { id },
      include: {
        video: true,
      },
    });
    if (!script) return { error: "Script not found" };
    return { success: true, data: script };
  } catch (error) {
    return { error: "Failed to fetch script" };
  }
}

export async function createScript(data: {
  projectId: string;
  title: string;
  hook?: string;
  body?: string;
  cta?: string;
  fullText?: string;
  format?: string;
  language?: string;
  videoId?: string;
  sourceViews?: number;
  tags?: string[];
}) {
  try {
    const script = await prisma.script.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        hook: data.hook,
        body: data.body,
        cta: data.cta,
        fullText: data.fullText,
        format: data.format,
        language: data.language ?? "en",
        videoId: data.videoId,
        sourceViews: data.sourceViews,
        tags: data.tags ?? [],
      },
    });
    revalidatePath(`/projects/${data.projectId}/scripts`);
    return { success: true, data: script };
  } catch (error) {
    return { error: "Failed to create script" };
  }
}

export async function updateScript(
  id: string,
  data: {
    title?: string;
    hook?: string;
    body?: string;
    cta?: string;
    fullText?: string;
    format?: string;
    durationSeconds?: number;
    language?: string;
    sourceViews?: number;
    adaptedVersion?: string;
    tags?: string[];
    rating?: number;
    notes?: string;
    isUsed?: boolean;
  }
) {
  try {
    const script = await prisma.script.update({
      where: { id },
      data,
    });
    revalidatePath(`/projects/${script.projectId}/scripts`);
    return { success: true, data: script };
  } catch (error) {
    return { error: "Failed to update script" };
  }
}

export async function deleteScript(id: string) {
  try {
    const script = await prisma.script.delete({
      where: { id },
    });
    revalidatePath(`/projects/${script.projectId}/scripts`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete script" };
  }
}
