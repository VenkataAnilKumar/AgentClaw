# AgentClaw — Phase 2 Copilot Prompt

> Paste everything below this line as your first message to the copilot.

---

Phase 1 of AgentClaw is complete and validated. The core runtime, multi-provider LLM layer, PostgreSQL memory, Slack interface, bootstrap loader, and GTM agent (`/claw @gtm`) are all working.

You are now implementing **Phase 2: Agent Library** — all remaining agents fully operational with their complete skill sets and first integrations.

---

## What Is Already Built (Phase 1 — do not rebuild)

- `packages/db/` — all tables migrated and working
- `packages/shared/` — all TypeScript types defined
- `packages/llm/` — multi-provider adapter (anthropic, openai, google, ollama, groq, bedrock, azure, mistral) with fallback runner
- `packages/runtime/src/bootstrap/` — loads COMPANY.md, OKR.md, RUNWAY.md, TEAM.md, AGENTS.md, SKILLS.md, HEARTBEAT.md
- `packages/runtime/src/llm/` — prompt-builder (10 layers), output-parser (all block types including OKR_UPDATE, RUNWAY_UPDATE)
- `packages/runtime/src/memory/` — TeamMemory, AgentMemory
- `packages/runtime/src/skills/` — skill loader
- `packages/runtime/src/heartbeat/` — HEARTBEAT scheduler with company_id scoping
- `packages/runtime/src/gates/` — GateManager with RBAC
- `packages/runtime/src/router/` — intent router (haiku model)
- `packages/runtime/src/agent-runner.ts` — central orchestrator
- `packages/slack/` — /claw command, gate Block Kit, Home Tab, streaming
- `server/` — wired and running
- `agents/gtm-agent.md` + `skills/cold-email.md` + `skills/icp.md` — working

---

## Phase 2 Build Order

### Step 1 — Complete GTM Agent Skills

Add the remaining 4 GTM skills. Each is a `.md` file in `skills/`. Adapt format from `_sources/openclaw/skills/` — frontmatter + prompt template.

**`skills/positioning.md`**
- Writes competitive positioning statement
- Reads: team memory `gtm.icp`, `gtm.competitors`, COMPANY.md
- Writes: `---MEMORY_UPDATE--- gtm.positioning: {summary}`
- Gate: `strategy` — always requires approval before finalizing
- Output: positioning canvas artifact (category, target, differentiation, proof points)

**`skills/battlecard.md`**
- Args: `<competitor name>`
- Reads: team memory `gtm.competitors`, COMPANY.md
- Writes: `---MEMORY_UPDATE--- gtm.competitors.<name>: {summary}`
- Output: battlecard artifact (their strengths, our strengths, objections, landmines, win themes)

**`skills/launch-plan.md`**
- Args: `<feature or product name>`
- Reads: OKR.md, RUNWAY.md (check if budget allows), COMPANY.md
- Output: launch plan artifact (channels, messaging, timeline, success metrics, go/no-go criteria)
- Gate: `strategy` if launch involves any spend

**`skills/weekly-digest.md`**
- No args — runs on HEARTBEAT schedule
- Reads: team memory `gtm.*`, last 5 run contexts, HubSpot integration data if installed
- Output: digest artifact (pipeline status, what's working, what to cut, this week's 3 priorities)
- Posts to: `#team-updates` channel

After adding all 4 skills, update `agents/gtm-agent.md` frontmatter `skills` list to include them.

---

### Step 2 — Hiring Agent

**`agents/hiring-agent.md`**
- Adapt from: `_sources/awesome-openclaw-agents/hr/` templates
- Model: `anthropic/claude-sonnet-4-6`
- Fallback: `openai/gpt-4o`, `google/gemini-2.0-flash`, `ollama/llama3.3`
- Channel: `#hiring-agent`
- Memory category: `hiring`
- Gate types: `hire` (all offers — no exceptions), `spend` (compensation changes)
- Route keywords: hire, candidate, JD, job description, interview, recruiter, offer, talent, headcount, onboarding

