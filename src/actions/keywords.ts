"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const BRAINURA_KEYWORDS: Array<{
  phrase: string;
  cluster: string;
  type: "search" | "hashtag";
  intent?: "awareness" | "consideration" | "conversion";
}> = [
  { phrase: "brain training app", cluster: "Direct Search", type: "search", intent: "conversion" },
  { phrase: "best brain training app 2026", cluster: "Direct Search", type: "search", intent: "conversion" },
  { phrase: "brain games for adults", cluster: "Direct Search", type: "search", intent: "consideration" },
  { phrase: "brain workout", cluster: "Direct Search", type: "search", intent: "consideration" },
  { phrase: "cognitive training app", cluster: "Direct Search", type: "search", intent: "conversion" },
  { phrase: "brain age test", cluster: "Direct Search", type: "search", intent: "awareness" },
  { phrase: "brain age app", cluster: "Direct Search", type: "search", intent: "conversion" },
  { phrase: "memory training", cluster: "Direct Search", type: "search", intent: "consideration" },
  { phrase: "brain exercise app", cluster: "Direct Search", type: "search", intent: "conversion" },
  { phrase: "what is the best brain training app", cluster: "Direct Search", type: "search", intent: "conversion" },
  { phrase: "brain training that actually works", cluster: "Direct Search", type: "search", intent: "conversion" },
  { phrase: "does brain training work", cluster: "Direct Search", type: "search", intent: "awareness" },
  { phrase: "lumosity vs elevate which is better", cluster: "Direct Search", type: "search", intent: "conversion" },
  { phrase: "lumosity alternative", cluster: "Direct Search", type: "search", intent: "conversion" },
  { phrase: "elevate alternative", cluster: "Direct Search", type: "search", intent: "conversion" },
  { phrase: "brain training app free", cluster: "Direct Search", type: "search", intent: "conversion" },
  { phrase: "brain fitness", cluster: "Direct Search", type: "search", intent: "consideration" },
  { phrase: "brain training app review", cluster: "Direct Search", type: "search", intent: "conversion" },
  { phrase: "morning brain protocol", cluster: "Direct Search", type: "search", intent: "consideration" },
  { phrase: "cognitive warm up", cluster: "Direct Search", type: "search", intent: "consideration" },
  { phrase: "daily brain exercises", cluster: "Direct Search", type: "search", intent: "consideration" },
  { phrase: "train your brain app", cluster: "Direct Search", type: "search", intent: "conversion" },
  { phrase: "adult brain training app", cluster: "Direct Search", type: "search", intent: "conversion" },
  { phrase: "science backed brain training", cluster: "Direct Search", type: "search", intent: "conversion" },

  { phrase: "brain fog every morning", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "why is my brain foggy in the morning", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "how to get rid of brain fog fast", cluster: "Pain Points", type: "search", intent: "consideration" },
  { phrase: "morning brain fog fix", cluster: "Pain Points", type: "search", intent: "consideration" },
  { phrase: "brain fog after waking up", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "brain feels cloudy all the time", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "why do i feel dumb lately", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "brain fog what to do", cluster: "Pain Points", type: "search", intent: "consideration" },
  { phrase: "i can't concentrate anymore", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "why can't i focus at work", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "can't focus in the morning anymore", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "how to be sharper in the morning", cluster: "Pain Points", type: "search", intent: "consideration" },
  { phrase: "my brain feels slow", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "my memory is getting worse", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "forgetting things in my 30s", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "forgetting things in my 40s", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "keep forgetting what I was about to say", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "feel less sharp than i used to", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "losing my edge at work", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "feeling slower mentally", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "why do i blank out mid sentence", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "can't remember words anymore", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "brain not working in the morning", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "can't think straight until noon", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "waking up foggy every day", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "how to be more productive before 10am", cluster: "Pain Points", type: "search", intent: "consideration" },
  { phrase: "I keep zoning out at work", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "executive function problems", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "attention span getting shorter", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "how to stop being lazy in the morning", cluster: "Pain Points", type: "search", intent: "consideration" },
  { phrase: "is tiktok making me dumber", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "phone addiction ruining my brain", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "doomscrolling destroying my brain", cluster: "Pain Points", type: "search", intent: "awareness" },
  { phrase: "how to stop doomscrolling in the morning", cluster: "Pain Points", type: "search", intent: "consideration" },
  { phrase: "why can't I focus like I used to", cluster: "Pain Points", type: "search", intent: "awareness" },

  { phrase: "morning routine for focus", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "productive morning routine 2026", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "morning brain activation", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "how to wake up your brain fast", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "morning routine instead of scrolling", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "replace phone scrolling in the morning", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "how to replace scrolling with habits", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "morning routine high performer", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "morning protocol", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "huberman morning routine", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "andrew huberman morning routine", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "Huberman protocol app", cluster: "Morning Routine", type: "search", intent: "conversion" },
  { phrase: "5am morning routine productive", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "morning habits that make you smarter", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "10 minute morning routine", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "minimum effective morning routine", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "morning brain warm up", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "morning cognitive warm up", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "what to do in the first 10 minutes of waking up", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "morning routine for busy professionals", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "morning routine for entrepreneurs", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "morning routine for busy parents", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "morning routine before work", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "morning routine app", cluster: "Morning Routine", type: "search", intent: "conversion" },
  { phrase: "morning routine stack", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "wellness stacking morning", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "Atomic Habits morning routine", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "Miracle Morning routine", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "habit stacking morning routine", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "how to build a morning routine", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "how to make morning habits stick", cluster: "Morning Routine", type: "search", intent: "consideration" },
  { phrase: "what successful people do in the morning", cluster: "Morning Routine", type: "search", intent: "awareness" },

  { phrase: "biohacking brain", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "biohacking morning routine", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "how to biohack your brain", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "cognitive biohacking", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "neurohacking", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "brain optimization", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "how to optimize your brain", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "cognitive performance hacks", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "nootropics vs brain training", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "nootropics that actually work", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "lion's mane focus", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "lion's mane morning routine", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "best nootropics stack 2026", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "morning supplements for focus", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "brainergy", cluster: "Biohacking", type: "search", intent: "awareness" },
  { phrase: "quantified self brain", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "track your brain performance", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "brain health supplements", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "improve processing speed naturally", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "how to increase neuroplasticity", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "neuroplasticity exercises", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "how to train neuroplasticity", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "brain protocol", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "cognitive stack", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "morning brain stack", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "optimize cognitive performance", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "HRV sleep score brain performance", cluster: "Biohacking", type: "search", intent: "awareness" },
  { phrase: "oura ring brain performance", cluster: "Biohacking", type: "search", intent: "awareness" },
  { phrase: "Oura ring morning readiness", cluster: "Biohacking", type: "search", intent: "awareness" },
  { phrase: "Whoop recovery morning routine", cluster: "Biohacking", type: "search", intent: "awareness" },
  { phrase: "wearable neurofeedback", cluster: "Biohacking", type: "search", intent: "awareness" },
  { phrase: "heart rate variability and focus", cluster: "Biohacking", type: "search", intent: "awareness" },
  { phrase: "morning dopamine routine", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "dopamine baseline morning routine", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "morning light exposure routine", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "cold plunge brain benefits", cluster: "Biohacking", type: "search", intent: "awareness" },
  { phrase: "breathwork for focus", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "Wim Hof morning routine", cluster: "Biohacking", type: "search", intent: "consideration" },
  { phrase: "sleep tracking and brain performance", cluster: "Biohacking", type: "search", intent: "consideration" },

  { phrase: "how to fix brain rot", cluster: "Brain Rot", type: "search", intent: "consideration" },
  { phrase: "brain rot recovery", cluster: "Brain Rot", type: "search", intent: "consideration" },
  { phrase: "how to reverse brain rot", cluster: "Brain Rot", type: "search", intent: "consideration" },
  { phrase: "detox your brain from tiktok", cluster: "Brain Rot", type: "search", intent: "consideration" },
  { phrase: "dopamine detox brain", cluster: "Brain Rot", type: "search", intent: "consideration" },
  { phrase: "fix your attention span", cluster: "Brain Rot", type: "search", intent: "consideration" },
  { phrase: "how to rebuild attention span", cluster: "Brain Rot", type: "search", intent: "consideration" },
  { phrase: "stop being addicted to your phone", cluster: "Brain Rot", type: "search", intent: "consideration" },
  { phrase: "how to stop doomscrolling", cluster: "Brain Rot", type: "search", intent: "consideration" },
  { phrase: "replace doomscrolling", cluster: "Brain Rot", type: "search", intent: "consideration" },
  { phrase: "digital detox morning", cluster: "Brain Rot", type: "search", intent: "consideration" },
  { phrase: "break phone addiction morning", cluster: "Brain Rot", type: "search", intent: "consideration" },
  { phrase: "instead of scrolling do this", cluster: "Brain Rot", type: "search", intent: "consideration" },
  { phrase: "productive screen time", cluster: "Brain Rot", type: "search", intent: "consideration" },
  { phrase: "make your phone time count", cluster: "Brain Rot", type: "search", intent: "consideration" },
  { phrase: "tiktok brain rot test", cluster: "Brain Rot", type: "search", intent: "awareness" },
  { phrase: "is your brain rotting quiz", cluster: "Brain Rot", type: "search", intent: "awareness" },

  { phrase: "brain aging signs", cluster: "Cognitive Aging", type: "search", intent: "awareness" },
  { phrase: "cognitive decline in 30s", cluster: "Cognitive Aging", type: "search", intent: "awareness" },
  { phrase: "cognitive decline in 40s", cluster: "Cognitive Aging", type: "search", intent: "awareness" },
  { phrase: "how to prevent cognitive decline", cluster: "Cognitive Aging", type: "search", intent: "consideration" },
  { phrase: "brain health after 35", cluster: "Cognitive Aging", type: "search", intent: "consideration" },
  { phrase: "brain health after 40", cluster: "Cognitive Aging", type: "search", intent: "consideration" },
  { phrase: "brain training after 40", cluster: "Cognitive Aging", type: "search", intent: "conversion" },
  { phrase: "keep your brain young", cluster: "Cognitive Aging", type: "search", intent: "consideration" },
  { phrase: "slow down brain aging", cluster: "Cognitive Aging", type: "search", intent: "consideration" },
  { phrase: "signs your brain is aging", cluster: "Cognitive Aging", type: "search", intent: "awareness" },
  { phrase: "is my brain getting slower", cluster: "Cognitive Aging", type: "search", intent: "awareness" },
  { phrase: "am I too young for brain fog", cluster: "Cognitive Aging", type: "search", intent: "awareness" },
  { phrase: "is brain fog normal at 35", cluster: "Cognitive Aging", type: "search", intent: "awareness" },
  { phrase: "when does cognitive decline start", cluster: "Cognitive Aging", type: "search", intent: "awareness" },
  { phrase: "brain age test how accurate", cluster: "Cognitive Aging", type: "search", intent: "awareness" },
  { phrase: "memory problems young adults", cluster: "Cognitive Aging", type: "search", intent: "awareness" },
  { phrase: "why do i feel older mentally", cluster: "Cognitive Aging", type: "search", intent: "awareness" },
  { phrase: "alzheimer's prevention habits", cluster: "Cognitive Aging", type: "search", intent: "consideration" },
  { phrase: "how to prevent alzheimer's", cluster: "Cognitive Aging", type: "search", intent: "consideration" },
  { phrase: "how to keep brain sharp", cluster: "Cognitive Aging", type: "search", intent: "consideration" },
  { phrase: "brain exercises to prevent dementia", cluster: "Cognitive Aging", type: "search", intent: "consideration" },
  { phrase: "brain health habits", cluster: "Cognitive Aging", type: "search", intent: "consideration" },
  { phrase: "early cognitive decline warning signs", cluster: "Cognitive Aging", type: "search", intent: "awareness" },
  { phrase: "how to improve working memory", cluster: "Cognitive Aging", type: "search", intent: "consideration" },
  { phrase: "brain health tips for men", cluster: "Cognitive Aging", type: "search", intent: "consideration" },
  { phrase: "normal forgetfulness vs concern", cluster: "Cognitive Aging", type: "search", intent: "awareness" },
  { phrase: "neurological age vs real age", cluster: "Cognitive Aging", type: "search", intent: "awareness" },
  { phrase: "what is brain age", cluster: "Cognitive Aging", type: "search", intent: "awareness" },
  { phrase: "my brain age test", cluster: "Cognitive Aging", type: "search", intent: "conversion" },

  { phrase: "stroop test challenge", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "Stroop test tiktok", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "Stroop effect explained", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "try not to fail this brain test", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "can you pass this brain test", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "can you pass this color test", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "color word challenge", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "brain test that will mess you up", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "your brain is lying to you", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "try reading this without failing", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "brain trick that breaks your mind", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "only geniuses can pass this", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "this test will tell you your brain age", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "what is your brain age", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "brain age test tiktok", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "schulte table challenge", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "speed reading test", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "how fast can you read numbers", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "quick math challenge", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "mental math speed test", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "can you do math this fast", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "brain speed test", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "reaction time test", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "memory card game challenge", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "how good is your memory really", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "cognitive test challenge", cluster: "Challenge Format", type: "search", intent: "awareness" },
  { phrase: "30 day brain challenge", cluster: "Challenge Format", type: "search", intent: "consideration" },
  { phrase: "30 day morning routine challenge", cluster: "Challenge Format", type: "search", intent: "consideration" },
  { phrase: "brain training 30 days results", cluster: "Challenge Format", type: "search", intent: "consideration" },
  { phrase: "i tried brain training for 30 days", cluster: "Challenge Format", type: "search", intent: "consideration" },
  { phrase: "30 day cognitive challenge results", cluster: "Challenge Format", type: "search", intent: "consideration" },
  { phrase: "75 smart challenge", cluster: "Challenge Format", type: "search", intent: "consideration" },
  { phrase: "deep work challenge", cluster: "Challenge Format", type: "search", intent: "consideration" },
  { phrase: "no phone morning challenge", cluster: "Challenge Format", type: "search", intent: "consideration" },

  { phrase: "how to focus better at work", cluster: "Productivity", type: "search", intent: "consideration" },
  { phrase: "productivity hacks for professionals", cluster: "Productivity", type: "search", intent: "consideration" },
  { phrase: "how to get into flow state faster", cluster: "Productivity", type: "search", intent: "consideration" },
  { phrase: "deep work morning routine", cluster: "Productivity", type: "search", intent: "consideration" },
  { phrase: "morning deep work session", cluster: "Productivity", type: "search", intent: "consideration" },
  { phrase: "how to be more productive", cluster: "Productivity", type: "search", intent: "consideration" },
  { phrase: "time blocking morning routine", cluster: "Productivity", type: "search", intent: "consideration" },
  { phrase: "how to stop procrastinating in the morning", cluster: "Productivity", type: "search", intent: "consideration" },
  { phrase: "focus techniques that actually work", cluster: "Productivity", type: "search", intent: "consideration" },
  { phrase: "how to get more done before noon", cluster: "Productivity", type: "search", intent: "consideration" },
  { phrase: "productivity apps for professionals", cluster: "Productivity", type: "search", intent: "conversion" },
  { phrase: "how to build focus like a muscle", cluster: "Productivity", type: "search", intent: "consideration" },
  { phrase: "productivity tips for remote workers", cluster: "Productivity", type: "search", intent: "consideration" },
  { phrase: "productivity systems that work", cluster: "Productivity", type: "search", intent: "consideration" },
  { phrase: "how to focus like a CEO", cluster: "Productivity", type: "search", intent: "consideration" },

  { phrase: "Lumosity review 2025", cluster: "Competitor Displacement", type: "search", intent: "conversion" },
  { phrase: "Elevate app review", cluster: "Competitor Displacement", type: "search", intent: "conversion" },
  { phrase: "Lumosity vs Elevate", cluster: "Competitor Displacement", type: "search", intent: "conversion" },
  { phrase: "brain training app comparison", cluster: "Competitor Displacement", type: "search", intent: "conversion" },
  { phrase: "is Lumosity worth it", cluster: "Competitor Displacement", type: "search", intent: "conversion" },
  { phrase: "BrainHQ review", cluster: "Competitor Displacement", type: "search", intent: "conversion" },
  { phrase: "Peak brain app review", cluster: "Competitor Displacement", type: "search", intent: "conversion" },
  { phrase: "best brain training app Reddit", cluster: "Competitor Displacement", type: "search", intent: "conversion" },
  { phrase: "brain training apps that work", cluster: "Competitor Displacement", type: "search", intent: "conversion" },
  { phrase: "Duolingo but for your brain", cluster: "Competitor Displacement", type: "search", intent: "conversion" },
  { phrase: "brain games that aren't childish", cluster: "Competitor Displacement", type: "search", intent: "conversion" },
  { phrase: "premium brain training app", cluster: "Competitor Displacement", type: "search", intent: "conversion" },
  { phrase: "brain training app without ads", cluster: "Competitor Displacement", type: "search", intent: "conversion" },

  { phrase: "brain fog is ruining my life", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "POV you discover brain training", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "this app made me smarter", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "my morning brain hack", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "the 10 minute trick that changed my focus", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "bro just try this morning hack", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "why didn't anyone tell me about this", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "my brain age is younger than me", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "I replaced doomscrolling with this", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "this is your sign to start brain training", cluster: "TikTok Hooks", type: "search", intent: "consideration" },
  { phrase: "wait you guys aren't training your brain?", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "morning routine check", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "my brain feels brand new", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "the Stroop test humbled me", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "I can't believe I failed this test", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "showing my brain age to my friends", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "brain training glow up", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "this app is my secret weapon", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "morning protocol check", cluster: "TikTok Hooks", type: "search", intent: "awareness" },
  { phrase: "if you have brain fog watch this", cluster: "TikTok Hooks", type: "search", intent: "awareness" },

  { phrase: "high performer morning routine", cluster: "Identity", type: "search", intent: "consideration" },
  { phrase: "what i do before 7am", cluster: "Identity", type: "search", intent: "awareness" },
  { phrase: "morning routine ceo", cluster: "Identity", type: "search", intent: "consideration" },
  { phrase: "morning routine product manager", cluster: "Identity", type: "search", intent: "consideration" },
  { phrase: "morning habits of successful people", cluster: "Identity", type: "search", intent: "consideration" },
  { phrase: "sharper mind habits", cluster: "Identity", type: "search", intent: "consideration" },
  { phrase: "mental fitness", cluster: "Identity", type: "search", intent: "consideration" },
  { phrase: "mind gym", cluster: "Identity", type: "search", intent: "consideration" },
  { phrase: "brain workout like gym workout", cluster: "Identity", type: "search", intent: "awareness" },
  { phrase: "train your mind like your body", cluster: "Identity", type: "search", intent: "consideration" },
  { phrase: "intellectual fitness", cluster: "Identity", type: "search", intent: "consideration" },
  { phrase: "morning ritual for focus", cluster: "Identity", type: "search", intent: "consideration" },
  { phrase: "biohacker lifestyle", cluster: "Identity", type: "search", intent: "awareness" },
  { phrase: "optimize everything", cluster: "Identity", type: "search", intent: "awareness" },
  { phrase: "quantified self habits", cluster: "Identity", type: "search", intent: "consideration" },
  { phrase: "track everything including brain", cluster: "Identity", type: "search", intent: "consideration" },
  { phrase: "my brain age is lower than my real age", cluster: "Identity", type: "search", intent: "awareness" },
  { phrase: "brain age reveal", cluster: "Identity", type: "search", intent: "awareness" },

  { phrase: "#braintraining", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#brainhealth", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#braingames", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#cognitivetraining", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#neuroplasticity", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#neurohacking", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#biohacking", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#biohacker", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#biohack", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#nootropics", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#brainpower", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#brainworkout", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#brainhack", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#braingain", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#trainyourbrain", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#sharperbrain", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#morningprotocol", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#morningbrain", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#brainage", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#cognition", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#mentalfitness", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#mindworkout", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#brainfog", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#brainrot", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#brainrotrecovery", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#strooptest", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#hubermanlab", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#andrewhuberman", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#morningroutine", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#morninghabits", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#wellnessstacking", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#cognitivehealth", cluster: "Hashtag Niche", type: "hashtag" },
  { phrase: "#10minutehabit", cluster: "Hashtag Niche", type: "hashtag" },

  { phrase: "#selfimprovement", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#productivity", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#morningmotivation", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#healthyhabits", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#mentalhealth", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#wellness", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#wellnesstok", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#healthtok", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#mindset", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#growthmindset", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#selfcare", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#habitstacking", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#atomichabits", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#longevity", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#focustips", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#focusmode", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#deepwork", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#brainboost", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#smarthabits", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#dopaminedetox", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#highperformer", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#optimizeyourlife", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#mindsetshift", cluster: "Hashtag Broad", type: "hashtag" },
  { phrase: "#fyp", cluster: "Hashtag Broad", type: "hashtag" },
];

export async function getKeywords(
  projectId: string,
  filters?: {
    cluster?: string;
    type?: string;
    volume?: string;
    intent?: string;
    priority?: string;
    isCovered?: boolean;
    take?: number;
    skip?: number;
  }
) {
  try {
    const where: Record<string, unknown> = { projectId };

    if (filters?.cluster && filters.cluster !== "all") {
      where.cluster = filters.cluster;
    }
    if (filters?.type && filters.type !== "all") {
      where.type = filters.type;
    }
    if (filters?.volume && filters.volume !== "all") {
      where.volume = filters.volume;
    }
    if (filters?.intent && filters.intent !== "all") {
      where.intent = filters.intent;
    }
    if (filters?.priority && filters.priority !== "all") {
      where.priority = filters.priority;
    }
    if (filters?.isCovered !== undefined) {
      where.isCovered = filters.isCovered;
    }

    const [keywords, total] = await Promise.all([
      prisma.keyword.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filters?.take ?? 50,
        skip: filters?.skip ?? 0,
      }),
      prisma.keyword.count({ where }),
    ]);
    return { success: true as const, data: keywords, total };
  } catch (error) {
    return { error: "Failed to fetch keywords" };
  }
}

