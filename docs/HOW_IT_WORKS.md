---
description: How AgentClaw Phase 2 actually works — principles, patterns, and mental models
---

# How to Think About AgentClaw Phase 2

## Core Insight

A **startup is just a series of decisions** under uncertainty and time pressure. AgentClaw Phase 2 automates the **information gathering** so founders can focus on **decision-making**.

Each specialist agent (GTM, Hiring, Ops, CS) solves this:
> Founder asks question → Agent pulls relevant data → Agent recommends action → Gate awaits approval

This reduces decision cycle from "days" to "hours."

---

## Three Layers of Agents

### Layer 1: Domain Specialists
Each agent is an expert in ONE domain who reads like a veteran:

- **GTM Agent** (VP Sales / VP Growth) — "Here's our pipeline health and what we should do about it"
- **Hiring Agent** (Director of People) — "That comp is in market range; we can afford it if runway stays 18+ months"
- **Operations Agent** (CFO) — "That tool costs $10K/mo but pays back in 2 months; approve it"
- **CS Agent** (VP CS) — "Acme scored RED last week; they're at churn risk; here's what to do"

Each agent has:
- **A memory category** (e.g., `gtm.pipeline`) to avoid stepping on others' toes
- **4 domain-specific skills** to solve common problems
- **Gate authority** (e.g., hiring can gate offers, ops can gate spend)
- **A clear POV** ("Here's what I recommend")

### Layer 2: The Founder Agent
Meta-layer that synthesizes all 4 specialists into founder-friendly answers:

- **Listens** to any question (no keywords needed)
- **Routes** to relevant specialists in parallel
- **Synthesizes** their answers into one recommendation
- **Recommends** what founder should actually do
- **Gates** require approval so founder stays informed

Founder Agent is the "executive dashboard" — you don't need to talk to 4 people anymore, just one (who coordinates them).

### Layer 3: Scheduled Heartbeats
Agents auto-run on schedule to push data out regularly:

```
7 AM:  @founder-agent /heartbeat-orchestrator
       → Daily 5-min digest posted to #founder

10 AM: @founder-agent /daily-standup
       → Full team standup structure

1st of month: @operations-agent /ops-audit
              → Monthly spend review

Weekly: @hiring-agent /pipeline-review
        → Candidate movement + bottlenecks

Weekly: @customer-success-agent /health-score
        → Red flags on customer churn risk
```

So founder **doesn't have to ask** — intelligence is pushed to them.

---

## Mental Model: Runbook vs. Playbook

**Traditional approach:** Founder keeps runbooks in head
- "How do I hire an engineer?" → Founder remembers 20 steps
- "What's my burn rate?" → Founder asks 5 people
- "Should I discount this deal?" → Founder runs math in spreadsheet

**AgentClaw approach:** Each agent is a playbook
- "How do I hire?" → `/hiring-agent /interview-plan` runs playbook
- "What's burn?" → `/operations-agent /metric-dashboard` pulls live data
- "Should I discount?" → `/gtm-agent /deal-analysis` runs analysis

**Result:** Decisions go from slow + error-prone to fast + data-backed.

---

## How Agents Think (Their Process)

### GTM Agent Thinking
```
Founder: "Should we discount this $200K deal 30%?"

Agent thinks:
1. Pull deal data: Who's the customer? ACV? History?
2. Check comp plan: What's territory commission target?
3. Pull pipeline: Are we ahead/behind forecast?
4. Calculate: Does 30% discount help us hit quota?
5. Analyze margin: Does deal still make unit econ sense?
6. Recommend: "No — we're ahead of forecast, margin is thin. 
   Counter at 15% and make it a 2-year deal instead."
```

### Hiring Agent Thinking
```
Founder: "Can we offer this engineer $180K + 0.5%?"

Agent thinks:
1. Check comp range: Is $180K in market? ✓
2. Check equity: Is 0.5% standard for founding engineer? ✓
3. Check runway: Does this hire break runway? 
   → Read RUNWAY.md: $1.2M, $56K burn/mo
   → New hire = +$15K/mo = $56K → $71K
   → Cash runs out: 16.9 months (below 12-month minimum)
   → Recommendation: "Approve — on the bleeding edge of runway,
      but we're on track to revenue; extended runway likely Q2"
4. Gate: Create `hire` gate for approval
```

### Operations Agent Thinking
```
Founder: "Should we buy Outreach for $10K/mo?"

Agent thinks:
1. Research: What does Outreach do? Cost-benefit?
2. Benchmark: What alternatives exist? (Salesloft $8K, Lemlist $1K)
3. Calculate ROI: Need $15K pipeline to justify $10K/mo spend
4. Budget impact: Does $10K/mo break runway? 
   → Current burn $56K + $10K = $66K → runway drops 2.1 months
5. Recommend: "Negotiate Outreach to $6K/mo to reduce risk.
   If negotiation fails, consider Lemlist + HubSpot combo instead."
6. Gate: Create `spend` gate if negotiation lands at $6K+
```

