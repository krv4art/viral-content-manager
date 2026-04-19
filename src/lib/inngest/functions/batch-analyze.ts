import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/db";

export const batchAnalyze = inngest.createFunction(
  {
    id: "batch-analyze",
    name: "Batch Analyze Videos",
    retries: 1,
    triggers: [{ event: "batch-analyze" }],
  },
  async ({ event, step }) => {
    const { accountId, limit } = event.data as {
      accountId: string;
      limit?: number;
    };

    const effectiveLimit = limit ?? 10;

    const videos = await step.run("fetch-top-videos", async () => {
      return prisma.video.findMany({
        where: {
          accountId,
          isAnalyzed: false,
          viewsCount: { not: null },
        },
        orderBy: { viewsCount: "desc" },
        take: effectiveLimit,
        select: { id: true },
      });
    });

    if (videos.length === 0) {
      return { success: true, analyzed: 0, message: "No unanalyzed videos found" };
    }

    const events = videos.map((video) => ({
      name: "analyze-video" as const,
      data: { videoId: video.id },
    }));

    await step.sendEvent("dispatch-analyses", events);

    return {
      success: true,
      dispatched: events.length,
      videoIds: videos.map((v) => v.id),
    };
  }
);
