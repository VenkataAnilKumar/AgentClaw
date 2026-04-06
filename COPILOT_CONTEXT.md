# AgentClaw — Copilot Session Context

> Paste this entire file at the start of every Copilot/AI session to restore full project context.
> Last updated: 2026-04-06

---

## What Is AgentClaw

**AgentClaw** is a startup-native AI agent framework built on top of OpenClaw (MIT).
Tagline: *"Your startup's first AI teammates. In Slack, where you already work."*

OpenClaw is a personal AI assistant for individuals. AgentClaw is team-native — built around
the workflows founding teams actually run: GTM, hiring, finance, dev, legal.

**Key differentiators from OpenClaw:**
- Slack-first interface (not multi-channel generic)
- Team-shared memory (PostgreSQL-backed, not personal-only)
- Startup bootstrap files: `COMPANY.md`, `OKR.md`, `RUNWAY.md`, `TEAM.md`
- Startup-domain agents: GTM, Hiring, Finance, Dev, Legal
- Startup skill integrations: Stripe, Brex, Linear, HubSpot, Notion, GitHub

---

## Source Repos (placed in `_sources/` by the user)

```
AgentClaw/
└── _sources/
    ├── openclaw/               ← openclaw/openclaw (MIT) — PRIMARY BASE
    ├── openclaw-office/        ← WW-AI-Lab/openclaw-office (MIT) — dashboard reference
    ├── ClawTeam-OpenClaw/      ← win4r/ClawTeam-OpenClaw (MIT) — multi-agent team patterns
    ├── awesome-openclaw-agents/ ← mergisi/awesome-openclaw-agents — 162 agent templates
    └── bolt-ts-starter-template/ ← slack-samples/bolt-ts-starter-template — Slack scaffolding
```

**How to use each source:**
- `_sources/openclaw/` — copy core runtime, Slack channel, skill loader, heartbeat scheduler, bootstrap loader, output parser. This is the engine.
- `_sources/ClawTeam-OpenClaw/` — reference multi-agent routing and swarm coordination patterns.
- `_sources/awesome-openclaw-agents/` — mine agent `.md` templates from the `gtm/`, `finance/`, `hiring/`, `engineering/` categories. Adapt for startup use.
- `_sources/openclaw-office/` — reference the WebSocket gateway and dashboard UI patterns if building the web console.
- `_sources/bolt-ts-starter-template/` — reference for Slack Bolt.js Socket Mode + HTTP mode setup if OpenClaw's Slack module needs extending.

---

## Repository Structure (target state)

