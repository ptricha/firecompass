# JaPax

**What will burn first in a lunar base?** JaPax turns decades of NASA microgravity combustion experiments into clear, cited answers for fire safety on the Moon and Mars.

Built for the **NASA Space Apps Challenge 2026**, challenge *Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data*.

## What it does

| Page | Purpose |
|---|---|
| **Home** | The story: three findings that change how we think about fire in space, a coverage map, historical incidents and Earth spinoffs. |
| **Explorer** | 19 NASA PSI investigations with test conditions, findings, sensors, sources and DOIs. Filter, search and compare up to three side by side. |
| **Simulator** (3D) | Pick an environment (Earth, ISS, lunar base, spacesuit): oxygen versus Earth, which experiments covered it, and a plain statement of where there is no data. |
| **Ranking** | Explainable lunar-habitat relevance score with adjustable weights, plus a coverage matrix by environment. |
| **History** | A vertical timeline of 31 verified milestones: incidents, experiments, hardware, spinoffs and open-data releases, with filters. |
| **Oracle** | Flame Oracle: visual answers (headline, key numbers, a chart of real data, cited evidence, data gaps, confidence). Numbers come from computed data; Claude narrates when an API key is set and unsupported figures are removed. |
| **References** | Every source, library and limitation. |

## Principles

- **Verified, never invented.** Each value comes from a cited NASA source (PSI metadata, NASA fact sheets, the 2015 *Researcher's Guide to Combustion Science*). Unverified values show as *Not verified*.
- **Honest about gaps.** PSI contains no partial-gravity combustion data; Moon and Mars are shown as gaps (LUCI and FM2 are expected to fill them), not extrapolated.
- **Explainable scoring.** The relevance score is a transparent, user-adjustable sum of five documented factors.

## Data pipeline

```
scripts/fetch-psi.mjs   -> data/psi/PSI-XX.json   (public PSI API, no key)
data/curated.json       -> hand-curated facts, each with its source
scripts/build-data.mjs  -> data/investigations.v2.json (what the app reads)
```

## Run locally

```bash
npm install
cp .env.example .env.local     # optional: add ANTHROPIC_API_KEY
npm run dev                    # http://localhost:3000
```

Other scripts: `npm run build`, `npm run type-check`, `node scripts/fetch-psi.mjs`, `node scripts/build-data.mjs`.

See [DEPLOY.md](DEPLOY.md) to publish on Vercel.

## Stack

Next.js 16 (App Router, TypeScript), Tailwind CSS 4, three.js (WebGL 3D flame lab and simulator, with an automatic 2D fallback), hand-written SVG charts, Anthropic SDK (optional). Full list in the in-app **References** page.

JaPax is an independent project and is not affiliated with or endorsed by NASA.
