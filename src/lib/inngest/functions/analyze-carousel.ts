import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/db";
import { analyzeCarousel } from "@/lib/integrations/gemini";
import { scrapeCarouselImages } from "@/lib/integrations/scrapecreators";

export const analyzeCarouselFn = inngest.createFunction(
  {
    id: "analyze-carousel",
    name: "Analyze Carousel",
    retries: 2,
    triggers: [{ event: "analyze-carousel" }],
    onFailure: async ({ event, error }) => {
      const { carouselId } = event.data as unknown as { carouselId: string };
      // Surface the failure to the UI instead of silently dropping it.
      await prisma.carousel
        .update({
          where: { id: carouselId },
          data: {
            analysisStatus: "error",
            analysisError: error?.message?.slice(0, 1000) ?? "Неизвестная ошибка анализа",
          },
        })
        .catch(() => {});
      console.error(`analyze-carousel failed for carouselId=${carouselId}:`, error);
    },
  },
  async ({ event, step }) => {
    const { carouselId } = event.data as { carouselId: string };

    const carousel = await step.run("fetch-carousel", async () => {
      const c = await prisma.carousel.findUnique({
        where: { id: carouselId },
        include: {
          video: { select: { url: true, platform: true, description: true } },
          slides: { orderBy: { order: "asc" }, select: { imageUrl: true } },
        },
      });
      if (!c) throw new Error(`Carousel not found: ${carouselId}`);
      await prisma.carousel.update({
        where: { id: carouselId },
        data: { analysisStatus: "analyzing", analysisError: null },
      });
      return c;
    });

    // Prefer already-scraped slide images (saves ScrapeCreators credits on re-runs).
    const existingImages = carousel.slides
      .map((s) => s.imageUrl)
      .filter((u): u is string => Boolean(u));

    let images = existingImages;
    let description = carousel.video?.description ?? null;

    if (images.length === 0) {
      const url = carousel.sourceUrl ?? carousel.video?.url;
      if (!url) {
        throw new Error("У карусели нет URL источника и не привязано видео для анализа");
      }
      const platform =
        carousel.video?.platform ??
        (url.includes("instagram.com") ? "instagram" : "tiktok");

      const scraped = await step.run("scrape-slide-images", async () => {
        return scrapeCarouselImages(platform, url);
      });
      images = scraped.images;
      description = scraped.description ?? description;
    }

    const analysis = await step.run("analyze-with-gemini", async () => {
      return analyzeCarousel(images, description);
    });

    await step.run("save-results", async () => {
      await prisma.carouselSlide.deleteMany({ where: { carouselId } });

      const count = Math.max(analysis.slides.length, images.length);
      const rows = Array.from({ length: count }).map((_, i) => {
        const s = analysis.slides[i];
        return {
          carouselId,
          order: i + 1,
          slideType: s?.slideType ?? (i === 0 ? "cover" : i === count - 1 ? "cta" : "body"),
          text: s?.text ?? null,
          imagePrompt: s?.imagePrompt ?? null,
          imageUrl: images[i] ?? null, // original competitor slide image
        };
      });

      await prisma.carouselSlide.createMany({ data: rows });
      await prisma.carousel.update({
        where: { id: carouselId },
        data: {
          formula: analysis.formula,
          analysisStatus: "done",
          analysisError: null,
        },
      });
    });

    return {
      carouselId,
      formula: analysis.formula,
      slidesExtracted: analysis.slides.length,
      imagesUsed: images.length,
    };
  }
);