```
AgentClaw/
├── _sources/                    ← Downloaded open-source repos (read-only reference)
├── agents/                      ← Agent definition .md files
│   ├── router-agent.md
│   ├── gtm-agent.md
│   ├── hiring-agent.md
│   ├── dev-agent.md
│   ├── finance-agent.md
│   └── legal-agent.md
├── skills/                      ← Built-in skill .md files (one per skill)
│   ├── icp.md
│   ├── cold-email.md
│   ├── positioning.md
│   ├── battlecard.md
│   ├── launch-plan.md
│   ├── weekly-digest.md
│   ├── jd.md
│   ├── interview-plan.md
│   ├── scorecard.md
│   ├── offer-letter.md
│   ├── pipeline-review.md
│   ├── spec.md
│   ├── adr.md
│   ├── sprint-plan.md
│   ├── postmortem.md
│   ├── runway-check.md
│   ├── investor-update.md
│   ├── burn-scenario.md
│   └── spend-review.md
├── bootstrap/                   ← Example startup bootstrap files
│   ├── COMPANY.md.example
│   ├── TEAM.md.example
│   ├── OKR.md.example
│   ├── RUNWAY.md.example
│   ├── AGENTS.md.example
│   ├── SKILLS.md.example
│   └── HEARTBEAT.md.example
├── packages/
│   ├── db/                      ← @agentclaw/db — Drizzle schema + PostgreSQL
│   ├── shared/                  ← @agentclaw/shared — TypeScript types
│   ├── runtime/                 ← @agentclaw/runtime — core engine (adapted from openclaw)
│   ├── slack/                   ← @agentclaw/slack — Bolt.js Slack interface
│   └── integrations/            ← @agentclaw/integrations — Stripe, Brex, Linear, etc.
├── server/                      ← Express HTTP server
├── cli/                         ← agentclaw CLI (init, install, doctor)
├── docs/
│   ├── COPILOT_CONTEXT.md       ← This file
│   ├── PRODUCT_DOCUMENT.md      ← Full product spec
│   ├── ARCHITECTURE.md          ← Technical architecture
│   ├── IMPLEMENTATION_GUIDE.md  ← Step-by-step build guide
│   └── AGENT_SPECS.md           ← Per-agent detailed specs
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
├── .env.example
└── README.md
```

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript / Node.js 22+ | Same as OpenClaw base |
| Package manager | pnpm workspaces | Same as OpenClaw |
| LLM | Multi-provider abstraction (`packages/llm/`) | Same `provider/model` format as OpenClaw — works with any AI model |
| Slack interface | `@slack/bolt` v4 | Official, Socket Mode for dev |
| Database | PostgreSQL 16 + Drizzle ORM | Team memory persistence |
| Dev DB | Docker Compose `postgres:16-alpine` | |
| Prod DB | Supabase (managed Postgres) | |
| Scheduler | `node-cron` | HEARTBEAT.md cron runs |

---

## LLM Provider System

AgentClaw supports every AI model provider that OpenClaw supports — using the same `provider/model` format. Adapt the provider layer from `_sources/openclaw/src/runtime/llm/`.

### Supported Providers

| Provider key | Models | Env var |
|---|---|---|
| `anthropic` | claude-sonnet-4-6, claude-opus-4-6, claude-haiku-4-5 | `ANTHROPIC_API_KEY` |
| `openai` | gpt-4o, gpt-4o-mini, o3, o4-mini | `OPENAI_API_KEY` |
| `google` | gemini-2.0-flash, gemini-2.5-pro | `GEMINI_API_KEY` |
| `ollama` | llama3.3, mistral, gemma3, phi4, qwen3 | none — auto-detected at `localhost:11434` |
| `groq` | llama-3.3-70b-versatile, mixtral-8x7b | `GROQ_API_KEY` |
| `bedrock` | anthropic.claude-*, amazon.titan-* | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` |
| `azure` | gpt-4o (Azure-hosted) | `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT` |
| `mistral` | mistral-large-latest, codestral | `MISTRAL_API_KEY` |

### Model Reference Format
Always `provider/model-name` — identical to OpenClaw:
```
anthropic/claude-sonnet-4-6
openai/gpt-4o
google/gemini-2.0-flash
ollama/llama3.3
groq/llama-3.3-70b-versatile
bedrock/anthropic.claude-sonnet-4-6
mistral/mistral-large-latest
```

### Fallback Chains
Each agent defines a primary model + fallback list. On rate-limit or provider error, the runner automatically tries the next model:
```yaml
model: anthropic/claude-sonnet-4-6
fallback:
  - openai/gpt-4o
  - google/gemini-2.0-flash
  - ollama/llama3.3        # local fallback — no cost, no API key
