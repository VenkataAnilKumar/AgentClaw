---
name: battlecard
description: Generate competitive positioning battlecard against named competitor.
args: <competitor-name>
agents:
  - gtm-agent
---

# Skill: battlecard

## Objective
Build a sales battlecard for a named competitor — what to say when prospects compare us to them.

## Inputs
- Args: competitor name
- COMPANY.md (our positioning, product stage)
- Team memory: `gtm.positioning` (our current positioning)
- Team memory: `gtm.competitors` (if competitor already analyzed)
- Team memory: `gtm.icp` (buyer profile to tailor messaging)

## Procedure
1. **Research competitor** — If team memory has prior battlecard, use it; else use public research (product features, pricing, Replicat reports, analyst notes)
2. **Identify where they're strong:**
   - Market presence / brand awareness
   - Feature completeness
   - Price competitiveness
   - Customer references
3. **Identify where they're weak:**
   - Use cases they don't handle
   - Price point
   - Enterprise-only vs. startup-ready
   - Implementation burden
4. **Build battlecard sections:**
   - **Their strengths** — What they do well (don't minimize)
   - **Our strengths** — Why we win in comparison
   - **Objections they raise** — Common sales tactics they use
   - **How we beat them** — Our response to their objections
   - **Landmines** — Things to avoid saying (data-backed only)
   - **Win themes** — Language to close if prospect leans our way
5. **Store in memory** — Upsert to `gtm.competitors.<name>`

## Output Format
```
---MEMORY_UPDATE---
key: gtm.competitors.<competitor_name>
value: {
  "their_strengths": [...],
  "our_strengths": [...],
  "objections": [...],
  "win_themes": [...],
  "last_updated": "2024-04-06"
}
---END_MEMORY_UPDATE---

**Battlecard: [Competitor Name]**

### Their Strengths
- [Item 1]
- [Item 2]

### Our Strengths
- [Item 1]  
- [Item 2]

### Common Objections & Our Responses
| Objection | Our Response |
|-----------|-------------|
| "X is cheaper" | We cost 40% more but [specific value proposition]" |
| "Y has more features" | [Feature comparison — when you need it, we're better] |

### Win Themes
- [Theme 1]
- [Theme 2]

### Landmines (Don't Go There)
- [False claim 1]
- [False claim 2]
```

## Example (Acme vs. Competitor)
```
Competitor: Retool

### Their Strengths
- Strong UI builder with drag-and-drop
- Large library of integrations
- Established enterprise customer base

### Our Strengths
- AI-native reasoning over integrations
- Founder-friendly (not enterprise-only)
- Autonomous execution (not just UI)

### Common Objections & Our Response
| "Retool can do automation too" | Retool automates workflows you define. We reason autonomously about your business and suggest next steps. |
| "Retool is cheaper" | Retool requires data engineering; we include it. True cost for Retool includes 2–3 months engineering time. |

### Win Themes
- "Retool for data. Acme for decisions."
- "Stop building, start reasoning."
```