Identity prompt key points:
- Senior technical recruiter who has hired 200+ at Seed-to-Series-B startups
- Always calibrates JDs to COMPANY.md stage — no enterprise-style JDs for seed startups
- Compensation ranges must be realistic for RUNWAY.md burn rate
- Flag immediately if a hire would push runway below 12 months
- All offers and equity grants require `hire` gate — no exceptions

**`skills/jd.md`**
- Args: `<role title>`
- Reads: TEAM.md (existing team), COMPANY.md (stage, culture), RUNWAY.md (comp range)
- Output: full JD artifact (role summary, responsibilities, requirements, nice-to-haves, comp range, equity range, why join us)

**`skills/interview-plan.md`**
- Args: `<role title>`
- Reads: team memory `hiring.scorecards`
- Output: interview plan artifact (stages, questions per stage, what to assess, red flags, green flags)

**`skills/scorecard.md`**
- Args: `<role title>`
- Writes: `---MEMORY_UPDATE--- hiring.scorecards.<role>: {summary}`
- Output: scorecard artifact (criteria, weight %, 1–5 definitions per criterion)

**`skills/offer-letter.md`**
- Args: `<candidate name>, <role>, <salary>, <equity>`
- Reads: COMPANY.md (legal entity name), RUNWAY.md (validate budget impact)
- Output: offer letter artifact
- Gate: ALWAYS `hire` — never skips regardless of amount

**`skills/pipeline-review.md`**
- No args — runs on HEARTBEAT
- Reads: team memory `hiring.pipeline`, last 3 run contexts
- Writes: `---MEMORY_UPDATE--- hiring.pipeline: {updated summary}`
- Output: pipeline artifact (stage breakdown, stale candidates >7 days, blockers, recommended next actions)

Update `agents/hiring-agent.md` frontmatter `skills` list after creating all skill files.

---

### Step 3 — Dev Agent

**`agents/dev-agent.md`**
- Adapt from: `_sources/awesome-openclaw-agents/engineering/` templates
- Model: `anthropic/claude-sonnet-4-6`
- Fallback: `openai/gpt-4o`, `google/gemini-2.0-flash`, `ollama/llama3.3`
- Channel: `#dev-agent`
- Memory category: `product`
- Gate types: `spend` (infra changes >$200/month recurring)
- Route keywords: spec, feature, architecture, ADR, sprint, task, bug, incident, postmortem, tech debt, PR, deploy, engineering, code review

Identity prompt key points:
- Staff engineer + technical PM who has built products from 0 to 1M users at startups
- Writes specs a junior engineer can implement without clarification
- ADRs must include context, decision, consequences, alternatives considered
- Sprint plans must not exceed realistic velocity — checks team size from TEAM.md
- Postmortems are blameless — focuses on systems, not people
- Architecture changes with cloud spend >$200/month require `spend` gate

**`skills/spec.md`**
- Args: `<feature name or description>`
- Reads: team memory `product.stack`, `product.architecture`
- Output: spec artifact (problem, proposed solution, interface design, data model changes, edge cases, test plan, out of scope)

**`skills/adr.md`**
- Args: `<decision title>`
- Output: ADR artifact (title, date, status, context, decision, consequences, alternatives considered)

**`skills/sprint-plan.md`**
- Args: `<sprint goal>`
- Reads: GitHub integration (open PRs, issue count) if installed, Linear integration (backlog) if installed, TEAM.md (team size for velocity)
- Writes: Linear issues via integration if Linear is installed
- Output: sprint plan artifact (task list with title, description, estimate in points, suggested assignee, acceptance criteria)
- Gate: none — advisory only

**`skills/postmortem.md`**
- Args: `<incident description>`
- Output: postmortem artifact (timeline, impact, root cause, contributing factors, what went well, action items with owners)

**`skills/tech-debt.md`**
- Args: `<debt item description>`
- Writes: `---MEMORY_UPDATE--- product.tech_debt: {appended item}`
- Output: tech debt artifact (description, impact level high/medium/low, effort to fix, recommendation)