```

### Company Model Config (`~/.agentclaw/<slug>/config.json`)
```json
{
  "defaultModel": "anthropic/claude-sonnet-4-6",
  "fallback": ["openai/gpt-4o", "google/gemini-2.0-flash"],
  "routerModel": "anthropic/claude-haiku-4-5-20251001",
  "localModel": "ollama/llama3.3"
}
```
Agents inherit `defaultModel` unless their frontmatter overrides it.

---

## Bootstrap File System

These files live in `~/.agentclaw/<company-slug>/` (local mode) or in the database (cloud mode).
Every agent reads ALL bootstrap files at the start of every run.

| File | Purpose | OpenClaw Equivalent |
|---|---|---|
| `COMPANY.md` | Company identity, stage, priorities, business model | `SOUL.md` |
| `TEAM.md` | Team roster, Slack handles, roles, RBAC rules | *(new)* |
| `OKR.md` | Objectives & Key Results — every agent action must advance an OKR | *(new)* |
| `RUNWAY.md` | Cash balance, burn rate, runway months, MRR | *(new)* |
| `AGENTS.md` | Active agents, their channels, skills, intent routing keywords | `AGENTS.md` |
| `SKILLS.md` | Installed skills manifest | `TOOLS.md` |
| `HEARTBEAT.md` | Cron-scheduled agent runs | `HEARTBEAT.md` |

**Bootstrap loading rule:** The `BootstrapLoader` injects all 7 files into every agent prompt.
Agents may emit structured output blocks to update bootstrap state. See Output Blocks section.

---

## Agent Structured Output Blocks

Agents communicate state changes back to the system via fenced blocks in their LLM output.
Copy the block parser from `_sources/openclaw/src/runtime/output-parser.ts` and extend with:

```
---ARTIFACT_START---
{title, type, content, format}
---ARTIFACT_END---

---MEMORY_UPDATE---
{key}: {value}
---END_MEMORY_UPDATE---

---PERSONAL_MEMORY---
{key}: {value}
---END_PERSONAL_MEMORY---

---OKR_UPDATE---            ← NEW (not in base openclaw)
{okr_id}: {progress_note}
---END_OKR_UPDATE---

---RUNWAY_UPDATE---         ← NEW (not in base openclaw)
{field}: {new_value}
---END_RUNWAY_UPDATE---

---HUMAN_GATE---
type: strategy|spend|hire|legal
title: {title}
description: {description}
approvers: owner,admin
---END_HUMAN_GATE---
```

---

## Memory Architecture

Three layers. All persistent in PostgreSQL.

```
Layer 1: Company Memory (team_memory table)
  - Shared across all agents for this company
  - Key-value, categorized: company | gtm | hiring | finance | product
  - Writable by agents via ---MEMORY_UPDATE--- blocks
  - Human-editable via Slack Home Tab

Layer 2: Agent Personal Memory (agent_memory table)
  - Keyed by (company_id, agent_name)
  - Not visible to other agents
  - Writable via ---PERSONAL_MEMORY--- blocks

Layer 3: Run Context (skill_run_context table)
  - Last 5 run summaries per agent, auto-truncated to 400 chars
  - Injected as "recent history" section in every prompt
  - Ephemeral — auto-rotated
```

**Memory isolation:** Agent personal memory scoped to `(company_id, agent_name)`.
Team memory scoped to `company_id`. No cross-company leakage.

---

## Database Schema

Tables to create in `packages/db/src/schema/`:

```typescript
// companies.ts
companies: { id, slug, name, plan, created_at }

// company_members.ts
company_members: { id, company_id, slack_user_id, role, created_at }
// role: 'owner' | 'admin' | 'member' | 'read_only'

// agents.ts
agents: { id, company_id, name, enabled, channel_id, created_at }

// team_memory.ts
team_memory: { id, company_id, category, key, value, written_by_agent, updated_at }

// agent_memory.ts
agent_memory: { id, company_id, agent_name, key, value, updated_at }

// skill_runs.ts
skill_runs: { id, company_id, agent_name, skill_name, input, output_summary,
              gate_id, model_used, tokens_used, cost_usd, duration_ms, created_at }

// skill_run_context.ts
skill_run_context: { id, company_id, agent_name, summary, created_at }
// Max 5 rows per (company_id, agent_name) — auto-rotate oldest

// artifacts.ts
artifacts: { id, company_id, agent_name, skill_name, title, type, content,
             format, run_id, created_at }

