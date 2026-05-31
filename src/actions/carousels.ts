"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { inngest } from "@/lib/inngest/client";
import { generateImage } from "@/lib/integrations/runware";
import { scrapeCarouselImages } from "@/lib/integrations/scrapecreators";

export async function getCarousels(
  projectId: string,
  filters?: {
    status?: string | string[];
    carouselType?: string | string[];
  }
) {
  try {
    const where: Record<string, unknown> = { projectId };

    if (filters?.status) {
      const v = filters.status;
      where.status = Array.isArray(v) ? { in: v } : v;
    }
    if (filters?.carouselType) {
      const v = filters.carouselType;
      where.carouselType = Array.isArray(v) ? { in: v } : v;
    }

    const carousels = await prisma.carousel.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { slides: true } },
        video: { select: { id: true, url: true, description: true } },
      },
    });
    return { success: true, data: carousels };
  } catch {
    return { error: "Failed to fetch carousels" };
  }
}

export async function getCarousel(id: string) {
  try {
    const carousel = await prisma.carousel.findUnique({
      where: { id },
      include: {
        slides: { orderBy: { order: "asc" } },
        video: { select: { id: true, url: true, description: true } },
      },
    });
    if (!carousel) return { error: "Carousel not found" };
    return { success: true, data: carousel };
  } catch {
    return { error: "Failed to fetch carousel" };
  }
}

export async function createCarousel(data: {
  projectId: string;
  title: string;
  carouselType?: string;
  sourceUrl?: string;
  videoId?: string;
  tags?: string[];
  notes?: string;
}) {
  try {
    const carousel = await prisma.carousel.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        carouselType: data.carouselType ?? "reference",
        sourceUrl: data.sourceUrl,
        videoId: data.videoId,
        tags: data.tags ?? [],
        notes: data.notes,
      },
    });
    revalidatePath("/carousels");
    return { success: true, data: carousel };
  } catch {
    return { error: "Failed to create carousel" };
  }
}

export async function updateCarousel(
  id: string,
  data: {
    title?: string;
    status?: string;
    carouselType?: string;
    formula?: string;
    sourceUrl?: string;
    videoId?: string | null;
    tags?: string[];
    notes?: string;
  }
) {
  try {
    const carousel = await prisma.carousel.update({ where: { id }, data });
    revalidatePath("/carousels");
    revalidatePath(`/carousels/${id}`);
    return { success: true, data: carousel };
  } catch {
    return { error: "Failed to update carousel" };
  }
}

export async function deleteCarousel(id: string) {
  try {
    await prisma.carousel.delete({ where: { id } });
    revalidatePath("/carousels");
    return { success: true };
  } catch {
    return { error: "Failed to delete carousel" };
  }
}

export async function createSlide(
  carouselId: string,
  data: {
    order: number;
    slideType?: string;
    text?: string;
    imagePrompt?: string;
    imageUrl?: string;
    notes?: string;
  }
) {
  try {
    const slide = await prisma.carouselSlide.create({
      data: {
        carouselId,
        order: data.order,
        slideType: data.slideType ?? "body",
        text: data.text,
        imagePrompt: data.imagePrompt,
        imageUrl: data.imageUrl,
        notes: data.notes,
      },
    });
    revalidatePath(`/carousels/${carouselId}`);
    return { success: true, data: slide };
  } catch {
    return { error: "Failed to create slide" };
  }
}

export async function updateSlide(
  id: string,
  data: {
    order?: number;
    slideType?: string;
    text?: string;
    imagePrompt?: string;
    imageUrl?: string;
    notes?: string;
  }
) {
  try {
    const slide = await prisma.carouselSlide.update({ where: { id }, data });
    return { success: true, data: slide };
  } catch {
    return { error: "Failed to update slide" };
  }
}

export async function deleteSlide(id: string) {
  try {
    const slide = await prisma.carouselSlide.findUnique({ where: { id } });
    if (!slide) return { error: "Slide not found" };
    await prisma.carouselSlide.delete({ where: { id } });
    revalidatePath(`/carousels/${slide.carouselId}`);
    return { success: true };
  } catch {
    return { error: "Failed to delete slide" };
  }
}

export async function reorderSlides(carouselId: string, orderedIds: string[]) {
  try {
    await Promise.all(
      orderedIds.map((slideId, idx) =>
        prisma.carouselSlide.update({
          where: { id: slideId },
          data: { order: idx + 1 },
        })
      )
    );
    revalidatePath(`/carousels/${carouselId}`);
    return { success: true };
  } catch {
    return { error: "Failed to reorder slides" };
  }
}

export async function generateSlideImage(slideId: string) {
  try {
    const slide = await prisma.carouselSlide.findUnique({ where: { id: slideId } });
    if (!slide) return { error: "Slide not found" };
    if (!slide.imagePrompt) return { error: "Image prompt is required" };

    const imageUrl = await generateImage(slide.imagePrompt, {
      width: 1080,
      height: 1920,
    });

    await prisma.carouselSlide.update({
      where: { id: slideId },
      data: { imageUrl },
    });

    revalidatePath(`/carousels/${slide.carouselId}`);
    return { success: true, data: { imageUrl } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed";
    return { error: message };
  }
}

/**
 * Step 1 (separate from Gemini analysis): scrape slide images via ScrapeCreators
 * and store them as slides. Synchronous + fast (no image download). Run this once;
 * re-running Gemini analysis afterwards reuses these images without burning credits.
 */
export async function scrapeCarouselSlides(carouselId: string) {
  try {
    const carousel = await prisma.carousel.findUnique({
      where: { id: carouselId },
      include: { video: { select: { url: true, platform: true } } },
    });
    if (!carousel) return { error: "Carousel not found" };

    const url = carousel.sourceUrl ?? carousel.video?.url;
    if (!url) return { error: "У карусели нет URL источника или привязанного видео" };

    const platform =
      carousel.video?.platform ??
      (url.includes("instagram.com") ? "instagram" : "tiktok");

    const scraped = await scrapeCarouselImages(platform, url);

    await prisma.carouselSlide.deleteMany({ where: { carouselId } });
    const len = scraped.images.length;
    await prisma.carouselSlide.createMany({
      data: scraped.images.map((img, i) => ({
        carouselId,
        order: i + 1,
        slideType: i === 0 ? "cover" : i === len - 1 ? "cta" : "body",
        imageUrl: img,
      })),
    });
    await prisma.carousel.update({
      where: { id: carouselId },
      data: { analysisStatus: "scraped", analysisError: null },
    });

    revalidatePath(`/carousels/${carouselId}`);
    return { success: true, data: { count: len, description: scraped.description } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка скрейпа слайдов";
    await prisma.carousel
      .update({
        where: { id: carouselId },
        data: { analysisStatus: "error", analysisError: message.slice(0, 1000) },
      })
      .catch(() => {});
    return { error: message };
  }
}

export async function triggerAnalyzeCarousel(carouselId: string) {
  try {
    await prisma.carousel.update({
      where: { id: carouselId },
      data: { analysisStatus: "analyzing", analysisError: null },
    });
    await inngest.send({ name: "analyze-carousel", data: { carouselId } });
    revalidatePath(`/carousels/${carouselId}`);
    return { success: true };
  } catch {
    return { error: "Failed to trigger carousel analysis" };
  }
}

export async function triggerAdaptCarousel(carouselId: string) {
  try {
    await inngest.send({ name: "adapt-carousel", data: { carouselId } });
    return { success: true };
  } catch {
    return { error: "Failed to trigger carousel adaptation" };
  }
}
