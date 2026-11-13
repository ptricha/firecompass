import { NextResponse } from "next/server";
import { buildAnswer } from "@/lib/oracle";
import { hasApiKey, narrateWithClaude } from "@/lib/claude";
import type { Lang } from "@/lib/data";

export async function POST(req: Request) {
  let question = "";
  let lang: Lang = "en";
  try {
    const body = await req.json();
    question = typeof body?.question === "string" ? body.question.trim().slice(0, 500) : "";
    lang = body?.lang === "es" ? "es" : "en";
  } catch {
    /* fall through */
  }
  if (!question) return NextResponse.json({ error: "Missing question" }, { status: 400 });

  // Everything factual (numbers, evidence, gaps, links) is built from verified data.
  const { answer, context } = buildAnswer(question, lang);

  // With an API key, Claude rewrites the narrative; numbers it cannot support are removed.
  if (hasApiKey()) {
    try {
      const n = await narrateWithClaude(question, context, answer.keyFacts, lang);
      if (n) {
        const order: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return NextResponse.json({
          ...answer,
          mode: "ai",
          headline: n.headline,
          body: n.body,
          viz: n.viz !== "none" ? n.viz : answer.viz,
          followUps: n.followUps.length === 3 ? n.followUps : answer.followUps,
          // never more confident than the evidence allows
          confidence: order[n.confidence] < order[answer.confidence] ? n.confidence : answer.confidence,
        });
      }
    } catch {
      /* fall back to the evidence answer so the demo never breaks */
    }
  }
  return NextResponse.json(answer);
}