// human_gates.ts
human_gates: { id, company_id, agent_name, gate_type, title, description,
               status, approved_by, resolved_at, slack_message_ts, created_at }
// status: 'pending' | 'approved' | 'rejected'
// gate_type: 'strategy' | 'spend' | 'hire' | 'legal'

// heartbeat_runs.ts
heartbeat_runs: { id, company_id, agent_name, skill_name, status, run_at }

// company_secrets.ts
company_secrets: { id, company_id, key, encrypted_value, created_at }
// Encrypted at rest. Never exposed in prompts.
```

---

## Slack Interface Rules

- Primary command: `/claw @<agent> /<skill> <args>`
- App mention: `@AgentClaw @gtm draft cold email for enterprise SaaS`
- Without agent: `/claw draft cold email` → Router Agent classifies intent → routes
- Always post an immediate "thinking..." message on command receipt
- Use `chat.update` to replace thinking message with streamed output
- Human Gate UI: Block Kit message with Approve / Reject buttons + rejection reason input
- App Home Tab: company memory viewer, active agents status, recent runs feed

**Gate approval RBAC:**
- `owner` and `admin` roles can approve all gate types
- `member` can only approve `strategy` gates (not `spend`, `hire`, `legal`)

---

## LLM Prompt Structure (per agent run)

Every agent prompt is assembled in this exact order by `packages/runtime/src/llm/prompt-builder.ts`:

```
[1] SYSTEM IDENTITY      ← agents/<agent-name>.md
[2] COMPANY CONTEXT      ← bootstrap/COMPANY.md content
[3] OKR CONTEXT          ← bootstrap/OKR.md content
[4] RUNWAY CONTEXT       ← bootstrap/RUNWAY.md content (finance-relevant agents)
[5] TEAM CONTEXT         ← bootstrap/TEAM.md (roles, who can approve gates)
[6] AVAILABLE SKILLS     ← compact list: skill name + description + file path
[7] TEAM MEMORY          ← team_memory rows for this company (relevant category)
[8] PERSONAL MEMORY      ← agent_memory rows for (company_id, agent_name)
[9] RUN HISTORY          ← last 5 skill_run_context summaries (400 chars each)
[10] TASK                ← the user's actual request
```

---

## HEARTBEAT Scheduler

Copy `_sources/openclaw/src/runtime/heartbeat/scheduler.ts` as the base.

Extend with:
- Read `HEARTBEAT.md` per company from bootstrap source
- Schedule cron jobs per company (isolated per `company_id`)
- Post output to the designated Slack `channel` in HEARTBEAT config
- Record each run in `heartbeat_runs` table
- Gate-blocking: if a pending `HUMAN_GATE` exists for an agent, skip its heartbeat run

---

## Skill File Format

Copy format from `_sources/openclaw/skills/` directory. Each skill is a `.md` file:

```markdown
---
name: cold-email
description: Draft a personalized cold email sequence for a given target persona
argument-hint: <target persona or company name>
agents: [gtm-agent]
---

You are drafting a cold email sequence.

Context from COMPANY.md will be injected above this template automatically.

Draft a 3-email sequence for: {{args}}

Requirements:
- Email 1: Problem-aware, no pitch
- Email 2: Light case study reference
- Email 3: Clear CTA with low-friction ask

Use the ICP from team memory if available.
Output as ---ARTIFACT_START--- blocks.
```

---

## Agent File Format

Each agent is a `.md` file in `agents/`. Copy format from `_sources/awesome-openclaw-agents/`
and adapt. Structure:

```markdown
---
name: gtm-agent
model: claude-sonnet-4-6
channel: "#gtm-agent"
skills: [icp, cold-email, positioning, battlecard, launch-plan, weekly-digest]
route-keywords: [email, campaign, launch, positioning, competitor, ICP, outreach, GTM]
gate-types: [strategy, spend]
memory-category: gtm
---

