import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { scrapeAccount } from "@/lib/inngest/functions/scrape-account";
import { analyzeVideo } from "@/lib/inngest/functions/analyze-video";
import { batchAnalyze } from "@/lib/inngest/functions/batch-analyze";
import { createCreatorDoc } from "@/lib/inngest/functions/create-creator-doc";
import { scrapeAllAccounts } from "@/lib/inngest/functions/scrape-all-accounts";
import { discoverChannels } from "@/lib/inngest/functions/discover-channels";
import { analyzeCommentsFn } from "@/lib/inngest/functions/analyze-comments";
import { getCommentInsightsFn } from "@/lib/inngest/functions/get-comment-insights";
import { analyzeCarouselFn } from "@/lib/inngest/functions/analyze-carousel";
import { adaptCarouselFn } from "@/lib/inngest/functions/adapt-carousel";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scrapeAccount, analyzeVideo, batchAnalyze, createCreatorDoc, scrapeAllAccounts, discoverChannels, analyzeCommentsFn, getCommentInsightsFn, analyzeCarouselFn, adaptCarouselFn],
});
