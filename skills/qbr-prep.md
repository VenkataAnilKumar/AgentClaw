---
name: qbr-prep
description: Prepare for quarterly business review — agenda, talking points, health summary, renewal/expansion analysis.
args: <customer-name>
agents:
  - customer-success-agent
---

# Skill: qbr-prep

## Objective
Create a detailed QBR deck/agenda that celebrates wins, addresses challenges, and positions expansion opportunities.

## Inputs
- Args: customer name
- Team memory: `cs.customers.<customer-slug>` (profile, ARR, contract terms)
- Team memory: `cs.health_scores.<customer-slug>` (current health score)
- Team memory: `cs.interactions.<customer-slug>` (interaction history, NPS, sentiment)
- Team memory: `cs.usage.<customer-slug>` (feature adoption, usage trends, ROI metrics)

## Procedure
1. **Gather QBR data:**
   - Customer tenure (how long have we worked together?)
   - Key metrics from their perspective (ROI, time saved, users impacted)
   - Usage trends (adoption trajectory, feature utilization)
   - Support history (any blockers?)
   - NPS / satisfaction scores
   - Upcoming contract milestone (renewal date)
   - Expansion opportunities (unused features, new use cases)
2. **Structure QBR agenda:**
   - **Opening (5 min):** Thank you, celebrate wins
   - **Review of last quarter (10 min):** Goals vs. actuals, ROI achieved
   - **Forward look (10 min):** Q4 opportunities, roadmap alignment
   - **Expansion (5 min):** New features, seat growth, new use cases
   - **Renewal (5 min):** Contract renewal timeline, pricing discussion
   - **Close (5 min):** Next steps and frequency of touchpoints
3. **Identify talking points:**
   - Wins to celebrate (quantified ROI, adoption metrics)
   - Challenges to address (support backlog, feature gaps)
   - Expansion opportunities (usage gaps, adjacent use cases)
4. **Prepare renewal strategy:**
   - Renewal date and current terms
   - Proposal: renewal at same price, or increase with expansion?
   - Red flags: If score is yellow/red, probe on satisfaction first
5. **Output:** QBR prep deck or summary

## Output Format
```
---MEMORY_UPDATE---
key: cs.qbr_prep.<customer-slug>
value: {
  "customer": "[Name]",
  "quarter": "[YYYY-QX]",
  "scheduled": "[Date]",
  "attendees": [...],
  "preparation_complete": true,
  "created": "[Date]"
}
---END_MEMORY_UPDATE---

📊 **QBR Prep: [Customer Name]**

## Customer Summary
- **ARR:** $[X]
- **Tenure:** [N] years / [N] quarters with us
- **Health:** 🟢 GREEN / 🟡 YELLOW / 🔴 RED
- **Contract renews:** [Date] ([N] months away)
- **Key contacts:** [Names]

## QBR Agenda (45 minutes)

### 1. Opening & Wins (5 min)
**Message:** "Amazing quarter of growth, [customer]. Here's what's resonated."

**Talking points:**
- Usage up [X]% (show chart)
- Team expansion: You've grown from [X] to [Y] users
- [Specific feature] has driven [value quantified]

### 2. Q3 Review (10 min)
**Agenda:** Review goals you set and actual outcomes

| Goal | Target | Actual | Status |
|------|--------|--------|--------|
| [Goal 1] | [Target] | [Actual] | ✅ Exceeded / 🟡 Met / 🔴 Missed |
| [Goal 2] | [Target] | [Actual] | ... |

**ROI Summary:**
- Time saved: [X] hours/month = $[Y] value
- Revenue impact: $[Z] (from [use case])
- Team productivity: [%] lift

### 3. Q4 Forward Look (10 min)
**Message:** "Here's what we see in the market and where we're heading."

**Roadmap items relevant to this customer:**
- [Feature 1] — launches [month], solves [their pain]
- [Feature 2] — early access opportunity for [use case]
- [Integration] — we're building [integration], ready for you in [month]

**Customer goals for Q4:**
- What do you want to accomplish?
- Where do you see us adding value?
- Any pain points we should address?

### 4. Expansion Opportunity (5 min)
**Message:** "We see an opportunity to expand your usage and value."

**Opportunity 1: [Seat growth]**
- Current: [N] users at $[price/user]
- Proposed: [N+X] users
- Additional MRR: $[X]
- ROI: [use case]

**Opportunity 2: [New feature/product]**
- Solves: [their new problem]
- Typical uplift: $[X]/year
- Pilot options available

**Opportunity 3: [Use case expansion]**
- You're using [feature] for [use case]
- Could also use for [new use case] = [additional value]

### 5. Renewal Conversation (5 min)
**Current terms:**
- ACV: $[X]
- Contract end: [Date]
- Recent changes: [pricing/product]

**Renewal proposal:**
- With expansion: $[X+Y] (if they say yes to opportunities)
- Or flat renewal: $[X] (if expansion not ready)
- Discount: [If applicable, e.g., annual commitment]

**Timeline:** Formal quote by [date], signature by [date]

### 6. Close & Next Steps (5 min)
**Confirm:**
- Expand in [opportunity]? Y/N
- Next meeting date: [Date]
- Who should we loop in? [Contacts]

---

## Pre-QBR Checklist
- [ ] Pull last 3 months usage data
- [ ] Calculate ROI/impact metrics
- [ ] Review support ticket history
- [ ] Check NPS response
- [ ] Identify expansion opportunities
- [ ] Draft renewal terms
- [ ] Confirm attendees
- [ ] Send customer pre-read 48 hours before
```

## Example (SaaS QBR)
```
📊 **QBR Prep: Acme Corp**

## Q3 Review
| Goal | Target | Actual | Status |
|------|--------|--------|--------|
| Adopt [Feature A] | 80% of team | 70% of team (strong!) | 🟡 Close |
| Time savings | 20 hrs/mo | 25 hrs/mo | ✅ Exceeded |
| Reduce support tickets | -30% | -25% | 🟡 Close |

**ROI Summary:**
- Time saved: 25 hrs/mo × $75/hr = $1,875/month in value
- Support cost reduction: $400/month
- **Total quarterly value: ~$7,000**

## Expansion Opportunities
1. **Seat growth:** Add 5 more users (+$500/mo) → $6,000/year
2. **Feature expansion:** Use [Feature B] for new use case → $2,000/year uplift
3. **Total expansion potential: $8,000/year**

## Renewal Conversation
- Current: $60K/year
- With expansion: $68K/year
- New team size justifies pricing
- 2-year commitment offers 5% discount
```