Update `agents/dev-agent.md` frontmatter `skills` list after creating all skill files.

---

### Step 4 — Finance Agent

**`agents/finance-agent.md`**
- Adapt from: `_sources/awesome-openclaw-agents/finance/` templates
- Model: `anthropic/claude-opus-4-6`
- Fallback: `openai/gpt-4o`, `google/gemini-2.5-pro`, `ollama/llama3.3`
- Channel: `#finance-agent` (interactive), posts digests to `#founders`
- Memory category: `finance`
- Gate types: `spend` (anything >$1,000/month recurring or $5,000 one-time)
- Route keywords: runway, burn, money, budget, spend, finance, investor, MRR, ARR, revenue, churn, fundraise, cash, cap table

Identity prompt key points:
- Fractional CFO with 15+ Seed-to-Series-A startups experience
- ALWAYS reads RUNWAY.md before any output — every response must reference current runway
- If runway <12 months: prepend a prominent ⚠️ warning to every response
- If runway <6 months: immediately post urgent alert to `#founders` regardless of what was asked
- Every spend recommendation >$1,000/month requires `spend` gate
- Never speculate on valuation — only reference targets stated in COMPANY.md
- Updates RUNWAY.md via `---RUNWAY_UPDATE---` blocks after processing real financial data

**`skills/runway-check.md`**
- No args — can also be triggered manually
- Reads: RUNWAY.md, Stripe integration (MRR) if installed, Brex integration (burn) if installed
- Writes: `---RUNWAY_UPDATE--- cash: {value}`, `---RUNWAY_UPDATE--- mrr: {value}`, `---MEMORY_UPDATE--- finance.runway_trend: {summary}`
- Output: runway artifact (current state, 3 scenarios base/optimistic/pessimistic, month-by-month projection, recommendation)
- HEARTBEAT: every day at 8am → posts to `#founders`

**`skills/investor-update.md`**
- No args — runs monthly on HEARTBEAT
- Reads: RUNWAY.md, OKR.md, team memory `finance.*`, `product.*`, `gtm.*`, Stripe MRR data if installed
- Output: investor update artifact (highlights, metrics table, product update, team update, asks, outlook)
- Gate: `strategy` before sending externally

**`skills/burn-scenario.md`**
- Args: `<proposed hire title and cost> OR <spend item and cost>`
- Reads: RUNWAY.md
- Output: scenario artifact (current runway, post-change runway, monthly delta, break-even if revenue-generating, recommendation)

**`skills/spend-review.md`**
- No args — reads Brex if installed, else asks user to describe expenses
- Reads: Brex integration (pending expenses, recent transactions) if installed
- Output: spend review artifact (expenses by category, anomalies flagged, approval recommendations)
- Gate: `spend` for any item >$1,000

Update `agents/finance-agent.md` frontmatter `skills` list after creating all skill files.

---

### Step 5 — Legal Agent (inactive by default)

**`agents/legal-agent.md`**
- Model: `anthropic/claude-opus-4-6`
- Fallback: `openai/gpt-4o`, `google/gemini-2.5-pro`
- Channel: `#legal-agent`
- Memory category: `company`
- Gate types: `legal` (all documents before sending externally — no exceptions)
- Status: inactive in AGENTS.md by default — user must explicitly enable
- Route keywords: legal, contract, NDA, agreement, terms, privacy, IP, equity, SAFE, cap table

Identity prompt key points:
- Startup legal advisor (not licensed attorney — always state this in output)
- Every output must include disclaimer: "This is legal information, not legal advice. Have a licensed attorney review before signing."
- All documents require `legal` gate before any external use
- Proactively flags IP assignment issues — common and costly startup mistake

**`skills/nda.md`** — draft mutual or one-way NDA. Gate: `legal`.
**`skills/contractor-agreement.md`** — draft contractor/consultant agreement with IP assignment. Gate: `legal`.
**`skills/saas-terms.md`** — draft SaaS terms of service. Gate: `legal`.
**`skills/privacy-policy.md`** — draft privacy policy. Gate: `legal`.