export async function getKeyword(id: string) {
  try {
    const keyword = await prisma.keyword.findUnique({ where: { id } });
    if (!keyword) return { error: "Keyword not found" };
    return { success: true as const, data: keyword };
  } catch (error) {
    return { error: "Failed to fetch keyword" };
  }
}

export async function createKeyword(data: {
  projectId: string;
  phrase: string;
  cluster?: string;
  type?: string;
  platform?: string;
  volume?: string;
  intent?: string;
  priority?: string;
  notes?: string;
  tags?: string[];
}) {
  try {
    const keyword = await prisma.keyword.create({
      data: {
        projectId: data.projectId,
        phrase: data.phrase,
        cluster: data.cluster,
        type: data.type ?? "search",
        platform: data.platform ?? "tiktok",
        volume: data.volume ?? "unknown",
        intent: data.intent,
        priority: data.priority ?? "medium",
        notes: data.notes,
        tags: data.tags ?? [],
      },
    });
    revalidatePath("/keywords");
    return { success: true as const, data: keyword };
  } catch (error) {
    return { error: "Failed to create keyword" };
  }
}

export async function updateKeyword(
  id: string,
  data: {
    phrase?: string;
    cluster?: string;
    type?: string;
    platform?: string;
    volume?: string;
    intent?: string;
    priority?: string;
    isCovered?: boolean;
    notes?: string;
    tags?: string[];
  }
) {
  try {
    const keyword = await prisma.keyword.update({
      where: { id },
      data,
    });
    revalidatePath("/keywords");
    return { success: true as const, data: keyword };
  } catch (error) {
    return { error: "Failed to update keyword" };
  }
}

