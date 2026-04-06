---
name: churn-analysis
description: Analyze why a customer churned or is at risk — root cause, patterns, and prevention recommendations.
args: <customer-name>
agents:
  - customer-success-agent
---

# Skill: churn-analysis

## Objective
Understand why a customer left (or will leave) and recommend systemic changes to prevent future churn.

## Inputs
- Args: customer name
- Team memory: `cs.customers.<customer-slug>` (profile, tenure, contract value)
- Team memory: `cs.churn.<customer_slug>` (reason, date, context)
- Team memory: `cs.interactions.<customer-slug>` (interaction history, support tickets, NPS trends)
- Team memory: `cs.usage.<customer-slug>` (adoption curve, usage patterns, feature utilization)

## Procedure
1. **Interview process:**
   - Reach out if churn recently: "Can we understand what we could have done better?"
   - Analyze support tickets and interactions
   - Identify inflection points: When did sentiment shift?
2. **Root cause analysis (5 whys framework):**
   - Surface reason: "Switching to competitor"
   - Why? "Competitor had feature X we need"
   - Why? "We built feature X but didn't tell them about it"
   - Why? "Onboarding didn't cover that use case"
   - Why? "Playbook was generic, not customized"
   - Root: **Inadequate product education for this use case**
3. **Categorize churn:**
   - Product misfit (they needed something we don't have)
   - Product fit but poor adoption (we didn't help them succeed)
   - Price sensitivity (could have negotiated)
   - Org change (merged, downsized, budgets cut)
   - Competitive loss (they chose competitor)
4. **Pattern analysis:**
   - Is this the 5th customer churning for reason X?
   - What's the pattern? (onboarding gap, feature gap, etc.)
5. **Recommendations:**
   - Fix playbook? (improve onboarding)
   - Build feature? (roadmap item)
   - Improve communication? (usage alerts, success checks)
   - Price optimization? (expand deal earlier)
6. **Store analysis** — Upsert to `cs.churn_analysis`

## Output Format
```
---MEMORY_UPDATE---
key: cs.churn_analysis.<customer-slug>
value: {
  "customer": "[Name]",
  "arr": [Amount],
  "churned_date": "[Date]",
  "tenure_months": [N],
  "root_cause": "[category]",
  "reason": "[detailed reason]",
  "preventable": true|false,
  "systemic_issue": "[if applicable]",
  "analyzed": "[Date]"
}
---END_MEMORY_UPDATE---

## Churn Analysis: [Customer Name]

### Customer Summary
- **ARR:** $[X]
- **Tenure:** [N] months
- **Churn date:** [Date]
- **Health score at churn:** 🔴 RED ([X]/100)

### Timeline of Decline
- **Month 1–3:** 🟢 GREEN (adoption ramping, NPS +45)
- **Month 4–6:** 🟡 YELLOW (engagement plateauing, NPS drops to +15)
- **Month 7–9:** 🔴 RED (usage declining 30%, support tickets spike)
- **Month 10:** ⚫ Churned (switched to [competitor])

### Root Cause Analysis (5 Whys)

**Surface reason:** "Switched to [Competitor X]"

**Why?** "[Competitor] has [Feature Y] that solves our [use case]"

**Why?** "We asked for that feature in month 5, and it never came"

**Why?** "Our feedback wasn't prioritized — product team didn't understand our use case"

**Why?** "Onboarding didn't uncover this use case, so it never made it to product requirements"

**Why?** "Onboarding was generic — sales qualified them for main use case, but didn't probe secondary needs"

**Root Cause:** ✅ **Inadequate discovery in onboarding playbook**

### Churn Categorization
- Type: **Product Feature Gap** (they need something we don't have yet)
- Preventable: **YES** (could have built feature or negotiated roadmap priority)
- Price factor: None (price was acceptable)

### Patterns (if recurring)
- Is this the [Nth] customer who churned for this reason?
- Are we missing [Feature Category] in our product positioning?

### Recommendations

**1. Improve Onboarding Playbook (Priority 1)**
   - Add discovery questions for [use case Y]
   - If customer indicate need for [Feature Y], escalate to product roadmap — may impact renewal
   - Timeline: Update playbook by [date]

**2. Proactive Feature Communication (Priority 2)**
   - Build "[Feature Y] roadmap section" into QBR template
   - If on roadmap: show timeline, offer early access
   - If not on roadmap: acknowledge gap, discuss workaround or timeline
   - Timeline: Implement in next QBR cycle

**3. Engagement Alerts (Priority 3)**
   - When a customer's health drops from GREEN to YELLOW, trigger outreach
   - Health score automation: Alert CSM when score drops >15 points
   - Timeline: Build in next quarter

**4. Product Roadmap Adjustment (Priority 1)**
   - Current: [Feature Y] on roadmap for Q4 2024
   - Recommendation: Accelerate to Q3 + notify [customer type] accounts
   - This prevents [N] similar future churns

### Win-Back Strategy
- Reach out: "We built [Feature Y] in Q3. Would you reconsider using us?"
- If win-back: Onboarding 2.0, 6-month free period to rebuild trust
- Timeline: [Date]

### Summary
**Preventable churn.** Root cause: onboarding playbook didn't discover secondary use case. Fix: add discovery questions to playbook, proactively communicate roadmap, and build engagement alerts for health score drops. Estimated prevention value: $[X] annually (if this pattern stops).
```

## Example (Real Churn)
```
## Churn Analysis: Acme Corp ($50K ARR)

### Timeline
- Months 1–3: Happy (NPS +50, 95% adoption)
- Months 4–6: Plateau (NPS drops to +20, usage flat)
- Months 7–9: Decline (NPS -10, usage down 40%, tickets spike)
- Month 10: Churned to competitor

### Root Cause
Acme wanted to use [Product] for sales forecasting (secondary use case). We onboarded them for CRM use case only. When they asked for forecasting, we didn't have it. Competitor did. They left.

### What We Should Have Done
- Asked in onboarding: "What other metrics matter for your team?"
- If forecasting mattered: Either (a) built quick MVP, or (b) said "Roadmap Q4, want to stick around?" or (c) integrated with [forecasting tool]

### Prevention
- Update onboarding: Ask about 3–5 potential use cases
- When secondary use case identified: Escalate to product or propose workaround
- Result: Retain Acme + $50K + expansion to $70K
```