### CS Agent Thinking
```
Founder: "Acme Corp is acting cold lately. What's going on?"

Agent thinks:
1. Pull health score: 72/100 (YELLOW, was 85 last month)
2. Check usage: Down 15% last 2 weeks
3. Check support tickets: Spike to 4/week (normal is 1/week)
4. Check sentiment: Last NPS response: "Slow to see value"
5. Root cause: They're trying to use feature X, 
   which we don't have yet
6. Recommend: "Score is YELLOW, not RED. Act fast:
   (1) CS call to understand use case
   (2) Show feature on roadmap
   (3) Offer integration workaround
   (4) Schedule success review in 2 weeks"
7. If churn happens: `/churn-analysis` to extract learning
```

### Founder Agent Thinking
```
Founder: "We're running out of time on hiring. 
Should we hire a recruiting agency?"

Agent routes:
1. To hiring-agent: Pipeline health check
   → "Designer stuck 3 months, only 2 candidates"
2. To operations-agent: Budget check
   → "Recruiting agency costs $30K; runway still 18 months"
3. To gtm-agent: Does GTM slow if we don't hire?
   → "Sales on track; not critical path"
4. Synthesizes:
   → "Recruiting agency is worthwhile hedge.
      (a) Designer role is critical path
      (b) Current pipeline stalled
      (c) Budget impact is low (only 0.5 months runway)
      (d) Recommend: Try agency + internal sourcing for 3 months"
5. Gate: If agency costs >$10K/mo, create `spend` gate
```

---

## Data Flows

### Real-Time Flow (Human-Triggered)
```
Founder: @claw Should we close this deal?
   ↓
Router: This is GTM question → gtm-agent
   ↓
GTM Agent: 
  - Read: deals.database, won_deals_history
  - Analyze: discount impact, quota impact, margin
  - Store: decision in gtm.decisions memory
  - Recommend: "Yes/No + reasoning"
   ↓
Gate (if applicable): Create `win` gate awaiting approval
```

### Scheduled Flow (Push)
```
7 AM daily:
   ↓
Founder Agent /heartbeat-orchestrator
   ↓
Parallel calls to:
  - gtm-agent /pipeline-digest → pipeline health
  - hiring-agent /pipeline-review → hiring status
  - operations-agent /metric-dashboard → KPIs
  - customer-success-agent /health-score (top 10) → churn risk
   ↓
Synthesize into 5-min digest
   ↓
Post to #founder
```

### Reactive Flow (Scheduled Skills)
```
Mon 9 AM: ops-audit runs (monthly)
Wed 9 AM: cs health-score runs (weekly)
Fri 9 AM: gtm pipeline-digest runs (weekly)
```