export async function deleteKeyword(id: string) {
  try {
    await prisma.keyword.delete({ where: { id } });
    revalidatePath("/keywords");
    return { success: true as const };
  } catch (error) {
    return { error: "Failed to delete keyword" };
  }
}

export async function getClusterStats(projectId: string) {
  try {
    const keywords = await prisma.keyword.findMany({
      where: { projectId },
      select: { cluster: true, isCovered: true },
    });

    const map = new Map<string, { total: number; covered: number }>();
    for (const kw of keywords) {
      const key = kw.cluster ?? "Uncategorized";
      const entry = map.get(key) ?? { total: 0, covered: 0 };
      entry.total += 1;
      if (kw.isCovered) entry.covered += 1;
      map.set(key, entry);
    }

    const data = Array.from(map.entries())
      .map(([cluster, { total, covered }]) => ({ cluster, total, covered }))
      .sort((a, b) => b.total - a.total);

    return { success: true as const, data };
  } catch (error) {
    return { error: "Failed to fetch cluster stats" };
  }
}

export async function seedKeywords(projectId: string) {
  try {
    let count = 0;
    for (const kw of BRAINURA_KEYWORDS) {
      const result = await prisma.keyword.upsert({
        where: {
          projectId_phrase: { projectId, phrase: kw.phrase },
        },
        update: {
          cluster: kw.cluster,
          type: kw.type,
          intent: kw.intent ?? null,
        },
        create: {
          projectId,
          phrase: kw.phrase,
          cluster: kw.cluster,
          type: kw.type,
          intent: kw.intent ?? null,
        },
      });
      if (result) count++;
    }
    revalidatePath("/keywords");
    return { success: true as const, count };
  } catch (error) {
    return { error: "Failed to seed keywords" };
  }
}
