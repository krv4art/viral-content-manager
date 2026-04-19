"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getHypotheses(
  projectId: string,
  filters?: {
    status?: string;
    priority?: string;
    format?: string;
  }
) {
  try {
    const hypotheses = await prisma.hypothesis.findMany({
      where: {
        projectId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.priority && { priority: filters.priority }),
        ...(filters?.format && { format: filters.format }),
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: hypotheses };
  } catch (error) {
    return { error: "Failed to fetch hypotheses" };
  }
}

export async function getHypothesis(id: string) {
  try {
    const hypothesis = await prisma.hypothesis.findUnique({
      where: { id },
    });
    if (!hypothesis) return { error: "Hypothesis not found" };
    return { success: true, data: hypothesis };
  } catch (error) {
    return { error: "Failed to fetch hypothesis" };
  }
}

export async function createHypothesis(data: {
  projectId: string;
  title: string;
  description?: string;
  format?: string;
  hookId?: string;
  scriptId?: string;
  creatorId?: string;
  priority?: string;
  expectedResult?: string;
  tags?: string[];
}) {
  try {
    const hypothesis = await prisma.hypothesis.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        format: data.format,
        hookId: data.hookId,
        scriptId: data.scriptId,
        creatorId: data.creatorId,
        priority: data.priority ?? "medium",
        expectedResult: data.expectedResult,
        tags: data.tags ?? [],
      },
    });
    revalidatePath(`/projects/${data.projectId}/hypotheses`);
    return { success: true, data: hypothesis };
  } catch (error) {
    return { error: "Failed to create hypothesis" };
  }
}

export async function updateHypothesis(
  id: string,
  data: {
    title?: string;
    description?: string;
    format?: string;
    hookId?: string | null;
    scriptId?: string | null;
    creatorId?: string | null;
    status?: string;
    priority?: string;
    expectedResult?: string;
    actualResult?: string;
    publicationUrl?: string;
    publishedAt?: Date;
    metrics?: Record<string, unknown>;
    learnings?: string;
    tags?: string[];
  }
) {
  try {
    const { hookId, scriptId, creatorId, metrics, ...rest } = data;
    const hypothesis = await prisma.hypothesis.update({
      where: { id },
      data: {
        ...rest,
        ...(hookId !== undefined && { hookId: hookId ?? null }),
        ...(scriptId !== undefined && { scriptId: scriptId ?? null }),
        ...(creatorId !== undefined && { creatorId: creatorId ?? null }),
        ...(metrics && { metrics: JSON.parse(JSON.stringify(metrics)) }),
      },
    });
    revalidatePath(`/projects/${hypothesis.projectId}/hypotheses`);
    return { success: true, data: hypothesis };
  } catch (error) {
    return { error: "Failed to update hypothesis" };
  }
}

export async function deleteHypothesis(id: string) {
  try {
    const hypothesis = await prisma.hypothesis.delete({
      where: { id },
    });
    revalidatePath(`/projects/${hypothesis.projectId}/hypotheses`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete hypothesis" };
  }
}