# Identity
You are the GTM Agent for {{company.name}}...

# Behavioral Rules
1. Always check OKR.md before proposing campaigns...
2. Never recommend spend over $500 without a HUMAN_GATE...
3. ...

# Output Format
Always produce artifacts as ---ARTIFACT_START--- blocks...
```

---

## Gate Flow

```
Agent LLM output contains ---HUMAN_GATE--- block
    ↓
gate-manager.ts creates human_gates row (status: pending)
    ↓
Slack posts Block Kit message with Approve/Reject buttons to agent's channel
    ↓
User clicks Approve/Reject
    ↓
gate-action.ts handler fires
    ↓
Checks company_members role (RBAC enforcement)
    ↓
Updates human_gates row (status: approved|rejected, approved_by, resolved_at)
    ↓
If approved: continues executing the artifact or action
If rejected: posts rejection reason to channel, records in skill_run
```

---

## Integration Clients

Each integration in `packages/integrations/src/<name>/client.ts`:
- Constructor takes credentials from `company_secrets` (decrypted at runtime)
- All methods are async, return typed results
- Errors are caught and returned as `{ error: string }` — never throw

**Integrations to build (in priority order):**
1. `stripe/` — `getMRR()`, `getChurnRate()`, `getNewCustomers(since)`, `getPaymentFailures()`
2. `linear/` — `getBacklog()`, `createIssue(title, description, project)`, `getProjectStatus()`
3. `github/` — `getOpenPRs()`, `getIssueCount()`, `getRecentReleases()`
4. `hubspot/` — `getPipelineSnapshot()`, `getDealsByStage()`, `getContactCount()`
5. `notion/` — `writePage(title, content, database_id)`, `updatePage(page_id, content)`
6. `brex/` — `getMonthlySpend()`, `getPendingExpenses()`, `getCardTransactions(since)`

---

## CLI Commands

`cli/src/commands/`:

```
agentclaw init              ← scaffold bootstrap files + .env for a new company
agentclaw doctor            ← verify all env vars set, DB connected, Slack app auth working
agentclaw install <skill>   ← install a skill from registry
agentclaw status            ← show active agents, last run times, pending gates
agentclaw memory list       ← print all team memory key-values
agentclaw memory set <k> <v> ← manually set a team memory value
```

---

## Environment Variables

```env
# Anthropic
ANTHROPIC_API_KEY=

# Slack
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SLACK_APP_TOKEN=           ← Socket Mode token (starts with xapp-)

# Database
DATABASE_URL=postgresql://localhost:5432/agentclaw

# Encryption
SECRET_ENCRYPTION_KEY=     ← 32-byte hex string for encrypting company_secrets

# Optional: integration defaults (can also be set per-company via CLI)
STRIPE_API_KEY=
LINEAR_API_KEY=
GITHUB_TOKEN=
HUBSPOT_API_KEY=
NOTION_API_KEY=
BREX_API_KEY=
```

---

## Implementation Phases

### Phase 1 — Foundation (build first)
**Goal: One working agent responds in Slack.**

1. `packages/db/` — Drizzle schema + migrations for all tables above
2. `packages/shared/` — TypeScript types: `AgentConfig`, `BootstrapContext`, `TeamMemory`, `AgentRun`, `HumanGate`
3. `packages/runtime/src/bootstrap/` — adapt from `_sources/openclaw/src/runtime/bootstrap/`; extend to load COMPANY.md, OKR.md, RUNWAY.md, TEAM.md
4. `packages/runtime/src/llm/` — `AnthropicAdapter` (streaming SDK), `prompt-builder.ts`, `output-parser.ts` (extend with OKR_UPDATE + RUNWAY_UPDATE blocks)
5. `packages/runtime/src/memory/` — `team-memory.ts`, `agent-memory.ts` (PostgreSQL-backed)
6. `packages/runtime/src/skills/` — adapt skill loader from `_sources/openclaw/`
7. `packages/slack/` — adapt Slack channel from `_sources/openclaw/src/channels/slack/`; add `/claw` slash command, gate Block Kit, Home Tab
8. `packages/runtime/src/router/` — Router Agent intent classifier (haiku model)
9. `server/` — Express entry point wiring everything together
10. `docker-compose.yml` — PostgreSQL + server
11. First agent: `agents/gtm-agent.md` + skills: `skills/cold-email.md`, `skills/icp.md`

**Milestone gate:** `/claw @gtm draft an ICP for B2B legal SaaS` → structured artifact in `#gtm-agent`

