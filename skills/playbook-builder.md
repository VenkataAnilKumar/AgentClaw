---
name: playbook-builder
description: Create repeatable playbook for customer onboarding, expansion, renewal, or churn recovery.
args: <playbook-type>
agents:
  - customer-success-agent
---

# Skill: playbook-builder

## Objective
Define a step-by-step, week-by-week playbook that any CS rep can execute without custom tailoring per customer.

## Inputs
- Args: playbook type (onboarding, expansion, renewal, churn-recovery)
- Team memory: `cs.playbooks` (existing playbook templates)
- Team memory: `cs.interactions` (interaction history across customers)
- TEAM.md (CS team size, capacity)

## Procedure
1. **Choose playbook type:**
   - **Onboarding:** First 90 days from contract signature to "time-to-value achieved"
   - **Expansion:** Identifying and closing expansion deals (upsell, cross-sell, seat growth)
   - **Renewal:** 90 days pre-renewal through contract re-signature
   - **Churn recovery:** After churn, win-back campaign (6 months out)
2. **Define playbook structure:**
   - **Phase 1:** Kickoff [weeks 1–2]
   - **Phase 2:** Enablement [weeks 3–6]
   - **Phase 3:** Value realization [weeks 7–12]
   - **Phase 4:** Success review + next steps [week 13+]
3. **Detail each phase:**
   - Week-by-week milestones
   - Owner (CSM, product, sales?)
   - Deliverables (docs, training, calls)
   - Success criteria (KPIs, gates)
   - Red flags to watch for
4. **Operationalize:**
   - Create template in CRM
   - Define roles and responsibilities
   - Set up automation (task reminders, email sequences)
   - Measure outcomes (% of customers completing playbook on time?)
5. **Store** — Upsert to `cs.playbooks.<type>`

## Output Format
```
---MEMORY_UPDATE---
key: cs.playbooks.<playbook_type>
value: {
  "type": "[Playbook type]",
  "phases": [N],
  "duration_weeks": [N],
  "success_rate_target": "[%]",
  "created": "[Date]"
}
---END_MEMORY_UPDATE---

📋 **Playbook: [Playbook Type]**

## Overview
- **Duration:** [N] weeks
- **Owner:** [Role]
- **Goal:** [Objective]
- **Success criteria:** [KPI targets]
- **Template:** Use in [CRM system] for every customer

---

## Phase 1: [Phase Name] (Weeks 1–N)

### Objectives
- [Objective 1]
- [Objective 2]
- [Objective 3]

### Key Milestones

#### Week 1: Kickoff
**Owner:** [CSM]
**Activities:**
- [ ] Send welcome email + agenda
- [ ] Schedule kickoff call with [attendees]
- [ ] Share [onboarding doc]
- [ ] Set up [tool/access]

**Deliverable:** Kickoff call completed ✓
**Red flag:** Customer doesn't attend = escalate

---

#### Week 2: [Next milestone]
**Owner:** [PM/CSM]
**Activities:**
- [ ] Deliver training [topic]
- [ ] Set up [integration]
- [ ] Collect [feedback]

**Deliverable:** Training completed + [feedback form] filled
**Red flag:** <50% adoption after training = offer 1-on-1

---

### Success Metrics (Phase 1)
- [ ] [KPI 1] (e.g., onboarding call completed by day 3)
- [ ] [KPI 2] (e.g., first user activated by day 7)
- [ ] [KPI 3] (e.g., admin trained by day 14)

---

## Phase 2: [Phase Name] (Weeks 3–N)

[Similar structure — weekly milestones, owners, deliverables, red flags]

---

## Phase 3: [Phase Name] (Weeks 7–N)

[Similar structure]

---

## Phase 4: [Phase Name] (Week 13+)

**Owner:** [CSM]
**Activities:**
- [ ] Schedule success review call
- [ ] Measure ROI: [KPI 1], [KPI 2]
- [ ] Identify expansion opportunities
- [ ] Schedule next quarterly touchpoint

**Deliverable:** Success review call + expansion proposal
**Next phase:** Transition to [next playbook]

---

## Playbook Dashboard

**Tracking template (CRM automation):**

| Customer | Start | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Status |
|----------|-------|---------|---------|---------|---------|--------|
| [A] | 1/1 | ✅ 1/15 | ✅ 2/12 | ✅ 3/15 | → | On track |
| [B] | 1/8 | ✅ 1/22 | ⏳ In progress | — | — | On track |
| [C] | 1/15 | ❌ Missed | — | — | — | **At risk** |

---

## Handling Exceptions

**If a milestone is missed:**
- Week 1–2: Customer is busy (normal) → re-schedule
- Week 3–6: Red flag → escalate to manager + re-engage
- Week 7+: Major churn risk → intensive support

---

## Success Rate & Optimization

**Target:** [X]% of new customers complete playbook on schedule
**Measurement:** Track every customer through phases
**Review:** Monthly — any patterns? Adjust playbook
```

## Example (Onboarding Playbook)
```
📋 **Playbook: 90-Day Onboarding**

## Overview
- Duration: 12 weeks
- Owner: Customer Success Manager
- Goal: Get customer to achieve core use case value
- Success: 90% of new customers reach "time-to-value" milestone on day 30

---

## Phase 1: Kickoff (Weeks 1–2)

### Weeks 1–2 Milestones
- Day 1: Welcome email + dashboard access
- Day 3: Kickoff call (customer + [CSM] + [product person])
  - Confirm use case
  - Review success criteria
  - Assign CSM + set meeting cadence
- Day 7: Deliver training video + live Q&A
- Day 14: Admin trained on [system admin tasks]

### Success Criteria
- [ ] 100% of stakeholders trained by day 14
- [ ] Dashboard accessed by day 3
- [ ] Success criteria documented

---

## Phase 2: Enablement (Weeks 3–6)

### Week 3: Live training
- [ ] 1-hour group training on [core feature]
- [ ] Recording for async viewing

### Week 4: First workflow
- [ ] Guide customer through [core workflow]
- [ ] Hands-on support from CSM
- [ ] Success: First [workflow output] completed

### Week 5: Feedback
- [ ] Did workflow work? Any blockers?
- [ ] Iterate if needed

### Week 6: Second workflow
- [ ] Guide customer through [secondary workflow]
- [ ] Repeat iterative feedback loop

### Success Criteria
- [ ] 60% of target team users activated by week 4
- [ ] First [workflow output] created by week 5
- [ ] Zero blocked tickets

---

## Phase 3: Value Realization (Weeks 7–12)

### Week 7–10: Reinforcement
- [ ] Weekly check-ins (reduce cadence gradually)
- [ ] Share success stories from similar customers
- [ ] Identify expansion opportunities

### Week 11–12: Success review
- [ ] Review metrics: adoption, usage, ROI vs. goals
- [ ] Celebrate wins
- [ ] Propose expansion or renewal upsell

### Success Criteria
- [ ] 80%+ of  target team activated
- [ ] Customer has achieved core success metric
- [ ] NPS ≥ +40

---

## Playbook Execution

Every new customer gets assigned to playbook on day 1. CSM executes weekly — no surprises, repeatable.
```