Each auto-posts findings to relevant channel (#operations, #sales, etc.)

---

## Gates: The Founder's Approval Mechanism

Gates are the **guardrails** that keep agents from overstepping:

### Three Gate Types

**`win` Gate (GTM)** — Deal closure with material terms
```
🚪 Gate: Close Deal
Name: Acme Corp
Deal size: $200K ACV
Discount: -30% (below $250K minimum)
Term: 3-year
Margin impact: -5 points

[Approve] [Reject] [Negotiate better terms]
```

**`hire` Gate (Hiring)** — All job offers
```
🚪 Gate: Approve Hire
Name: Alex Chen
Role: Founding Engineer
Salary: $180K
Equity: 0.5%
Runway impact: -2.1 months (to 16.9 mo)

[Approve] [Reject] [Negotiate salary]
```

**`spend` Gate (Operations)** — Any expense >$2K/month or vendor change
```
🚪 Gate: Approve Spend
Vendor: Outreach
Cost: $10K/month (negotiated from $12K)
Budget impact: -1.8 months runway
Payback period: 2 months (if team productivity +25%)

[Approve] [Reject] [Request alternative]
```

**Gate Rules:**
- Agents **prepare** the gate (with full analysis)
- Founder **decides** (with one click)
- System **executes** (no manual follow-up)

---

## Memory: How Agents Learn from Past Decisions

Each agent maintains a memory category to build institutional knowledge:

### GTM Memory
```
gtm.pipeline → Current deals by stage
gtm.customers → Account profiles, history, notes
gtm.comp_plans → Territory comp structures + benchmarks
gtm.decisions → Past deal decisions (discounts, terms, outcomes)
```

When a founder asks "Should we discount this deal?", GTM Agent:
1. Looks at new deal
2. Checks memory: Have we discounted this customer before?
3. Checks memory: Have we seen this scenario succeed/fail?
4. Recommends based on pattern

### Hiring Memory
```
hiring.comp_ranges → Market rates by role + region
hiring.scorecards → Interview evaluation rubrics
hiring.offers → Pending offers + candidates
hiring.decisions → Past hires + retention data
```

When approving a new comp, hiring agent:
1. Checks memory: Have we hired this role before?
2. Looks at comp range: $150–180K for SF senior engineer?
3. Looks at past hire outcomes: Did we overpay? Underpay?
4. Makes recommendation based on pattern

### Ops Memory
```
ops.vendors → All tools + costs + renewal dates
ops.spend → Monthly spend tracking + trends
ops.forecast → Cash projections under different scenarios
ops.metrics → KPI dashboard (burn, runway, churn, CAC, LTV)
```

When a new vendor comes up, ops agent:
1. Checks memory: Do we already have a tool that does this?
2. Checks memory: What did we pay for similar tools?
3. Checks memory: What's our current burn + runway?
4. Recommends based on context

### CS Memory
```
cs.customers → Account profiles, ARR, tenure, NPS
cs.health_scores → Weekly health scoring for all accounts
cs.interactions → Interaction history (calls, tickets, sentiment)
cs.playbooks → Onboarding, expansion, renewal workflows
cs.churn_analysis → Post-mortem on why customers left
```

When a customer health score drops, CS agent:
1. Checks memory: Customer history + trajectory
2. Compares: Health trend (up/stable/down)?
3. Analyzes: Usage dropping + support tickets up = red flag
4. Recommends action based on pattern

### Founder Memory
```
founder.decisions → All decisions made + dates + outcomes
founder.standup → Daily action items + owners
founder.board_deck → Quarterly metrics + narrative
founder.calendar → Key dates (board meetings, fundraise window, etc.)
```

When founder uses `/decision-router`, agent:
1. Checks memory: Have we faced this decision before?
2. Looks up: How did we solve it last time?
3. Checks: Has context changed?
4. Recommends based on pattern + new data

---

## Scaling: How This Works as Company Grows

### Seed → Series A (20–50 people)
- Founder runs all decisions himself using agents
- Each agent has light overhead (10% time from specialist intern or contractor)
- Gates keep founder in the loop

### Series A → Series B (50–150 people)
- Hire department heads (VP Sales, VP Eng, etc.)
- Agents become department ops tool (not CEO tool)
- Founder Agent synthesizes for board/investors

### Series B+ (150+ people)
- Each department has ops team using their agent
- Agents become institutional playbooks + automation
- Founder Agent still runs governance (gates, decisions)

---

## Why This Works

1. **Reduces cognitive load** — Founder doesn't track 100 things, just reviews agent summaries
2. **Data-backed decisions** — Every rec is backed by analysis, not gut
3. **Scales without hierarchy chaos** — Agents can route decisions without manager bottleneck
4. **Prevents "surprise" bad decisions** — Gates catch misalignments before they happen
5. **Learns from mistakes** — Memory builds institutional wisdom

---

## Examples: Real Scenarios

### Scenario 1: New Customer At Risk
```
CS Agent notices: Acme Corp (top 10 customer) health score RED
  ↓
Auto-triggers: /claw @cs /churn-analysis Acme
  ↓
Finds: Underutilized feature X, competitor has it
  ↓
Recommends: Build workaround OR feature roadmap OR win-back campaign
  ↓
Founder decides: Based on data + context
  ↓
Executed: CS team takes action + tracks outcome
```

**Result:** Churn prevented instead of surprised by cancellation

### Scenario 2: Hiring Pipeline Stalled
```
Hiring Agent notices: Designer role stuck 3 months, 2 candidates only
  ↓
Auto-triggers: /claw @hiring /pipeline-review
  ↓
Flags: Sourcing bottleneck, market competition high
  ↓
Recommends: Recruiting agency OR contractor OR defer hire
  ↓
Founder routes: To operations for cost check
  ↓
Operations Agent: Agency costs $30K, pays for itself in 1 hire
  ↓
Founder decides: Approve agency ($30K gate)
  ↓
Executed: Post agency job + internal sourcing in parallel
```

**Result:** Hiring backlog eliminated, not deferred

### Scenario 3: Monthly Spend Exploding
```
Operations Agent auto-runs: /ops-audit
  ↓
Finds: Spend up $5K/mo (tools + services)
  ↓
Breaks down: Slack overages ($1K), new tool ($2K), consultant ($2K)
  ↓
Recommends: Cancel consultant, shrink Slack, negotiate new tool
  ↓
Founder routes: Quick yes on easy cuts, negotiates tool
  ↓
Savings: $4.5K/mo (extends runway 0.8 months)
  ↓
Memory updated: ops.vendors, ops.spend
```

**Result:** Waste eliminated, runway extended

---

## Quick Reference: When to Use Each Agent

| Question | Use Agent | Skill |
|----------|-----------|-------|
| "Is our pipeline healthy?" | GTM | `/pipeline-digest` |
| "Should we close this deal?" | GTM | `/deal-analysis` |
| "Can we afford to hire this person?" | Founder → routes to Hiring + Ops | `/decision-router` |
| "Why did that customer churn?" | CS | `/churn-analysis` |
| "What are our top KPIs?" | Ops | `/metric-dashboard` |
| "How much runway do we have?" | Ops | `/budget-forecast` |
| "Should we buy this tool?" | Ops | `/vendor-review` |
| "Give me a board deck" | Founder | `/board-prep` |
| "What should I focus on today?" | Founder | `/daily-standup` or `/decision-router` |

---

See [PHASE2_COMPLETE.md](PHASE2_COMPLETE.md) for full implementation details.
