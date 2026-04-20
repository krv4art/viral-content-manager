import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/db";

export const scrapeAllAccounts = inngest.createFunction(
  {
    id: "scrape-all-accounts",
    name: "Scrape All Accounts (Weekly Cron)",
    retries: 1,
    triggers: [{ cron: "0 3 * * 1" }],
  },
  async ({ step }) => {
    const enabled = await step.run("check-settings", async () => {
      const s = await prisma.settings.findUnique({ where: { id: "global" } });
      return s?.autoScrapeEnabled ?? true;
    });

    if (!enabled) {
      return { success: true, skipped: true, reason: "autoScrapeEnabled is false" };
    }

    const accounts = await step.run("get-all-accounts", async () => {
      return prisma.account.findMany({
        where: { scrapeStatus: { not: "in_progress" }, autoScrape: true },
        select: { id: true },
      });
    });

    if (accounts.length === 0) {
      return { success: true, accountCount: 0 };
    }

    await step.sendEvent(
      "dispatch-scrape-events",
      accounts.map((a) => ({
        name: "scrape-account" as const,
        data: { accountId: a.id },
      }))
    );

    await step.run("update-last-run", async () => {
      return prisma.settings.upsert({
        where: { id: "global" },
        create: { id: "global", lastAutoScrapeAt: new Date() },
        update: { lastAutoScrapeAt: new Date() },
      });
    });

    return { success: true, accountCount: accounts.length };
  }
);
