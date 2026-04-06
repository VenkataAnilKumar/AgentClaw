---
name: health-score
description: Calculate health score (red/yellow/green) for a customer across adoption, engagement, and sentiment.
args: <customer-name>
agents:
  - customer-success-agent
---

# Skill: health-score

## Objective
Quantify customer health on a 1–100 scale with red/yellow/green status — early warning system for churn.

## Inputs
- Args: customer name
- Team memory: `cs.customers.<customer-slug>` (current customer profile, contract value, ARR)
- Team memory: `cs.engagement.<customer-slug>` (usage metrics, feature adoption, last usage)
- Team memory: `cs.interactions.<customer-slug>` (support tickets, NPS responses, sentiment)

## Procedure
1. **Gather customer data:**
   - Contract value (ACV or ARR)
   - Current usage (daily/weekly active, features used)
   - Support ticket volume (spike = trouble)
   - NPS or feedback sentiment (happy, neutral, unhappy)
   - Last interaction: When did we last talk?
   - Time since onboarding: Are they still ramp?
2. **Score factors (each 0–20 points = 100 total):**
   - **Adoption (0–20):** % of features used, time to value achieved
   - **Engagement (0–20):** Usage frequency, depth (daily active users / total users)
   - **Support health (0–20):** Ticket volume (normal vs. spike), response time
   - **Sentiment (0–20):** NPS, verbatim feedback, tone of recent interactions
   - **Renewal trajectory (0–20):** Expand opportunity, contract terms, expiration date
3. **Assign color:**
   - 80–100: 🟢 **Green** — Healthy, low churn risk, expansion opportunity
   - 60–79: 🟡 **Yellow** — At risk, needs attention, engagement declining
   - <60: 🔴 **Red** — Critical churn risk, urgent action needed
4. **Calculate trend:**
   - Is customer trending up or down month-over-month?
   - Spike in support tickets = red flag
5. **Store score** — Upsert to `cs.health_scores`

## Output Format
```
---MEMORY_UPDATE---
key: cs.health_scores.<customer-slug>
value: {
  "customer": "[Name]",
  "arr": [Amount],
  "score": [0-100],
  "status": "red|yellow|green",
  "trend": "up|stable|down",
  "adoption": [0-20],
  "engagement": [0-20],
  "support": [0-20],
  "sentiment": [0-20],
  "renewal": [0-20],
  "updated": "[Date]"
}
---END_MEMORY_UPDATE---

## Health Score: [Customer Name]

**Overall Score: [X]/100** → 🟢 [GREEN/YELLOW/RED]

### Breakdown

| Factor | Score | Trend | Details |
|--------|-------|-------|---------|
| Adoption | [X]/20 | ↗ 📈 | [X]% of features used, achieved time-to-value in [N] days |
| Engagement | [X]/20 | ↘ 📉 | [X]% of team active, usage down 15% last month |
| Support | [X]/20 | ↗ 📈 | [N] tickets last month, avg response time [X] hrs |
| Sentiment | [X]/20 | ↘ 📉 | NPS: 45 (detractor), feedback: "slow to get results" |
| Renewal | [X]/20 | ↗ 📈 | Contract renews [date], expansion opportunity: [value] |

### Trend
- **Last month score:** [X]
- **Trend:** [🟢 Improving / 🟡 Stable / 🔴 Declining]

### Red Flags 🚨 (if applicable)
- [Flag 1]
- [Flag 2]

### Action Items
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

### Expansion Potential
- Current ARR: $[X]
- Expansion opportunity: [Feature/seats/use case]
- Potential uplift: $[X] (target close date: [date])
```

## Example (SaaS Startup Customer)
```
## Health Score: Acme Corp

**Score: 72/100** → 🟡 YELLOW

### Breakdown
| Factor | Score | Details |
|--------|-------|---------|
| Adoption | 14/20 | 70% of features used, 60 days to value |
| Engagement | 12/20 | 8 of 15 seats active (declining), usage down 10% |
| Support | 18/20 | 2 tickets/mo (normal), fast resolution |
| Sentiment | 10/20 | NPS: 35, "slow ROI", considering alternative |
| Renewal | 18/20 | $50K ARR, renews in 6 months, growth opportunity: +$15K |

### Trend
- Last month: 75 → Declining 🔴
- Engagement drop is concerning

### Actions
1. Call CSM to probe: Why is engagement declining?
2. Run ROI analysis — help customer see value faster
3. Host success review in 2 weeks — show expansion path
```
