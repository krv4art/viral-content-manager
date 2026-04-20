"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getProjects() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            accounts: true,
            hooks: true,
            scripts: true,
            creators: true,
            trends: true,
            hypotheses: true,
            knowledge: true,
          },
        },
      },
    });
    return { success: true, data: projects };
  } catch (error) {
    return { error: "Failed to fetch projects" };
  }
}

export async function getProject(id: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            accounts: true,
            hooks: true,
            scripts: true,
            creators: true,
            trends: true,
            hypotheses: true,
            knowledge: true,
          },
        },
      },
    });
    if (!project) return { error: "Project not found" };
    return { success: true, data: project };
  } catch (error) {
    return { error: "Failed to fetch project" };
  }
}

export async function createProject(data: {
  name: string;
  description?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  websiteUrl?: string;
  productDoc?: string;
  targetPlatforms?: string[];
  targetRegions?: string[];
}) {
  try {
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        appStoreUrl: data.appStoreUrl,
        playStoreUrl: data.playStoreUrl,
        websiteUrl: data.websiteUrl,
        productDoc: data.productDoc,
        targetPlatforms: data.targetPlatforms ?? [],
        targetRegions: data.targetRegions ?? [],
      },
    });
    revalidatePath("/projects");
    return { success: true, data: project };
  } catch (error) {
    return { error: "Failed to create project" };
  }
}

export async function updateProject(
  id: string,
  data: {
    name?: string;
    description?: string;
    appStoreUrl?: string;
    playStoreUrl?: string;
    websiteUrl?: string;
    productDoc?: string;
    targetPlatforms?: string[];
    targetRegions?: string[];
  }
) {
  try {
    const project = await prisma.project.update({
      where: { id },
      data,
    });
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    return { success: true, data: project };
  } catch (error) {
    return { error: "Failed to update project" };
  }
}

export async function deleteProject(id: string) {
  try {
    await prisma.project.delete({
      where: { id },
    });
    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete project" };
  }
}

export async function getProjectStats(id: string) {
  try {
    const [accounts, videos, hooks, scripts, hypotheses] = await Promise.all([
      prisma.account.count({ where: { projectId: id } }),
      prisma.video.count({
        where: { projectId: id },
      }),
      prisma.hook.count({ where: { projectId: id } }),
      prisma.script.count({ where: { projectId: id } }),
      prisma.hypothesis.count({ where: { projectId: id } }),
    ]);

    return {
      success: true,
      data: { accounts, videos, hooks, scripts, hypotheses },
    };
  } catch (error) {
    return { error: "Failed to fetch project stats" };
  }
}
