---
name: heartbeat-orchestrator
description: Daily digest synthesizing GTM, Hiring, Ops, and CS health in one place.
args:
agents:
  - founder-agent
heartbeat: true
heartbeat-schedule: "0 7 * * *"
posts-to: "#founder"
---

# Skill: heartbeat-orchestrator

## Objective
Every morning (7 AM), pull latest data from GTM, Hiring, Ops, and CS agents and post one concise health summary for the founder.

## Inputs
- Calls: /gtm-agent /pipeline-digest
- Calls: /hiring-agent /pipeline-review
- Calls: /operations-agent /metric-dashboard
- Calls: /customer-success-agent /health-score (for top customers)
- RUNWAY.md (cash, burn rate)

## Procedure
1. **GTM health:** 
   - Pipeline stage breakdown
   - Deals advancing / stalled
   - Win rate trend
   - Revenue forecast (actuals vs. target)
2. **Hiring health:**
   - Open positions + fill time
   - New starts this week
   - Any offers pending
   - Pipeline stalled >7 days?
3. **Ops health:**
   - Monthly burn rate + trend
   - Runway (months)
   - Spend changes or vendor red flags
4. **CS health:**
   - Customer count
   - Any red flags (churn risk, support spike)
   - Expansion pipeline
5. **Synthesis:**
   - What's the 1–2 thing founder should focus on?
   - Any decisions needed today?
6. **Output:** Slack-friendly digest with clear "next step"

## Output Format
```
🏥 **Health Report** — [Date]

## GTM Status
✅ **Green** | Pipeline: $[X]M in [N] deals
- [N] deals in close (target: [N])
- [N] deals advancing (up from [N] last week)
- 1 deal **stalled** >14 days — reach out to [contact]
- Revenue forecast: [Y]% of target

## Hiring Status
🟡 **Yellow** | 2 of 4 positions filled
- [Name] started [role] — welcome! 🎉
- [N] offers pending: [Names]
- 1 position stalled: [Role] — improve outreach?

## Operations Status
✅ **Green** | Burn: $[X]K/month, Runway: [N] months
- Spend up 3% from last week (normal)
- 1 vendor renewal coming [date] — renegotiate?

## Customer Success Status
✅ **Green** | [N] customers, [N] expansion opportunities
- 1 health score dropped 🔴 RED — [customer name] at risk
- Expansion pipeline: $[X]K potential (target [N] closes this quarter)

---

**🎯 Your Focus Today:**
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

**Gates Pending:** [N] spend approvals, [N] hiring approvals
**Decisions Needed:** [N]

Next: Want a deeper dive on anything?
```

## Example
```
🏥 **Health Report** — Mon Apr 8, 2024

## GTM: ✅ Green
- $850K pipeline in 12 deals
- 3 advancing (vs 1 stalled 15 days)
- On track for $120K MRR target

## Hiring: 🟡 Yellow
- Founded Engineer hired! (Alex Chen starts May 1)
- Designer stuck — only 2 candidates in pipeline
- Ops Manager offer pending CEO sign-off (3 days)

## Operations: ✅ Green
- Burn: $56K/month (up $2K from new hire)
- Runway: 20 months
- Outreach pilot adding $10K/mo — approve?

## Customer Success: ✅ Green
- 45 customers, healthy
- 1 churn risk: Acme Corp (health 🔴).

---

🎯 **Your Focus:**
1. Approve Outreach ($10K/mo) or find cheaper alternative
2. Sign ops offer to unblock
3. Call Acme to understand churn risk
```