### Phase 2 — Agent Library
All 5 agents fully operational with complete skill sets + integrations.

### Phase 3 — Skills Marketplace
Installable skills as npm packages. `agentclaw install stripe`.

### Phase 4 — Team Features
Multi-user auth, RBAC, shared memory editor, activity feed, cost tracking.

---

## Key Files to Adapt from OpenClaw Source

Copy these first, then modify:

| Source file | Target | Changes needed |
|---|---|---|
| `_sources/openclaw/src/runtime/llm/` | `packages/llm/src/` | Keep provider/model format; add Bedrock + Mistral if missing; add fallback runner |
| `_sources/openclaw/src/runtime/bootstrap/loader.ts` | `packages/runtime/src/bootstrap/loader.ts` | Add COMPANY.md, OKR.md, RUNWAY.md, TEAM.md loaders |
| `_sources/openclaw/src/runtime/output-parser.ts` | `packages/runtime/src/llm/output-parser.ts` | Add OKR_UPDATE, RUNWAY_UPDATE block types |
| `_sources/openclaw/src/runtime/heartbeat/scheduler.ts` | `packages/runtime/src/heartbeat/scheduler.ts` | Add company_id scoping, PostgreSQL run logging |
| `_sources/openclaw/src/channels/slack/` | `packages/slack/src/` | Add `/claw` slash command, gate Block Kit, startup-aware formatting |
| `_sources/openclaw/src/runtime/skills/loader.ts` | `packages/runtime/src/skills/loader.ts` | Minimal changes — add `agents` frontmatter field |
| `_sources/awesome-openclaw-agents/gtm/` | `agents/gtm-agent.md` | Add OKR/RUNWAY awareness, set model as `provider/model`, add fallback |
| `_sources/awesome-openclaw-agents/finance/` | `agents/finance-agent.md` | Add RUNWAY.md integration, provider/model format |
| `_sources/awesome-openclaw-agents/engineering/` | `agents/dev-agent.md` | Add Linear/GitHub hooks, provider/model format |

**Do NOT copy from openclaw:**
- Multi-channel gateway (Telegram, WhatsApp, etc.) — AgentClaw is Slack-only
- Personal user identity system — replace with company_members team model
- Local file-based memory — replace with PostgreSQL team memory

---

## What NOT to Do

- Do not copy OpenClaw's multi-channel router — we are Slack-only in Phase 1
- Do not use subprocess to call Claude — use `@anthropic-ai/sdk` streaming directly
- Do not store secrets in bootstrap `.md` files — use `company_secrets` table, inject at runtime
- Do not expose one company's data to another — always filter by `company_id`
- Do not let agents write to memory categories outside their own (GTM agent cannot write `finance` memory)
- Do not approve gates automatically — all gates require a human click in Slack

---

## Reference Docs

- `docs/PRODUCT_DOCUMENT.md` — full product vision and user stories
- `docs/ARCHITECTURE.md` — component diagram and data flow
- `docs/IMPLEMENTATION_GUIDE.md` — phase-by-phase step-by-step build instructions
- `docs/AGENT_SPECS.md` — per-agent detailed specifications (prompts, skills, gates)
- `bootstrap/*.example` — example startup bootstrap files
