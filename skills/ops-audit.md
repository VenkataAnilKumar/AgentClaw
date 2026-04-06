---
name: ops-audit
description: Deep audit of current vendors, contracts, renewals, and monthly spend.
args:
agents:
  - operations-agent
heartbeat: true
heartbeat-schedule: "0 9 1 * *"
posts-to: "#operations"
---

# Skill: ops-audit

## Objective
Monthly deep dive into all vendors, costs, contracts, and spend — identify waste, find renewal dates, catch overages.

## Inputs
- Team memory: `ops.vendors` (current vendor list and costs)
- Team memory: `ops.spend` (monthly spend tracking)
- RUNWAY.md (current runway and burn rate)

## Procedure
1. **Audit vendor list:**
   - Pull `ops.vendors` from memory
   - For each vendor: name, cost/month, contract end date, purpose, owner
   - Cross-check against actual monthly spend (reconcile)
2. **Identify waste opportunities:**
   - Unused seats (e.g., paying for 10 Slack users, only using 6)?
   - Overly expensive tool? (e.g., $500/mo project management tool → use Notion + GitHub)
   - Overlapping tools? (e.g., two video conferencing tools?)
3. **Flag renewals:**
   - Any contracts expiring in <60 days?
   - Any annual commitments coming due?
4. **Calculate totals:**
   - Total monthly: Fixed + Variable
   - Total YoY if all renewed
   - Compare to budget forecast
5. **Output:** Vendor audit report for ops team and leaders

## Output Format
```
---MEMORY_UPDATE---
key: ops.spend
value: {
  "month": "[YYYY-MM]",
  "total_monthly": [Amount],
  "total_vendors": [N],
  "burn_rate_monthly": [Amount],
  "runway_months": [N],
  "updated": "[Date]"
}
---END_MEMORY_UPDATE---

📊 **Monthly Operations Audit** — [Month]

## Spend Summary

| Category | Monthly | Annual | Owner |
|----------|---------|--------|-------|
| People (salaries + benefits) | $[X] | $[X] | HR |
| Cloud (AWS, GCP, etc.) | $[X] | $[X] | Eng |
| SaaS Tools | $[X] | $[X] | Ops |
| Office/Hardware | $[X] | $[X] | Ops |
| **Total** | **$[X]** | **$[X]** | |

**Burn Rate:** $[X]/month (includes 15% buffer)
**Runway (at current burn):** [N] months

## Vendor Checklist

| Vendor | Cost/Mo | Renewal Date | Status | Action |
|--------|---------|--------------|--------|--------|
| [Tool 1] | $[X] | [Date] | ✅ Active | Renew [months ahead] |
| [Tool 2] | $[X] | [Date] | ⚠️ Expiring | Follow up by [date] |
| [Tool 3] | $[X] | [Date] | 🚨 Expired | [Action] |

## Optimization Opportunities 💰

1. **[Tool Name]** — $[X]/mo
   - Status: Unused (2 users, 0 usage last month)
   - Action: Cancel and save $[X] annually
   - Risk: None

2. **[Tool Name]** — $[X]/mo
   - Status: Overlaps with [other tool]
   - Action: Consolidate or cancel
   - Savings: $[X] annually

## Red Flags 🚨
- [Any unusual spend spike or contract surprise]

## Next Month's Actions
1. [Action 1]
2. [Action 2]
3. [Action 3]
```

## Example
```
📊 **Monthly Operations Audit** — March 2024

## Spend Summary
| Category | Monthly | Annual |
|----------|---------|--------|
| Salaries | $45K | $540K |
| Cloud (AWS) | $8K | $96K |
| SaaS Tools | $3K | $36K |
| **Total** | **$56K** | **$672K** |

Burn Rate: $56K/month
Runway: 18 months

## Vendors
| Tool | Cost | Renewal | Notes |
|------|------|---------|-------|
| Stripe | $500 | Ongoing | Processing fees |
| Slack | $2K | 2024-06-15 | 30 users |
| GitHub | $200 | 2024-05-01 | 5 teams |

## Opportunities
- Slack: Paying for 30 users, only 22 active. Cancel 8 seats = save $400/mo
- Datadog: Can replace with CloudWatch for 60% savings
- Savings potential: $600/mo
```
