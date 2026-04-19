import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/db";
import {
  scrapeAccountProfile,
  scrapeAccountVideos,
} from "@/lib/integrations/scrapecreators";
import { calculateEngagementRate, calculateAvgViews } from "@/lib/utils/metrics";

export const scrapeAccount = inngest.createFunction(
  {
    id: "scrape-account",
    name: "Scrape Account",
    retries: 2,
    triggers: [{ event: "scrape-account" }],
    onFailure: async ({ event }) => {
      // In Inngest failure events the original payload is at event.data.event.data
      const originalData = (event.data as unknown as { event: { data: { accountId: string } } }).event?.data;
      const accountId = originalData?.accountId;
      if (!accountId) return;
      await prisma.account.update({
        where: { id: accountId },
        data: { scrapeStatus: "error" },
      }).catch(() => {});
    },
  },
  async ({ event, step }) => {
    const { accountId } = event.data as { accountId: string };

    await step.run("set-status-in-progress", async () => {
      return prisma.account.update({
        where: { id: accountId },
        data: { scrapeStatus: "in_progress" },
      });
    });

    const account = await step.run("fetch-account", async () => {
      return prisma.account.findUnique({
        where: { id: accountId },
        select: { id: true, platform: true, username: true, projectId: true },
      });
    });

    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    const profileData = await step.run("scrape-profile", async () => {
      return scrapeAccountProfile(account.platform, account.username);
    });

    await step.run("update-profile", async () => {
      return prisma.account.update({
        where: { id: accountId },
        data: {
          displayName: profileData.displayName,
          bio: profileData.bio,
          followersCount: profileData.followersCount,
          followingCount: profileData.followingCount,
          videosCount: profileData.videosCount,
          lastScrapedAt: new Date(),
        },
      });
    });

    const videos = await step.run("scrape-videos", async () => {
      return scrapeAccountVideos(account.platform, account.username);
    });

    const savedVideos = await step.run("save-videos", async () => {
      const results = [];

      for (const video of videos) {
        const engagementRate = calculateEngagementRate(
          video.likesCount ?? 0,
          video.commentsCount ?? 0,
          video.sharesCount ?? 0,
          video.savesCount ?? 0,
          video.viewsCount ?? 0
        );

        const saved = await prisma.video.upsert({
          where: {
            platform_videoId: {
              platform: account.platform,
              videoId: video.videoId,
            },
          },
          create: {
            accountId: account.id,
            platform: account.platform,
            videoId: video.videoId,
            url: video.url,
            thumbnailUrl: video.thumbnailUrl,
            description: video.description,
            durationSeconds: video.durationSeconds,
            viewsCount: video.viewsCount,
            likesCount: video.likesCount,
            commentsCount: video.commentsCount,
            sharesCount: video.sharesCount,
            savesCount: video.savesCount,
            engagementRate,
            postedAt: video.postedAt ? new Date(video.postedAt) : null,
            hashtags: video.hashtags,
            musicName: video.musicName,
          },
          update: {
            url: video.url,
            thumbnailUrl: video.thumbnailUrl,
            description: video.description,
            durationSeconds: video.durationSeconds,
            viewsCount: video.viewsCount,
            likesCount: video.likesCount,
            commentsCount: video.commentsCount,
            sharesCount: video.sharesCount,
            savesCount: video.savesCount,
            engagementRate,
            postedAt: video.postedAt ? new Date(video.postedAt) : null,
            hashtags: video.hashtags,
            musicName: video.musicName,
          },
        });

        results.push(saved);
      }

      return results;
    });

    await step.run("update-account-stats", async () => {
      const allVideos = await prisma.video.findMany({
        where: { accountId: account.id, viewsCount: { not: null } },
        select: { viewsCount: true, engagementRate: true },
      });

      const viewCounts = allVideos
        .map((v) => v.viewsCount)
        .filter((v): v is number => v != null);

      const avgViews = calculateAvgViews(viewCounts);

      const engagementRates = allVideos
        .map((v) => v.engagementRate)
        .filter((v): v is number => v != null);

      const avgEngagementRate =
        engagementRates.length > 0
          ? engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length
          : null;

      return prisma.account.update({
        where: { id: accountId },
        data: {
          avgViews,
          avgEngagementRate,
          videosCount: savedVideos.length,
          scrapeStatus: "idle",
        },
      });
    });

    return { success: true, videosScraped: savedVideos.length };
  }
);