---

### Step 6 — HEARTBEAT Schedules

Add these entries to `bootstrap/HEARTBEAT.md.example` and ensure the scheduler picks them up:

```
## Weekly GTM Digest
agent: gtm-agent
skill: weekly-digest
schedule: "0 9 * * 1"
channel: "#team-updates"

## Daily Runway Check
agent: finance-agent
skill: runway-check
schedule: "0 8 * * *"
channel: "#founders"

## Weekly Hiring Pipeline Review
agent: hiring-agent
skill: pipeline-review
schedule: "0 10 * * 2"
channel: "#hiring-agent"

## Monthly Investor Update Draft
agent: finance-agent
skill: investor-update
schedule: "0 9 1 * *"
channel: "#founders"
```

Test: manually trigger each HEARTBEAT skill and confirm artifact is posted to correct channel.

---

### Step 7 — Integrations (`packages/integrations/`)

Build in priority order. Each integration: `packages/integrations/src/<name>/client.ts`.

Rules for all integration clients:
- Constructor takes `apiKey: string` (decrypted from `company_secrets` at runtime)
- All methods async, return typed results
- On error: return `{ error: string }` — never throw
- Never log API keys or response data containing PII

#### 7a. Stripe (`packages/integrations/src/stripe/client.ts`)

```typescript
class StripeClient {
  getMRR(): Promise<{ mrr: number; currency: string; error?: string }>
  getChurnRate(since: Date): Promise<{ rate: number; churned: number; error?: string }>
  getNewCustomers(since: Date): Promise<{ count: number; mrr_added: number; error?: string }>
  getPaymentFailures(): Promise<{ count: number; amount: number; error?: string }>
  getRevenueSnapshot(): Promise<{ mrr: number; arr: number; customer_count: number; error?: string }>
}
```

Used by: Finance Agent `runway-check` and `investor-update` skills.
Secret key: `company_secrets` key `STRIPE_API_KEY`.
SDK: `stripe` npm package.

#### 7b. Linear (`packages/integrations/src/linear/client.ts`)

```typescript
class LinearClient {
  getBacklog(projectId?: string): Promise<{ issues: Issue[]; error?: string }>
  createIssue(title: string, description: string, projectId: string, assigneeId?: string): Promise<{ id: string; url: string; error?: string }>
  getProjectStatus(projectId: string): Promise<{ name: string; progress: number; issues: Issue[]; error?: string }>
  getTeamMembers(): Promise<{ members: Member[]; error?: string }>
}
```

Used by: Dev Agent `sprint-plan` (reads backlog, creates issues).
Secret key: `LINEAR_API_KEY`.
SDK: `@linear/sdk` npm package.

#### 7c. GitHub (`packages/integrations/src/github/client.ts`)

```typescript
class GitHubClient {
  getOpenPRs(repo: string): Promise<{ prs: PR[]; count: number; error?: string }>
  getIssueCount(repo: string): Promise<{ open: number; closed_this_week: number; error?: string }>
  getRecentReleases(repo: string): Promise<{ releases: Release[]; error?: string }>
  getContributors(repo: string): Promise<{ contributors: Contributor[]; error?: string }>
}
```

Used by: Dev Agent `postmortem` and `sprint-plan`.
Secret key: `GITHUB_TOKEN`.
SDK: `@octokit/rest` npm package.

#### 7d. HubSpot (`packages/integrations/src/hubspot/client.ts`)

```typescript
class HubSpotClient {
  getPipelineSnapshot(): Promise<{ stages: Stage[]; total_value: number; error?: string }>
  getDealsByStage(): Promise<{ [stage: string]: Deal[] }>
  getContactCount(): Promise<{ total: number; new_this_week: number; error?: string }>
  getRecentActivity(since: Date): Promise<{ activities: Activity[]; error?: string }>
}
```

