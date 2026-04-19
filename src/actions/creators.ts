"use server";

import { prisma } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { revalidatePath } from "next/cache";

export async function getCreators(
  projectId: string,
  filters?: {
    status?: string;
  }
) {
  try {
    const creators = await prisma.creator.findMany({
      where: {
        projectId,
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        prototypeAccount: {
          select: {
            id: true,
            username: true,
            displayName: true,
            platform: true,
            url: true,
          },
        },
      },
    });
    return { success: true, data: creators };
  } catch (error) {
    return { error: "Failed to fetch creators" };
  }
}

export async function getCreator(id: string) {
  try {
    const creator = await prisma.creator.findUnique({
      where: { id },
      include: {
        prototypeAccount: true,
      },
    });
    if (!creator) return { error: "Creator not found" };
    return { success: true, data: creator };
  } catch (error) {
    return { error: "Failed to fetch creator" };
  }
}

export async function createCreator(data: {
  projectId: string;
  name: string;
  summary?: string;
  appearance?: string;
  voiceAndSpeech?: string;
  personality?: string;
  background?: string;
  visualStyle?: string;
  imageGenPrompt?: string;
  referenceImages?: string[];
  generatedImages?: string[];
  topHooks?: Record<string, unknown>;
  topScripts?: Record<string, unknown>;
  status?: string;
  notes?: string;
  prototypeAccountId?: string;
}) {
  try {
    const creator = await prisma.creator.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        summary: data.summary,
        appearance: data.appearance,
        voiceAndSpeech: data.voiceAndSpeech,
        personality: data.personality,
        background: data.background,
        visualStyle: data.visualStyle,
        imageGenPrompt: data.imageGenPrompt,
        referenceImages: data.referenceImages ?? [],
        generatedImages: data.generatedImages ?? [],
        topHooks: data.topHooks ? JSON.parse(JSON.stringify(data.topHooks)) : undefined,
        topScripts: data.topScripts ? JSON.parse(JSON.stringify(data.topScripts)) : undefined,
        status: data.status ?? "draft",
        notes: data.notes,
        prototypeAccountId: data.prototypeAccountId,
      },
    });
    revalidatePath(`/projects/${data.projectId}/creators`);
    return { success: true, data: creator };
  } catch (error) {
    return { error: "Failed to create creator" };
  }
}

export async function updateCreator(
  id: string,
  data: {
    name?: string;
    summary?: string;
    appearance?: string;
    voiceAndSpeech?: string;
    personality?: string;
    background?: string;
    visualStyle?: string;
    imageGenPrompt?: string;
    referenceImages?: string[];
    generatedImages?: string[];
    topHooks?: Record<string, unknown>;
    topScripts?: Record<string, unknown>;
    status?: string;
    notes?: string;
    prototypeAccountId?: string | null;
  }
) {
  try {
    const { prototypeAccountId, topHooks, topScripts, ...rest } = data;
    const creator = await prisma.creator.update({
      where: { id },
      data: {
        ...rest,
        ...(prototypeAccountId !== undefined && {
          prototypeAccountId: prototypeAccountId ?? null,
        }),
        ...(topHooks && { topHooks: JSON.parse(JSON.stringify(topHooks)) }),
        ...(topScripts && { topScripts: JSON.parse(JSON.stringify(topScripts)) }),
      },
    });
    revalidatePath(`/projects/${creator.projectId}/creators`);
    return { success: true, data: creator };
  } catch (error) {
    return { error: "Failed to update creator" };
  }
}

export async function deleteCreator(id: string) {
  try {
    const creator = await prisma.creator.delete({
      where: { id },
    });
    revalidatePath(`/projects/${creator.projectId}/creators`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete creator" };
  }
}

export async function triggerCreateCreatorFromPrototype(
  projectId: string,
  accountId: string,
  creatorName: string
) {
  try {
    const creator = await prisma.creator.create({
      data: { projectId, prototypeAccountId: accountId, name: creatorName, status: "draft" },
    });
    await inngest.send({
      name: "create-creator-doc",
      data: { creatorId: creator.id, accountId },
    });
    revalidatePath(`/projects/${projectId}/creators`);
    return { success: true, data: creator };
  } catch (error) {
    return { error: "Failed to create creator from prototype" };
  }
}

export async function checkRunwareKey() {
  return { available: !!process.env.RUNWARE_API_KEY };
}
