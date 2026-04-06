---
name: budget-forecast
description: 12-month cash flow forecast with hiring and spend scenarios.
args:
agents:
  - operations-agent
---

# Skill: budget-forecast

## Objective
12-month rolling forecast of burn rate, cash position, and runway under different scenarios (baseline, aggressive hiring, conservative).

## Inputs
- RUNWAY.md (current cash, burn rate, hiring plan)
- Team memory: `ops.spend` (monthly vendor costs)
- TEAM.md (planned hires and comp)
- OKR.md (planned hiring/spend initiatives)

## Procedure
1. **Current state:**
   - Cash on hand: [from RUNWAY.md]
   - Current burn: [salary + overhead monthly]
   - Runway: [months of cash remaining]
2. **Build 3 scenarios:**
   - **Baseline:** Continue current spending, planned hires only
   - **Aggressive:** Add all dream hires, new tools, marketing spend
   - **Conservative:** Hold hiring, cut discretionary spend 20%
3. **Month-by-month projection:**
   - Fixed costs (salaries) by month (include planned hires)
   - Variable costs (tools, cloud)
   - Cumulative cash balance
   - Runway per month
4. **Highlight inflection points:**
   - When does cash dip below 6-month runway?
   - When do we need fundraising?
5. **Store forecast** — Upsert to `ops.forecast`

## Output Format
```
---MEMORY_UPDATE---
key: ops.forecast
value: {
  "scenario": "baseline|aggressive|conservative",
  "cash_start": [Amount],
  "monthly_burn": [Amount],
  "runway_months": [N],
  "critical_month": "[YYYY-MM or null]",
  "fundraising_needed": true|false,
  "created": "[Date]"
}
---END_MEMORY_UPDATE---

📈 **12-Month Budget Forecast**

## Starting Position
- **Cash on hand:** $[X]
- **Current monthly burn:** $[X]
- **Runway today:** [N] months

## Scenario: Baseline (Current Plan)

| Month | Salaries | Overhead | Total Burn | Cash Balance | Runway |
|-------|----------|----------|------------|--------------|--------|
| Apr 24 | $45K | $3K | $48K | $[X] | [N] mo |
| May 24 | $45K | $3K | $48K | $[X] | [N] mo |
| Jun 24 | $45K + $8K (new hire) | $3K | $56K | $[X] | [N] mo |
| ... | ... | ... | ... | ... | ... |
| Dec 24 | $61K | $3K | $64K | $[X] | [N] mo |

**Baseline Runway:** [N] months | **Cash at Dec 31:** $[X]

## Scenario: Aggressive (All Dream Hires + Marketing)

[Similar table with higher burn]

**Aggressive Runway:** [N] months | **Cash at Dec 31:** $[X]
**⚠️ Critical Point:** [Month] — cash dips below 6-month runway

## Scenario: Conservative (Hold Hiring, Cut Spend 20%)

[Similar table with lower burn]

**Conservative Runway:** [N] months | **Cash at Dec 31:** $[X]

## Recommendations

1. **Fundraising timeline:** If baseline runway < 6 months, start conversations in [month]
2. **Hiring decisions:**
   - Aggressive scenario exceeds cash — recommend deferring [N] hires to Q3
   - Conservative scenario preserves 12-month runway
3. **Revenue impact:** If we hit [revenue milestone] by [month], extend runway [N] months
```

## Example
```
📈 **12-Month Budget Forecast**

## Starting: April 2024
- Cash: $1.2M
- Monthly burn: $56K
- Runway: 21 months

## Baseline (Current Hiring Plan)
- 2 new engineers in Q2 ($160K annual each)
- New ops hire in Q3 ($100K)
- Burn increases: $56K → $64K/mo by June

| Month | Burn | Cash | Runway |
|-------|------|------|--------|
| Apr | $56K | $1.14M | 20 |
| May | $56K | $1.08M | 19 |
| Jun | $64K | $1.01M | 16 |
| Dec | $64K | $650K | 10 |

**Baseline Runway: 10 months by year-end**

## Aggressive (Add 3 more engineers, $20K/mo marketing)
- Burn: $56K → $85K/mo by August
- **Critical month: September** — drops below 6-month runway
- **Recommendation:** Fundraise in July

## Conservative (No new hires, cut discretionary 20%)
- Maintain $48K/mo burn
- **Runway: 25 months by year-end**
```
