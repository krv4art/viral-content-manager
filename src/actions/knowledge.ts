"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getArticles(
  projectId?: string,
  filters?: {
    category?: string;
    search?: string;
  }
) {
  try {
    const articles = await prisma.knowledgeArticle.findMany({
      where: {
        ...(projectId && { projectId }),
        ...(filters?.category && { category: filters.category }),
        ...(filters?.search && {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { content: { contains: filters.search, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" },
      ],
    });
    return { success: true, data: articles };
  } catch (error) {
    return { error: "Failed to fetch articles" };
  }
}

export async function getArticle(id: string) {
  try {
    const article = await prisma.knowledgeArticle.findUnique({
      where: { id },
    });
    if (!article) return { error: "Article not found" };
    return { success: true, data: article };
  } catch (error) {
    return { error: "Failed to fetch article" };
  }
}

export async function createArticle(data: {
  projectId?: string;
  title: string;
  content: string;
  category: string;
  source?: string;
  tags?: string[];
  isPinned?: boolean;
}) {
  try {
    const article = await prisma.knowledgeArticle.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        content: data.content,
        category: data.category,
        source: data.source,
        tags: data.tags ?? [],
        isPinned: data.isPinned ?? false,
      },
    });
    if (data.projectId) {
      revalidatePath(`/projects/${data.projectId}/knowledge`);
    }
    revalidatePath("/knowledge");
    return { success: true, data: article };
  } catch (error) {
    return { error: "Failed to create article" };
  }
}

export async function updateArticle(
  id: string,
  data: {
    title?: string;
    content?: string;
    category?: string;
    source?: string;
    tags?: string[];
    isPinned?: boolean;
  }
) {
  try {
    const article = await prisma.knowledgeArticle.update({
      where: { id },
      data,
    });
    if (article.projectId) {
      revalidatePath(`/projects/${article.projectId}/knowledge`);
    }
    revalidatePath("/knowledge");
    return { success: true, data: article };
  } catch (error) {
    return { error: "Failed to update article" };
  }
}

export async function deleteArticle(id: string) {
  try {
    const article = await prisma.knowledgeArticle.delete({
      where: { id },
    });
    if (article.projectId) {
      revalidatePath(`/projects/${article.projectId}/knowledge`);
    }
    revalidatePath("/knowledge");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete article" };
  }
}
