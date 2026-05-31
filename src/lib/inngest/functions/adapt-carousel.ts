import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/db";
import { adaptCarouselGLM } from "@/lib/integrations/glm";

export const adaptCarouselFn = inngest.createFunction(
  {
    id: "adapt-carousel",
    name: "Adapt Carousel for Product",
    retries: 2,
    triggers: [{ event: "adapt-carousel" }],
    onFailure: async ({ event, error }) => {
      const { carouselId } = event.data as unknown as { carouselId: string };
      console.error(`adapt-carousel failed for carouselId=${carouselId}:`, error);
    },
  },
  async ({ event, step }) => {
    const { carouselId } = event.data as { carouselId: string };

    const { carousel, productDoc } = await step.run("fetch-carousel", async () => {
      const c = await prisma.carousel.findUnique({
        where: { id: carouselId },
        include: {
          slides: { orderBy: { order: "asc" } },
          project: { select: { id: true, productDoc: true, name: true } },
        },
      });
      if (!c) throw new Error(`Carousel not found: ${carouselId}`);
      return {
        carousel: c,
        productDoc: c.project.productDoc ?? `Product: ${c.project.name}`,
      };
    });

    if (carousel.slides.length === 0) {
      throw new Error("Carousel has no slides to adapt. Run analysis first.");
    }

    const adapted = await step.run("adapt-with-glm", async () => {
      return adaptCarouselGLM(carousel.slides, productDoc);
    });

    const newCarouselId = await step.run("create-adapted-carousel", async () => {
      const newCarousel = await prisma.carousel.create({
        data: {
          projectId: carousel.projectId,
          title: `${carousel.title} — адаптация`,
          carouselType: "original",
          formula: adapted.formula,
          tags: carousel.tags,
          notes: `Адаптировано из карусели "${carousel.title}" (${carousel.id})`,
          slides: {
            create: adapted.slides.map((s) => ({
              order: s.order,
              slideType: s.slideType,
              text: s.text,
              imagePrompt: s.imagePrompt,
            })),
          },
        },
      });
      return newCarousel.id;
    });

    return { originalCarouselId: carouselId, newCarouselId };
  }
);
