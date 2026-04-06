---
name: board-prep
description: Generate quarterly board deck with metrics, financial forecast, key decisions, and outlook.
args: <quarter>
agents:
  - founder-agent
---

# Skill: board-prep

## Objective
Create a quarterly board presentation (metrics, decisions, forecast) that's investor-ready and tells the story of progress.

## Inputs
- Args: quarter (e.g., "Q1 2024")
- GTM agent: Revenue, pipeline, customer count, churn
- Hiring agent: Team growth, hires, retention
- Operations agent: Burn, runway, cash position
- CS agent: Customer health, NPS, expansion pipeline
- RUNWAY.md (current cash, forecast)
- OKR.md (quarterly goals vs. actuals)

## Procedure
1. **Gather metrics:**
   - Revenue: Actuals, MRR, ARR, growth rate
   - Customer metrics: Count, churn, NPS, LTV:CAC
   - Financial: Burn, runway, cash at bank
   - Team: Headcount, key hires, retention
   - Product: Key features shipped, roadmap progress
2. **Narrative:**
   - What was the quarter's theme? (growth, efficiency, product development)
   - What went well? (wins vs. plan)
   - What didn't? (misses + learnings)
   - Where are we heading? (next quarter priorities)
3. **Key slides:**
   - Cover: Company, key metrics at a glance, headline
   - Metrics: Revenue, burn, runway, unit economics
   - Progress: vs. goals, OKRs hit/missed
   - Team & culture
   - Go-to-market: Customer wins, pipeline
   - Product roadmap
   - Financial outlook: Next 12 months
   - Asks: Any decisions needed from board?
4. **Output:** Board deck outline with talking points

