import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/db";
import {
  scrapeAccountProfile,
  scrapeAccountVideos,
} from "@/lib/integrations/scrapecreators";
import { analyzeVideo } from "@/lib/integrations/gemini";
import { calculateEngagementRate } from "@/lib/utils/metrics";

export const createCreatorDoc = inngest.createFunction(
  {
    id: "create-creator-doc",
    name: "Create Creator Doc",
    retries: 2,
    triggers: [{ event: "create-creator-doc" }],
    onFailure: async ({ event, error }) => {
      const { creatorId } = event.data as unknown as { creatorId: string };
      console.error(`Creator doc creation failed for ${creatorId}:`, error);
    },
  },
  async ({ event, step }) => {
    const { creatorId, accountId } = event.data as {
      creatorId: string;
      accountId: string;
    };

    const creator = await step.run("fetch-creator", async () => {
      return prisma.creator.findUnique({
        where: { id: creatorId },
      });
    });

    if (!creator) {
      throw new Error(`Creator not found: ${creatorId}`);
    }

    const account = await step.run("fetch-account", async () => {
      return prisma.account.findUnique({
        where: { id: accountId },
        select: {
          id: true,
          platform: true,
          username: true,
          displayName: true,
          bio: true,
          followersCount: true,
          projectId: true,
        },
      });
    });

    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    const profile = await step.run("scrape-profile", async () => {
      try {
        return await scrapeAccountProfile(account.platform, account.username);
      } catch {
        return null;
      }
    });

    const topVideos = await step.run("get-top-videos", async () => {
      const dbVideos = await prisma.video.findMany({
        where: {
          accountId,
          viewsCount: { not: null },
        },
        orderBy: { viewsCount: "desc" },
        take: 5,
      });

      if (dbVideos.length > 0) {
        return dbVideos;
      }

      try {
        const scraped = await scrapeAccountVideos(
          account.platform,
          account.username,
          5
        );
        return scraped;
      } catch {
        return [];
      }
    });

    const analyses = await step.run("analyze-top-videos", async () => {
      const results = [];

      for (const video of topVideos.slice(0, 5)) {
        const videoUrl =
          "url" in video ? video.url : "";
        const description =
          "description" in video ? video.description : undefined;

        if (!videoUrl) continue;

        try {
          const analysis = await analyzeVideo(videoUrl, description ?? undefined);
          results.push(analysis);
        } catch {
          // Skip videos that fail analysis
        }
      }

      return results;
    });

    const docFields = await step.run("generate-doc-fields", async () => {
      const hooks = analyses
        .filter((a) => a.hookText)
        .map((a) => a.hookText!);
      const scripts = analyses
        .filter((a) => a.fullScript)
        .map((a) => a.fullScript!);
      const visuals = analyses
        .filter((a) => a.hookVisual)
        .map((a) => a.hookVisual!);
      const insights = analyses
        .filter((a) => a.analysis?.insights)
        .map((a) => a.analysis.insights!);

      const visualStyle = visuals.length > 0
        ? visuals.join("\n\n")
        : null;

      const personality = insights.length > 0
        ? insights.join("\n\n")
        : null;

      const appearance = profile?.bio ?? account.bio ?? null;

      const voiceAndSpeech = scripts.length > 0
        ? `Speech patterns observed across ${scripts.length} videos:\n${scripts.join("\n---\n")}`
        : null;

      const summary = [
        account.displayName ?? account.username,
        profile?.bio ? `\nBio: ${profile.bio}` : "",
        `\nPlatform: ${account.platform}`,
        profile?.followersCount
          ? `\nFollowers: ${profile.followersCount.toLocaleString()}`
          : "",
        analyses.length > 0
          ? `\nAnalyzed ${analyses.length} top videos`
          : "",
      ].join("");

      const imageGenPrompt = [
        `Portrait of a content creator similar to ${account.displayName ?? account.username}`,
        appearance ? `Appearance: ${appearance}` : "",
        visualStyle ? `Visual style: ${visualStyle.slice(0, 200)}` : "",
        "Social media content creator aesthetic, high quality",
      ]
        .filter(Boolean)
        .join(". ");

      return {
        summary,
        appearance,
        voiceAndSpeech,
        personality,
        visualStyle,
        imageGenPrompt,
        topHooks: hooks.length > 0 ? hooks : null,
        topScripts: scripts.length > 0 ? scripts : null,
      };
    });

    await step.run("update-creator", async () => {
      return prisma.creator.update({
        where: { id: creatorId },
        data: {
          prototypeAccountId: accountId,
          summary: docFields.summary,
          appearance: docFields.appearance,
          voiceAndSpeech: docFields.voiceAndSpeech,
          personality: docFields.personality,
          visualStyle: docFields.visualStyle,
          imageGenPrompt: docFields.imageGenPrompt,
          topHooks: docFields.topHooks ? JSON.parse(JSON.stringify(docFields.topHooks)) : undefined,
          topScripts: docFields.topScripts ? JSON.parse(JSON.stringify(docFields.topScripts)) : undefined,
          status: "ready",
        },
      });
    });

    return {
      success: true,
      creatorId,
      videosAnalyzed: analyses.length,
    };
  }
);
