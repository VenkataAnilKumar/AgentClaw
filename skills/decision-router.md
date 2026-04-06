---
name: decision-router
description: Answer any ad-hoc question by routing to right agent, synthesizing insights from GTM, Hiring, Ops, CS.
args: <question>
agents:
  - founder-agent
---

# Skill: decision-router

## Objective
When a founder asks any question, route to the right agent(s), synthesize the answer, and recommend what to do.

## Inputs
- Args: founder's question (e.g., "Should we hire this sales manager?", "Why is Acme churning?")
- All 4 agents: GTM, Hiring, Ops, CS
- Context files: RUNWAY.md, TEAM.md, COMPANY.md

## Procedure
1. **Parse the question:**
   - What's the actual decision behind the question?
   - Who cares / who's affected?
   - What data is needed?
2. **Route to agents:**
   - GTM context? (deals, pipeline, territory)
   - Hiring context? (roles, comp, team)
   - Ops context? (spend, runway, metrics)
   - CS context? (customers, churn, expansion)
3. **Gather answers:**
   - Call each relevant agent skill
   - Synthesize data
   - Identify tradeoffs
4. **Recommend:**
   - What should the founder do?
   - Why (data-driven + instinct)
   - What's the downside?
   - Timeline for decision
5. **Output:** Concise recommendation + reasoning

## Output Format
```
## Decision: [Question]

### Context
[2–3 bullets explaining why this matters]

### Options
**Option 1: [Action A]**
- Pros: [Pro 1], [Pro 2]
- Cons: [Con 1], [Con 2]
- Runway impact: [+/- months]
- Timeline: [When]

**Option 2: [Action B]**
- Pros: [Pro 1], [Pro 2]
- Cons: [Con 1], [Con 2]
- Runway impact: [+/- months]
- Timeline: [When]

### Recommendation
**→ [Action A]** because [reason 1], [reason 2], [reason 3]

**Red flag to watch:** [If applicable]

**Next step:** [Who should do what by when]
```

## Example (Real Decisions)

### Example 1: Hiring Decision
```
## Decision: Should we hire this sales manager at $180K?

### Context
- We need sales leadership (currently sales team reporting to CEO)
- We're ramping GTM (target 3x revenue this year)
- Current burn: $56K/mo, runway: 20 months

### Options

**Option 1: Hire the sales manager at $180K**
- Pros: Leadership scale, free up CEO time, proven track record in our space
- Cons: Adds $15K/mo to burn, reduces runway to 18 months
- Runway impact: -2 months
- Risk: Needs 3 months to ramp, may slow near-term pipeline output

**Option 2: Wait 3 months (hit revenue target first)**
- Pros: Preserve runway longer, prove revenue model before scaling GTM
- Cons: Sales team continues reporting to overloaded CEO, may miss hiring window

### Recommendation
→ **HIRE NOW** — reasons:
1. Revenue trajectory supports it (on track for $120K MRR)
2. Runway still healthy at 18 months (above 12-month minimum)
3. This is a hard-to-find candidate; miss her and we hire slower later
4. CEO time unblocks +$20K/mo value (conservative estimate)

**Gate:** Creates `hire` gate (standard for $15K/mo+ add)
**Next:** Follow up offer by tomorrow
```

### Example 2: Customer Decision
```
## Decision: Should we build Feature X that Acme is asking for?

### Context
- Acme: $50K ARR, health score 🔴 RED, at churn risk
- They need Feature X for secondary use case
- Competitor has Feature X; that's why they're considering leaving
- Feature X is on product roadmap for Q4 (4 months away)

### Options

**Option 1: Accelerate Feature X to Q2 (6 weeks)**
- Pros: Save $50K customer, likely expansion to $60K+, sets precedent for customer-driven roadmap
- Cons: Delays other features, dev team capacity hit, could be 80/20 that doesn't move needle
- Runway impact: None (accelerates revenue)
- Risk: Opens door to every customer requesting priority

**Option 2: Offer workaround (integrate with [competitor] for Feature X)**
- Pros: Fast (2 weeks), preserves roadmap, still keeps Acme
- Cons: Workaround is clunky, Acme may still churn
- Runway impact: +potential $50K if they stay

**Option 3: Negotiate longer contract + roadmap priority**
- Pros: Buy time (know we're building it), extend ACV
- Cons: Feels transactional, Acme may still leave

### Recommendation
→ **Option 2 (Workaround)** — reasons:
1. Preserves feature roadmap (critical for product strategy)
2. Fast to market (2 weeks) = shows good faith
3. If workaround is good enough, Feature X is deprioritized anyway
4. If Acme still churns despite workaround, it was about feature fit not urgency

**Next step:** CS calls Acme today with workaround proposal + timeline for Feature X in Q4
```

### Example 3: Spending Decision
```
## Decision: Buy Outreach ($10K/mo) or stick with Lemlist ($1K/mo)?

### Context
- Sales team wants Outreach (best-in-class outbound)
- Lemlist + HubSpot combo does ~80% of what Outreach does
- Current spend: $15K/mo total SaaS
- Adding $10K/mo = 18% increase in burn

### Options

**Option 1: Buy Outreach flagship ($10K/mo)**
- Pros: Best tooling, team loves it, full feature set instantly
- Cons: Adds $10K/mo to burn (reduces runway by 2.1 months), we don't need all features yet
- Runway impact: -2.1 months

**Option 2: Negotiate Outreach down to $6K/mo**
- Pros: Get 90% of value at better unit cost
- Cons: May not get all features, negotiation takes 1–2 weeks
- Runway impact: -1.3 months

**Option 3: Stick with Lemlist + HubSpot ($4.2K/mo)**
- Pros: Lowest cost, still covers outbound workflows
- Cons: Worse UI/UX, may frustrate sales team
- Runway impact: None (already in budget)

### Recommendation
→ **Option 2 (Negotiate Outreach to $6K/mo)** — reasons:
1. Best team happiness / cost tradeoff
2. At $6K, ROI is clear (need ~$15K of pipeline to justify)
3. Takes 1–2 weeks negotiation, worth it
4. If negotiation fails, fallback to Lemlist

**Gate:** Creates `spend` gate for $6K/mo (if approved) — final budget guard
**Next:** Sales VP reaches out to Outreach AE today, negotiate by Friday
```