## Output Format
```
---MEMORY_UPDATE---
key: founder.board_deck.<quarter>
value: {
  "quarter": "[YYYY-QX]",
  "status": "prepared",
  "key_metrics": {...},
  "created": "[Date]"
}
---END_MEMORY_UPDATE---

📊 **Board Presentation: [Company Name] — [Quarter]**

---

## Slide 1: Cover
**[Company Name] | [Quarter] Board Update**
- **Headline:** [Key narrative, e.g., "Accelerating GTM, 3x revenue growth YoY"]
- **Date:** [Date]
- **Attendees:** [Board members + management]

---

## Slide 2: Key Metrics at a Glance

| Metric | Q[N] | Q[N-1] | Target | Status |
|--------|------|--------|--------|--------|
| MRR | $[X] | $[Y] | $[Z] | 🟢 [%] vs target |
| ARR | $[X]K | $[Y]K | $[Z]K | 🟢 [%] vs target |
| Customers | [N] | [N] | [N] | 🟢 [%] growth |
| Churn | [%] | [%] | <[%] | 🟢 Improving |
| Burn rate | $[X]K/mo | $[Y]K/mo | $[Z]K/mo | 🟡 [status] |
| **Runway** | [N] months | [N] months | [N] months | 🟢 Healthy |

---

## Slide 3: Revenue Progress

**MRR trajectory:** [Chart showing MRR trend over past 3 quarters]
- **Q[N] vs Q[N-1]:** +[%] growth
- **Annualized run rate:** $[X]M
- **vs Forecast:** [On track / Ahead / Behind]

**Key drivers:**
- New customers acquired: [N] (ACV: $[X])
- Churn: -[N] customers
- Expansion: +$[X]K (from [N] customers)

---

## Slide 4: Customer & Unit Economics

| Metric | This Q | Last Q | Industry Benchmark |
|--------|--------|--------|-------------------|
| CAC (Customer Acquisition Cost) | $[X] | $[Y] | $[Z] |
| LTV (Customer Lifetime Value) | $[X] | $[Y] | $[Z] |
| Payback period | [N] months | [N] months | [N] months |
| LTV:CAC ratio | [X]:[Y] | [X]:[Y] | 3:1 (target) |
| NPS | [X] | [Y] | 50+ (benchmark) |

**Status:** 🟢 Healthy unit economics / 🟡 Improving / 🔴 Red flag

---

## Slide 5: Team Growth

| Role | Q Start | Q End | Target |
|------|---------|-------|--------|
| Engineering | [N] | [N] | [N] |
| Sales/GTM | [N] | [N] | [N] |
| Operations | [N] | [N] | [N] |
| CS | [N] | [N] | [N] |
| **Total** | [N] | [N] | [N] |

**Key hires this quarter:** [Names + roles]
**Retention:** [%] (target: 95%+)

---

## Slide 6: Quarterly OKRs Status

| OKR | Owner | Status | Notes |
|-----|-------|--------|-------|
| Reach $[X]K MRR | VP Sales | ✅ Achieved | [X] days ahead |
| Hire [N] engineers | VP Eng | 🟡 2 of 3 | 1 offer pending |
| Ship [Feature X] | Product | ✅ Shipped | Used by [%] of customers |
| Reduce churn to <[%] | VP CS | ✅ Achieved | Down from [%] |
| Keep runway >12 months | CFO | ✅ On track | 18 months today |

**Summary:** [X] of 5 on track / exceeded

---

## Slide 7: Product Progress

**Major launches:** [Feature 1], [Feature 2]
**Impact:** [# of customers impacted], [lift in value]
**Next quarter focus:** [Roadmap priorities]

---

## Slide 8: Financial Snapshot

**Cash position:**
- Cash at bank: $[X]
- Monthly burn: $[Y]K
- Runway at current burn: [N] months
- **Growth scenario:** Runway extends to [N] months (if revenue hits [target])

**Efficiency improving:**
- Burn down [%] QoQ (from payroll reductions / process improvements)
- Path to cash flow breakeven: [Quarter]

---

## Slide 9: Next Quarter (Q[N+1]) Outlook

**Priorities:**
1. **GTM:** [Goal] (Target: $[X]K MRR)
2. **Product:** [Goal] (Unlocks: [value])
3. **Operations:** [Goal] (Target: [metric])
4. **Team:** [Goal] (Key hires: [roles])

**Investments:**
- New tools: [X]
- New hire: [Role] ($[X]K annual)
- R&D: [Initiative]

**Runway impact:** Still [N] months buffer (conservative case)

---

## Slide 10: 12-Month Financial Forecast

**Scenario: Base case (current trajectory)**

| Month | Rev | Burn | Cum Cash | Runway |
|-------|-----|------|----------|--------|
| Q[N] end | $[X]K | $[Y]K | $[Z] | [N] mo |
| +3 months | $[X+]K | $[Y]K | $[Z]K | [N] mo |
| +6 months | $[X+]K | $[Y]K | $[Z]K | [N] mo |
| +12 months | $[X+]K | $[Y]K | $[Z]K | [N] mo |

**Key assumptions:**
- GTM execution continues (target +20% MRR/mo)
- Churn stable at <[%]
- No new major hires (payroll flat)
- Burn modest increase from tooling

**Outcome:** Breakeven trajectory by [quarter] OR ready for Series B fundraise in [quarter]

---

## Slide 11: Asks for Board

**Decisions needed:**
1. [Decision 1] — Recommend [action] because [reason]
2. [Decision 2] — Need input on [question]

**Board introductions / expertise:**
- Need: [Expertise], have someone in your network?

**Discussion topics:**
- [Topic 1] — open questions

---

## Slide 12: Appendix (optional)

**Customer list:** Top 10 customers by ARR
**Cohort analysis:** Retention by vintage
**Market trends:** Industry tailwinds / headwinds
```

## Example
```
📊 **Board Presentation: AgentClaw — Q1 2024**

---

## Slide 2: Key Metrics
| Metric | Q1 | Q4 2023 | Target | Status |
|--------|-----|---------|--------|--------|
| MRR | $120K | $90K | $100K | 🟢 120% |
| Customers | 45 | 40 | 40 | 🟢 +5 |
| Churn | 2% | 3% | <2.5% | 🟢 Improving |
| Burn | $56K/mo | $52K/mo | $50K | 🟡 Slightly up |
| **Runway** | **20 months** | **22 months** | **18+ months** | 🟢 Healthy |

---

## Slide 6: Q1 OKRs
| OKR | Status | Notes |
|-----|--------|-------|
| Reach $120K MRR | ✅ Achieved | Hit on day 85 |
| Build team to 18 | ✅ Achieved | Hired engineer + designer |
| Churn <2% | ✅ Achieved | Down from 3% |
| Ship Feature X | ✅ Shipped | Used by 25% of customers |
| Maintain >18 months runway | ✅ On track | 20 months today |

---

## Slide 10: 12-Month Forecast (Base Case)
| Month | MRR | Burn | Runway |
|-------|-----|------|--------|
| Apr | $125K | $56K | 19 mo |
| Jul | $140K | $58K | 18 mo |
| Oct | $155K | $60K | 17 mo |
| Jan 2025 | $170K | $62K | 16 mo → Fundraise time |

**Path to breakeven:** Q3 2025 (revenue growth + operational efficiency)
```
