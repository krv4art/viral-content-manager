import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "viral-content-manager",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
