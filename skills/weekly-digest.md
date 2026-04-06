---
name: weekly-digest
description: Weekly GTM digest summarizing pipeline, what's working, what to kill, and this week's 3 priorities.
args:
agents:
  - gtm-agent
heartbeat: true
heartbeat-schedule: "0 9 * * 1"
posts-to: "#team-updates"
---

# Skill: weekly-digest

## Objective
Every Monday 9am, summarize GTM health, highlight wins, flag concerning trends, and propose priorities for the coming week.

## Inputs
- Team memory: `gtm.icp` (what we're targeting)
- Team memory: `gtm.positioning` (current messaging)
- Team memory: `gtm.pipeline` (prospects by stage)
- Last 5 skill run contexts (what activities happened this week)
- HubSpot integration (if installed): current pipeline snapshot, deals by stage
- Company email inbox scout (if available): replies to campaigns, RFQs

## Procedure
1. **Summarize pipeline health:**
   - Breakdown by stage (leads → trials → pilots → customers)
   - Deals closed this week
   - Deals stalled >7 days (red flag)
   - Avg. deal size, sales cycle duration
2. **Identify what's working:**
   - Which channels generated meetings this week? (Cold email? Content? Referrals?)
   - Which messages resonated? (ICP definition drove 3 responses vs. 0 for positioning)
   - Quick wins: use these messages more aggressively
3. **Flag what to kill or pause:**
   - Channels with <1% conversion (pause for 2 weeks, then retry)
   - Messages with 0 engagement (rewrite or archive)
   - Prospects outside ICP (politely decline, refer elsewhere)
4. **Propose 3 priorities for this week:**
   - Next highest-value activity (e.g., "Reach out to 10 warm intros from [partner]")
   - One experiment (e.g., "Test LinkedIn AdLib messaging in 20 outreaches")
   - One blockage to resolve (e.g., "Follow up with stalled prospect X")
5. **Output:** Digest artifact formatted for Slack channel

## Output Format
```
📊 **Weekly GTM Digest** — [Week ending DATE]

### Pipeline Summary
- **Total prospects:** 47
- **In pipeline:** $[ARR] potential
- **Meetings this week:** 3
- **At risk:** 2 (stalled >7 days)

**By Stage:**
| Stage | Count | Value | Trend |
|-------|-------|-------|-------|
| Leads | 20 | --- | ↗ +5 |
| Trials | 12 | $120K | → same |
| Pilots | 8 | $240K | ↗ +2 |
| Won | 7 | $420K ARR | ↗ |

### What Worked This Week ✅
- **Cold email to [ICP profile]:** 2 meetings from 30 outreaches (6.7% response)
- **[Content piece title]:** 15 visits → 2 signups
- **[Referral partner name]:** 1 warm intro → 1 pilot closed

### What Flopped This Week ❌
- **LinkedIn mass outreach:** 0 responses from 50 outreaches (pause for 2 weeks)
- **[Message version]:** 0 engagement (rewrite or kill)

### This Week's 3 Priorities

1. **[Priority 1]** — [Rationale + expected impact]
2. **[Priority 2]** — [Rationale + expected impact]
3. **[Priority 3]** — [Rationale + expected impact]

**Owner:** [Person from TEAM.md]
```

## Example

```
📊 **Weekly GTM Digest** — Week ending April 12, 2024

### Pipeline Summary
- **Total prospects:** 47
- **In pipeline:** $890K potential
- **Meetings this week:** 3
- **At risk:** 2

### What Worked This Week ✅
- LinkedIn cold message variant B (intro + Calendly): 4 meetings from 50 outreaches
- Blog post on "Founder operations": 200+ visits from SEO

### What Flopped This Week ❌
- Generic cold email copy: 0 responses (pause)

### This Week's 3 Priorities
1. Double down on LinkedIn variant B — test with 100 more targets this week
2. Guest post on [Industry Blog] — drives warm intent traffic
3. Follow up with 3 pilots that went silent >10 days
```