Used by: GTM Agent `weekly-digest`.
Secret key: `HUBSPOT_API_KEY`.
SDK: `@hubspot/api-client` npm package.

---

### Step 8 — Wire Integrations into Skills

After building each integration client, wire it into the relevant skills:

**Finance Agent `runway-check` ← Stripe:**
```typescript
// In agent-runner.ts, before building prompt for runway-check:
const stripeKey = await db.getSecret(companyId, 'STRIPE_API_KEY')
if (stripeKey) {
  const stripe = new StripeClient(stripeKey)
  const snapshot = await stripe.getRevenueSnapshot()
  if (!snapshot.error) {
    // inject into prompt context as additional "Live Data" section
    // after [9] RUN HISTORY, before [10] TASK
    liveData.push(`Stripe MRR: $${snapshot.mrr} | Customers: ${snapshot.customer_count}`)
  }
}
```

Apply same pattern for: Linear → Dev Agent sprint-plan, GitHub → Dev Agent postmortem, HubSpot → GTM Agent weekly-digest.

Integration data is injected as an optional Layer 11 in the prompt: `[11] LIVE DATA ← integration snapshots (if available)`.

---

### Step 9 — All Agents Milestone Tests

Run each of these commands after completing the corresponding agent. All must produce a structured artifact in the agent's Slack channel:

```
# Hiring Agent
/claw @hiring /jd founding engineer

# Dev Agent
/claw @dev /spec Stripe payment integration

# Finance Agent
/claw @finance /runway-check

# Legal Agent (must first enable in AGENTS.md)
/claw @legal /nda with design partner

# Router (no agent specified)
/claw draft a postmortem for last night's outage
```

For the router test: confirm it correctly routes to `dev-agent` with confidence >= 0.7.

---

### Step 10 — HEARTBEAT End-to-End Test

Temporarily set one HEARTBEAT schedule to `* * * * *` (every minute) for testing.
Confirm: agent runs → artifact produced → posted to correct Slack channel → `heartbeat_runs` row inserted.
Reset schedule after test passes.

---

## Phase 2 Complete Definition

Phase 2 is done when ALL of the following pass:

- [ ] All 5 agents (`gtm`, `hiring`, `dev`, `finance`, `legal`) respond in Slack with structured artifacts
- [ ] All 18 skills produce correct artifact output
- [ ] HEARTBEAT fires on schedule for weekly-digest, runway-check, pipeline-review, investor-update
- [ ] Stripe integration feeds real MRR into finance agent runway-check
- [ ] Linear integration creates issues from dev agent sprint-plan
- [ ] GitHub integration feeds PR/issue data into dev agent
- [ ] HubSpot integration feeds pipeline data into GTM weekly-digest
- [ ] `---OKR_UPDATE---` blocks update team memory correctly
- [ ] `---RUNWAY_UPDATE---` blocks update RUNWAY.md content correctly
- [ ] `hire` gate fires on every offer-letter generation — cannot be bypassed
- [ ] `spend` gate fires on finance spend-review items >$1,000
- [ ] Router correctly routes 5 test messages to the right agents

---

## Critical Rules (same as Phase 1 — still apply)

1. Never subprocess any LLM call — use `packages/llm/` provider adapters
2. Always `provider/model` format — never bare model names
3. Try fallbacks on provider errors automatically
4. Every DB query must include `company_id` filter
5. Never store secrets in markdown files — use `company_secrets` table
6. Never auto-approve gates — human Slack click required
7. Agents write only to their own memory category
8. Do not add multi-channel support — Slack only
9. Integration errors must not crash agent runs — always degrade gracefully

---

## Reference Docs

- `docs/AGENT_SPECS.md` — per-agent identity prompts, behavioral rules, skill specs
- `docs/ARCHITECTURE.md` — system diagram, integration wiring pattern
- `bootstrap/AGENTS.md.example` — agent registry with provider/model format
- `bootstrap/HEARTBEAT.md.example` — cron schedule examples
