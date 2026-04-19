import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/db";
import { analyzeVideo as geminiAnalyzeVideo } from "@/lib/integrations/gemini";

export const analyzeVideo = inngest.createFunction(
  {
    id: "analyze-video",
    name: "Analyze Video",
    retries: 2,
    triggers: [{ event: "analyze-video" }],
    onFailure: async ({ event, error }) => {
      const { videoId } = event.data as unknown as { videoId: string };
      console.error(`Analysis failed for video ${videoId}:`, error);
    },
  },
  async ({ event, step }) => {
    const { videoId } = event.data as { videoId: string };

    const video = await step.run("fetch-video", async () => {
      return prisma.video.findUnique({
        where: { id: videoId },
        include: {
          account: {
            select: { projectId: true },
          },
        },
      });
    });

    if (!video) {
      throw new Error(`Video not found: ${videoId}`);
    }

    const analysisResult = await step.run("call-gemini", async () => {
      return geminiAnalyzeVideo(video.url, video.description ?? undefined);
    });

    await step.run("save-analysis", async () => {
      return prisma.video.update({
        where: { id: videoId },
        data: {
          isAnalyzed: true,
          analysis: JSON.parse(JSON.stringify(analysisResult.analysis)),
          hookText: analysisResult.hookText,
          hookVisual: analysisResult.hookVisual,
          fullScript: analysisResult.fullScript,
        },
      });
    });

    if (analysisResult.hookText) {
      await step.run("create-hook", async () => {
        return prisma.hook.create({
          data: {
            projectId: video.account.projectId,
            videoId: video.id,
            text: analysisResult.hookText!,
            visualDescription: analysisResult.hookVisual,
            hookType: (analysisResult.analysis as Record<string, unknown>).hookType as string | undefined,
            sourceViews: video.viewsCount,
            sourceEr: video.engagementRate,
          },
        });
      });
    }

    if (analysisResult.fullScript) {
      await step.run("create-script", async () => {
        return prisma.script.create({
          data: {
            projectId: video.account.projectId,
            videoId: video.id,
            title: `Script from ${video.videoId}`,
            hook: analysisResult.hookText,
            body: analysisResult.fullScript,
            durationSeconds: video.durationSeconds,
            sourceViews: video.viewsCount,
          },
        });
      });
    }

    return {
      success: true,
      videoId,
      hasHook: !!analysisResult.hookText,
      hasScript: !!analysisResult.fullScript,
    };
  }
);
