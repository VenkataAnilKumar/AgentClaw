---
name: pipeline-review
description: Weekly digest of hiring pipeline — stages, movement, blockers, next actions.
args:
agents:
  - hiring-agent
heartbeat: true
heartbeat-schedule: "0 10 * * 2"
posts-to: "#hiring-agent"
---

# Skill: pipeline-review

## Objective
Every week (Tuesday 10:00 AM), summarize hiring pipeline health — where candidates are, what's moving, what's stuck, and recommended next steps.

## Inputs
- Team memory: `hiring.pipeline` (current state of candidates by stage)
- Team memory: `hiring.offers` (pending offers)
- Last 3 skill run contexts (what hiring activities happened this week)
- TEAM.md (current team, open requisitions)

## Procedure
1. **Summarize pipeline state:**
   - Breakdown by stage (applications → screens → technical → team fit → offers)
   - How many at each stage?
   - Movement this week (new entries, advances, exits)?
2. **Flag stalled candidates:**
   - Anyone sitting at same stage >7 days?
   - Offers pending approval >3 days?
   - Ghosted candidates (no response >5 days)?
3. **Highlight movement:**
   - Who advanced this week?
   - Who declined or ghosted?
   - Close rate (offers made → offers accepted)?
4. **Identify blockers:**
   - Missing interviews scheduled?
   - Scorecard reviews pending?
   - Offer approvals stuck?
5. **Propose action items for next week:**
   - Which candidates to advance?
   - Which to follow up?
   - Any requisitions to adjust?
6. **Output:** Pipeline digest artifact for Slack

## Output Format
```
---MEMORY_UPDATE---
key: hiring.pipeline
value: {
  "total_candidates": [N],
  "by_stage": {...},
  "updated": "2024-04-06"
}
---END_MEMORY_UPDATE---

📋 **Weekly Hiring Pipeline Review** — [Week ending DATE]

## Pipeline Summary

**Total Candidates:** 12
**Open Positions:** [N roles]
**Offers Pending:** [N]
**New Candidates This Week:** [N]

### By Stage

| Stage | Count | Target | Delta |
|-------|-------|--------|-------|
| Applied | 6 | 8 | +0 |
| Phone Screen | 3 | 6 | +1 |
| Technical | 2 | 4 | +0 |
| Team Fit | 1 | 2 | +0 |
| Offer | 0 | 2 | +0 |

## Candidate Movement This Week ✅
- **[Candidate 1]** advanced from screen → technical (passed phone call)
- **[Candidate 2]** rejected (declined offer)
- **[Candidate 3]** joined (offer accepted!)

## Stalled Candidates ⏳
- **[Candidate Name]** at phone screen for 8 days (action: schedule technical)
- **[Candidate Name]** pending scorecard review (action: email interviewers)

## Blockers 🚨
- 2 technical interviews pending scheduling
- 1 offer approval stuck (founder unavailable)

## This Week's Action Items

1. **Schedule [N] technical interviews** — Push stalled candidates forward
2. **Follow up on offer from [date]** — Candidate may ghost if we wait >3 days
3. **Recruit [N] more candidates** — Pipeline needs refill (current conversion only 5%)

**Owner:** [Hiring manager name]
**Next review:** [Next Tuesday date]
```

## Example
```
📋 **Weekly Hiring Pipeline Review** — Week of April 8, 2024

## Pipeline Summary
- Total candidates: 12
- Offers pending: 1
- New this week: 2

### By Stage
| Stage | Count |
|-------|-------|
| Applied | 6 |
| Phone Screen | 3 |
| Technical | 2 |
| Team Fit | 1 |

## This Week ✅
- Alex Chen (Founding Engineer) moved to team fit round
- Jamie Rodriguez rejected (accepted competing offer — no hard feelings)
- Morgan Wu accepted offer! Starts May 1

## Stalled ⏳
- Chris Park at phone screen for 9 days (reschedule technical)
- Sam Lee offer pending CEO sign-off for 4 days (follow up)

## Next Week
1. Schedule technical for Chris Park
2. Get CEO to sign offer for Sam Lee
3. Recruit 3 more founding engineers (pipeline weak)
```
