import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/db";

export const scrapeAllAccounts = inngest.createFunction(
  {
    id: "scrape-all-accounts",
    name: "Scrape All Accounts (Weekly Cron)",
    retries: 1,
    triggers: [{ cron: "0 3 * * 1" }], // каждый понедельник в 03:00 UTC
  },
  async ({ step }) => {
    const accounts = await step.run("get-all-accounts", async () => {
      return prisma.account.findMany({
        where: { scrapeStatus: { not: "in_progress" } },
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

    return { success: true, accountCount: accounts.length };
  }
);
