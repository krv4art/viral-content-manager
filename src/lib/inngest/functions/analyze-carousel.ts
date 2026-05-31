import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/db";
import { analyzeCarousel } from "@/lib/integrations/gemini";

export const analyzeCarouselFn = inngest.createFunction(
  {
    id: "analyze-carousel",
    name: "Analyze Carousel",
    retries: 2,
    triggers: [{ event: "analyze-carousel" }],
    onFailure: async ({ event, error }) => {
      const { carouselId } = event.data as unknown as { carouselId: string };
      console.error(`analyze-carousel failed for carouselId=${carouselId}:`, error);
    },
  },
  async ({ event, step }) => {
    const { carouselId } = event.data as { carouselId: string };

    const carousel = await step.run("fetch-carousel", async () => {
      const c = await prisma.carousel.findUnique({
        where: { id: carouselId },
        include: { video: { select: { url: true } } },
      });
      if (!c) throw new Error(`Carousel not found: ${carouselId}`);
      return c;
    });

    const url = carousel.sourceUrl ?? carousel.video?.url;
    if (!url) {
      throw new Error("Carousel has no source URL or linked video URL to analyze");
    }

    const analysis = await step.run("analyze-with-gemini", async () => {
      return analyzeCarousel(url);
    });

    await step.run("save-results", async () => {
      await prisma.carousel.update({
        where: { id: carouselId },
        data: { formula: analysis.formula },
      });

      await prisma.carouselSlide.deleteMany({ where: { carouselId } });

      await prisma.carouselSlide.createMany({
        data: analysis.slides.map((s: { order: number; slideType: string; text: string | null; imagePrompt: string | null }) => ({
          carouselId,
          order: s.order,
          slideType: s.slideType,
          text: s.text,
          imagePrompt: s.imagePrompt,
        })),
      });
    });

    return {
      carouselId,
      formula: analysis.formula,
      slidesExtracted: analysis.slides.length,
    };
  }
);
