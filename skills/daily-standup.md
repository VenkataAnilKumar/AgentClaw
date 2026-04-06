---
name: daily-standup
description: Structured team standup — what's moving, what's stuck, what do you need from me?
args:
agents:
  - founder-agent
---

# Skill: daily-standup

## Objective
Run a standup that takes 15 minutes and produces clear ownership of today's priorities and blockers.

## Inputs
- Heartbeat data from all 4 agents (GTM, Hiring, Ops, CS)
- Last standup notes (who owned what yesterday?)
- Any urgent flags or decisions pending

## Procedure
1. **Precall:** Pull yesterday's action items + today's health digest (from /heartbeat-orchestrator)
2. **Standup format (15 min):**
   - **Wins (2 min):** Celebrate what shipped/closed yesterday
   - **Status per team (8 min):** 
     - GTM: Deals advancing? Pipeline healthy?
     - Hiring: New starts? Stuck positions?
     - Ops: Spend surprises? Runway risk?
     - CS: Churn risk? Expansion wins?
   - **Blockers (3 min):** What's stuck and why? Who needs to help?
   - **Today's top 3 (2 min):** What must happen today?
3. **Document:** Store action items + owners in memory
4. **Post:** Summary to Slack for async visibility

## Output Format
```
---MEMORY_UPDATE---
key: founder.standup.<date>
value: {
  "date": "[Date]",
  "wins": [...],
  "action_items": [...],
  "blockers": [...],
  "top_3": [...],
  "created": "[Date]"
}
---END_MEMORY_UPDATE---

📢 **Daily Standup** — [Date]

## 🎉 Wins from Yesterday
- [Win 1] — [Owner]
- [Win 2] — [Owner]

## Team Updates

### GTM
- **Pipeline:** $[X]M in [N] deals
- **Movement:** [N] closed, [N] advancing, [Stalled]
- **Action:** [Action item]

### Hiring
- **Filled:** 2 of 4 roles
- **Pending:** [N] offers, [N] interviews
- **Blocker:** [Designer role] only 2 in pipeline — need better sourcing
- **Action:** [Action item]

### Operations
- **Burn:** $[X]K/month [Trend]
- **Runway:** [N] months
- **Alert:** [Spend spike / vendor renewal / budget question]
- **Action:** [Action item]

### CS
- **Customers:** [N] healthy
- **Churn risk:** [Customer name] — health RED
- **Expansion:** [N] deals in pipeline
- **Action:** [Action item]

---

## 🚨 Blockers
| Blocker | Owner | Impact | Resolution |
|---------|-------|--------|------------|
| [Blocker 1] | [Who] | Delays [outcome] | Need [decision/resource] |
| [Blocker 2] | [Who] | Stalls [deal] | Need [decision/resource] |

---

## 🎯 Today's Top 3
1. [Action 1] — Owner: [Who]
2. [Action 2] — Owner: [Who]
3. [Action 3] — Owner: [Who]

---

## 📋 Yesterday's Action Items Status
| Action | Owner | Status | Notes |
|--------|-------|--------|-------|
| [Action 1] | [Who] | ✅ Done | — |
| [Action 2] | [Who] | ⏳ In progress | On track |
| [Action 3] | [Who] | 🔴 Blocked | Waiting on [x] |

---

**Next standup:** [Time]
```

## Example
```
📢 **Daily Standup** — Monday Apr 8, 2024

## 🎉 Wins
- Acme Corp deal closed ($150K ACV) — Sales team!
- Alex Chen (Founding Engineer) accepted offer — HR team!

## GTM
- Pipeline: $850K in 12 deals
- Closed: 1 ($150K) 🎉
- Advancing: 3 deals (4 days to close point)
- Stalled: 1 deal (15 days, no response from prospect)
- Action: Follow up on stalled deal today

## Hiring
- 2 of 4 filled: Engineer + Designer
- Ops Manager offer pending CEO sign
- Designer position stuck: only 2 in pipeline
- Action: CEO sign offer, Head of People boost designer sourcing
- Blocker: Designer market is tight — consider contractor vs. full-time?

## Operations
- Burn: $56K/month (up from $54K last week)
- Runway: 20 months ✅
- Alert: Outreach trial ended, need decision on $10K/mo spend
- Action: Founder decide on Outreach (approve, negotiate, or find cheaper)

## CS
- 45 customers all healthy except 1
- Acme Corp (different Acme): health score RED
- Risk: Churn in 30 days if engagement doesn't improve
- Action: CS reach out today + schedule win-back call

## Blockers
| Issue | Owner | Impact | Fix |
|-------|-------|--------|-----|
| Outreach decision | Founder | $10K/mo spend pending | Approve or negotiate by EOD |
| CEO sign-off on offer | CEO | 1 new hire delayed | Sign & send by 10 AM |
| Designer sourcing stuck | Head of People | Hiring at risk | Boost outreach + consider contractor |

## Today's Top 3
1. CEO: Sign ops offer + send to candidate
2. Founder: Decide on Outreach tool
3. CS: Call Acme Corp + assess churn risk

**Next: Anything blocking you?**
```
