"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

function toWhere(val: string | string[] | undefined) {
  if (!val) return undefined;
  if (Array.isArray(val)) return val.length > 0 ? { in: val } : undefined;
  return val;
}

export async function getTrends(
  projectId: string,
  filters?: {
    type?: string | string[];
    platform?: string | string[];
    relevance?: string | string[];
  }
) {
  try {
    const trends = await prisma.trend.findMany({
      where: {
        projectId,
        ...(filters?.type && { type: toWhere(filters.type) }),
        ...(filters?.platform && { platform: toWhere(filters.platform) }),
        ...(filters?.relevance && { relevance: toWhere(filters.relevance) }),
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: trends };
  } catch (error) {
    return { error: "Failed to fetch trends" };
  }
}

export async function getTrend(id: string) {
  try {
    const trend = await prisma.trend.findUnique({
      where: { id },
    });
    if (!trend) return { error: "Trend not found" };
    return { success: true, data: trend };
  } catch (error) {
    return { error: "Failed to fetch trend" };
  }
}

export async function createTrend(data: {
  projectId: string;
  title: string;
  description?: string;
  type: string;
  platform?: string;
  relevance?: string;
  applicability?: number;
  adaptationNotes?: string;
  tags?: string[];
  exampleUrls?: string[];
}) {
  try {
    const trend = await prisma.trend.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        type: data.type,
        platform: data.platform,
        relevance: data.relevance ?? "warm",
        applicability: data.applicability,
        adaptationNotes: data.adaptationNotes,
        tags: data.tags ?? [],
        exampleUrls: data.exampleUrls ?? [],
      },
    });
    revalidatePath(`/projects/${data.projectId}/trends`);
    return { success: true, data: trend };
  } catch (error) {
    return { error: "Failed to create trend" };
  }
}

export async function updateTrend(
  id: string,
  data: {
    title?: string;
    description?: string;
    type?: string;
    platform?: string;
    relevance?: string;
    applicability?: number;
    adaptationNotes?: string;
    tags?: string[];
    exampleUrls?: string[];
  }
) {
  try {
    const trend = await prisma.trend.update({
      where: { id },
      data,
    });
    revalidatePath(`/projects/${trend.projectId}/trends`);
    return { success: true, data: trend };
  } catch (error) {
    return { error: "Failed to update trend" };
  }
}

export async function deleteTrend(id: string) {
  try {
    const trend = await prisma.trend.delete({
      where: { id },
    });
    revalidatePath(`/projects/${trend.projectId}/trends`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete trend" };
  }
}
