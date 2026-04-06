---
name: metric-dashboard
description: Build or update dashboard of key operations and business metrics.
args:
agents:
  - operations-agent
heartbeat: true
heartbeat-schedule: "0 9 * * 1"
posts-to: "#operations"
---

# Skill: metric-dashboard

## Objective
Weekly dashboard of critical ops and revenue metrics — burn rate, runway, CAC, LTV, churn, pipeline health.

## Inputs
- Team memory: `ops.spend` (monthly spend/burn)
- Team memory: `ops.vendors` (vendor count and costs)
- Team memory: `gtm.pipeline` (sales pipeline, win rate, ACV)
- RUNWAY.md (current cash, burn rate)
- TEAM.md (team size)

## Procedure
1. **Calculate key metrics:**
   - **Burn rate:** (Total monthly spend / 1 month) → $/month
   - **Runway:** (Cash on hand / burn rate) → months
   - **Team size:** Count of people on TEAM.md
   - **CAC (Customer Acquisition Cost):** (Sales + marketing spend) / (New customers)
   - **LTV (Life Time Value):** (ACV × Gross margin %) / Monthly churn rate
   - **LTV:CAC ratio:** LTV / CAC (target: 3:1 or higher)
   - **Burn rate trend:** % change vs. last month
   - **Vendor count & total cost:** # of active vendors / total monthly vendor spend
2. **Highlight changes:**
   - Any metric up >10% or down >10% this week?
   - Burns trending up (bad sign)?
   - Churn spiking (product issue)?
3. **Set targets:**
   - Ideal runway: 18–24 months
   - Ideal CAC payback: <12 months
   - Ideal burn: Decline or stable month-over-month
4. **Output:** Slack-friendly metric dashboard

## Output Format
```
---MEMORY_UPDATE---
key: ops.metrics
value: {
  "week": "[YYYY-WXX]",
  "burn_rate": [Amount],
  "runway_months": [N],
  "team_size": [N],
  "ltv_cac_ratio": [X.X],
  "updated": "[Date]"
}
---END_MEMORY_UPDATE---

📊 **Weekly Metrics Dashboard**

## Runway & Burn

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Cash on hand | $[X] | — | — |
| Monthly burn | $[X] | Declining | 📈 Up 5% |
| Runway (months) | [N] | 18–24 | 🟢 Healthy |
| Burn trend | +5% | Stable/declining | 🟡 Monitor |

## Revenue & Customers

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| MRR | $[X] | $[Y] | 🟢 On track |
| Customers | [N] | [N] | 🟢 +[%] |
| Churn rate | [%] | <5% | 🟢 Healthy |
| CAC | $[X] | $[Y] | 🟡 High |
| LTV | $[X] | — | — |
| LTV:CAC | [X]:[Y] | 3:1+ | 🟡 Below target |

## Operations

| Metric | Value | Delta | Status |
|--------|-------|-------|--------|
| Team size | [N] | +[M] | — |
| Vendors | [N] | +1 | 📈 Watch |
| Vendor spend | $[X]/mo | +5% | 🟡 Monitor |
| Utilization | [%] | +[Y]% | — |

## Red Flags 🚨
- [Any concerning metric or trend]

## Action Items
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

**Next review:** [Next Monday]
```

## Example
```
📊 **Weekly Metrics Dashboard** — Week 14, 2024

## Runway & Burn
| Metric | Value | Status |
|--------|-------|--------|
| Cash on hand | $1.1M | — |
| Monthly burn | $56K | 📈 +3% from last week |
| Runway | 19.6 months | 🟢 Healthy |

## Revenue
| Metric | Value | Status |
|--------|-------|--------|
| MRR | $120K | 🟢 On track (+12% YoY) |
| Customers | 45 | 🟢 +2 new this week |
| Churn | 2% monthly | 🟢 Improving |
| CAC | $8K | 🟡 Up $1K (watch) |
| LTV:CAC | 2.1:1 | 🟡 Below 3:1 target |

## Operations
| Metric | Value | Change |
|--------|-------|--------|
| Team size | 18 | +1 (new designer) |
| Vendors | 22 | +1 (Outreach trial) |
| Vendor spend | $15K/mo | +$2K |

## Flag: CAC Trending Up
- CAC was $7K last week, now $8K
- Likely due to new customer acquisition campaign
- Monitor conversion rate next week

## Actions
1. Review CAC by channel — pinpoint which channel got expensive
2. Evaluate Outreach ROI before committing
3. Schedule fundraising conversation (runway still 19 months, but trending down)
```
