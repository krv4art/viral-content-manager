import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { scrapeAccount } from "@/lib/inngest/functions/scrape-account";
import { analyzeVideo } from "@/lib/inngest/functions/analyze-video";
import { batchAnalyze } from "@/lib/inngest/functions/batch-analyze";
import { createCreatorDoc } from "@/lib/inngest/functions/create-creator-doc";
import { scrapeAllAccounts } from "@/lib/inngest/functions/scrape-all-accounts";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scrapeAccount, analyzeVideo, batchAnalyze, createCreatorDoc, scrapeAllAccounts],
});
