import { NextResponse } from "next/server";
import { gapNote, mentionsPartialGravity, retrieve } from "@/lib/retrieval";
import { askClaude, hasApiKey } from "@/lib/claude";
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

  const ctx = retrieve(question, 6, lang);
  const citations = ctx.slice(0, 5).map((c) => ({ label: c.cite, url: c.url }));
  const gap = mentionsPartialGravity(question) ? gapNote(lang) : null;

  if (hasApiKey()) {
    try {
      const answer = await askClaude(question, ctx, lang);
      return NextResponse.json({ mode: "ai", answer, citations, gap });
    } catch {
      /* fall back to retrieval so the demo never breaks */
    }
  }

  const none =
    lang === "es"
      ? "No hay datos verificados para esa pregunta. Prueba con una investigación concreta (BASS, FLEX, SAME, BRE…), un entorno (Luna, ISS) o un tema (detección de humo, supresión, ventilación)."
      : "No verified data available for that question. Try asking about a specific investigation (BASS, FLEX, SAME, BRE…), an environment (Moon, ISS) or a topic (smoke detection, suppression, ventilation).";
  const answer = ctx.length
    ? ctx
        .slice(0, 3)
        .map((c) => `• ${c.text.length > 360 ? c.text.slice(0, 357) + "…" : c.text}`)
        .join("\n")
    : none;
  return NextResponse.json({ mode: "retrieval", answer, citations, gap });
}
