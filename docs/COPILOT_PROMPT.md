# AgentClaw — Copilot Implementation Prompt

> Copy everything below this line and paste it as your first message to the copilot.

---

You are implementing **AgentClaw** — a startup-native AI agent framework built on top of OpenClaw (MIT open source). Your job is to build the full working codebase by adapting open-source code already placed in `_sources/` and writing only what's new.

---

## Project

**AgentClaw** — "Your startup's first AI teammates. In Slack, where you already work."

AgentClaw brings GTM, Hiring, Finance, Dev, and Legal AI agents to a startup's Slack workspace. It is built on top of `_sources/openclaw/` (MIT) with startup-specific additions layered on top. Do not build from scratch what already exists in `_sources/`.

---

## Working Directory

`V:/AI Engineer/GitHub/AgentClaw/` (or the current project root if opened differently)

The following sources are already placed in `_sources/`:
- `_sources/openclaw/` — OpenClaw core runtime, Slack channel, skill loader, heartbeat scheduler, bootstrap loader, output parser **(primary base — MIT)**
- `_sources/ClawTeam-OpenClaw/` — multi-agent team routing patterns
- `_sources/awesome-openclaw-agents/` — 162 agent `.md` templates (gtm/, finance/, hr/, engineering/ categories)
- `_sources/openclaw-office/` — dashboard UI + WebSocket gateway reference
- `_sources/bolt-ts-starter-template/` — Slack Bolt.js TypeScript starter

---

## Tech Stack

- **Language:** TypeScript, Node.js 22+
- **Package manager:** pnpm workspaces (monorepo)
- **LLM:** Multi-provider abstraction — same pattern as OpenClaw. `provider/model` format. Copy `_sources/openclaw/src/runtime/llm/` as the base adapter layer.
- **Slack:** `@slack/bolt` v4 — Socket Mode for dev, HTTP for prod
- **Database:** PostgreSQL 16 + Drizzle ORM
- **Scheduler:** `node-cron` for HEARTBEAT

### Supported LLM Providers (adapt from OpenClaw's provider system)

| Provider key | SDK / transport | Env var |
|---|---|---|
| `anthropic` | `@anthropic-ai/sdk` | `ANTHROPIC_API_KEY` |
| `openai` | `openai` npm SDK | `OPENAI_API_KEY` |
| `google` | `@google/generative-ai` | `GEMINI_API_KEY` |
| `ollama` | OpenAI-compatible HTTP at `http://127.0.0.1:11434/v1` | none (local) |
| `groq` | OpenAI-compatible HTTP | `GROQ_API_KEY` |
| `bedrock` | `@aws-sdk/client-bedrock-runtime` | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` |
| `azure` | `openai` SDK with `azureOpenAI` transport | `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT` |
| `mistral` | `@mistralai/mistralai` | `MISTRAL_API_KEY` |

### Model Format
All agent `.md` files use `provider/model-name` format — identical to OpenClaw:
```
anthropic/claude-sonnet-4-6
openai/gpt-4o
google/gemini-2.0-flash
ollama/llama3.3
groq/llama-3.3-70b-versatile
bedrock/anthropic.claude-sonnet-4-6
mistral/mistral-large-latest
```

### Default Model Config (per company, in `config.json`)
```json
{
  "defaultModel": "anthropic/claude-sonnet-4-6",
  "fallback": ["openai/gpt-4o", "google/gemini-2.0-flash"],
  "routerModel": "anthropic/claude-haiku-4-5-20251001",
  "localModel": "ollama/llama3.3"
}
```
Agents inherit `defaultModel` unless they override it in their frontmatter.

---

## Monorepo Structure to Build

```
AgentClaw/
├── packages/
│   ├── db/           @agentclaw/db      — Drizzle schema + migrations
│   ├── shared/       @agentclaw/shared  — TypeScript types
│   ├── runtime/      @agentclaw/runtime — core engine
│   ├── slack/        @agentclaw/slack   — Bolt.js interface
│   ├── llm/          @agentclaw/llm     — Multi-provider LLM abstraction layer
│   └── integrations/ @agentclaw/integrations — Stripe, Brex, Linear, GitHub, HubSpot, Notion
├── server/           — Express entry point
├── cli/              — agentclaw CLI
├── agents/           — Agent .md files
├── skills/           — Skill .md files
├── bootstrap/        — Example bootstrap files (already exist as .example files)
├── pnpm-workspace.yaml
├── package.json
├── docker-compose.yml
└── .env.example
```

---

## Phase 1 Build Order (do in this exact sequence)

### 1. Monorepo scaffold
Create `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`. Run `pnpm install`.

### 2. `packages/db/` — Database schema
Use Drizzle ORM + PostgreSQL. Create these tables:

```typescript
companies:        { id, slug, name, plan, created_at }
company_members:  { id, company_id, slack_user_id, role, created_at }
                  // role: 'owner' | 'admin' | 'member' | 'read_only'
agents:           { id, company_id, name, enabled, channel_id, created_at }
team_memory:      { id, company_id, category, key, value, written_by_agent, updated_at }
agent_memory:     { id, company_id, agent_name, key, value, updated_at }
skill_runs:       { id, company_id, agent_name, skill_name, input, output_summary,
                    gate_id, model_used, tokens_used, cost_usd, duration_ms, created_at }
skill_run_context:{ id, company_id, agent_name, summary, created_at }
                  // Max 5 rows per (company_id, agent_name) — auto-rotate oldest
artifacts:        { id, company_id, agent_name, skill_name, title, type, content, format, run_id, created_at }
human_gates:      { id, company_id, agent_name, gate_type, title, description,
                    status, approved_by, resolved_at, slack_message_ts, created_at }
                  // status: 'pending' | 'approved' | 'rejected'
                  // gate_type: 'strategy' | 'spend' | 'hire' | 'legal'
heartbeat_runs:   { id, company_id, agent_name, skill_name, status, run_at }
company_secrets:  { id, company_id, key, encrypted_value, created_at }
```

### 3. `packages/shared/` — TypeScript types
Define: `BootstrapContext`, `CompanyContext`, `OKRSet`, `RunwaySnapshot`, `TeamContext`, `AgentConfig`, `AgentRunResult`, `Artifact`, `HumanGateRequest`, `TeamMemoryRow`, `AgentMemoryRow`, `GateType`, `MemberRole`, `MemoryCategory`, `SkillDefinition`.

### 4. `packages/runtime/src/bootstrap/` — Bootstrap loader
**Adapt from:** `_sources/openclaw/src/runtime/bootstrap/loader.ts`

Implement `BootstrapSource` interface:
```typescript
interface BootstrapSource {
  loadCompany(): Promise<CompanyContext>;   // parses COMPANY.md
  loadTeam(): Promise<TeamContext>;         // parses TEAM.md
  loadOKRs(): Promise<OKRSet>;             // parses OKR.md
  loadRunway(): Promise<RunwaySnapshot>;    // parses RUNWAY.md
  loadAgents(): Promise<AgentRegistry>;    // parses AGENTS.md
  loadSkills(): Promise<SkillManifest>;    // parses SKILLS.md
  loadHeartbeat(): Promise<HeartbeatSchedule>; // parses HEARTBEAT.md
}
```

Two implementations: `FileSystemBootstrapSource` (reads `~/.agentclaw/<slug>/`) and `DatabaseBootstrapSource` (reads from DB table for cloud mode).

Bootstrap is loaded fresh on every agent run — no caching.

### 5. `packages/llm/` — Multi-Provider LLM Abstraction

**Adapt from:** `_sources/openclaw/src/runtime/llm/` — OpenClaw already has a multi-provider adapter. Copy its structure, keep the same `provider/model` format, and extend with any missing providers.

**Core interface** (`packages/llm/src/adapter.ts`):
```typescript
export interface LLMAdapter {
  run(system: string, user: string, model: string): Promise<LLMResult>
  stream(system: string, user: string, model: string): AsyncIterable<string>
}

export interface LLMResult {
  text: string
  inputTokens: number
  outputTokens: number
  model: string
  provider: string
}
```

**Provider implementations** (adapt each from openclaw):
```typescript
packages/llm/src/providers/
  anthropic.ts   ← @anthropic-ai/sdk
  openai.ts      ← openai npm SDK (also handles groq, azure, ollama — all OpenAI-compatible)
  google.ts      ← @google/generative-ai
  bedrock.ts     ← @aws-sdk/client-bedrock-runtime
  mistral.ts     ← @mistralai/mistralai
  ollama.ts      ← OpenAI-compatible at http://127.0.0.1:11434/v1 (auto-detected if running)
```

**`packages/llm/src/registry.ts`** — parses `provider/model` string, returns correct adapter:
```typescript
export function resolveAdapter(modelRef: string): { adapter: LLMAdapter; modelId: string }
// "anthropic/claude-sonnet-4-6" → AnthropicAdapter + "claude-sonnet-4-6"
// "openai/gpt-4o"               → OpenAIAdapter   + "gpt-4o"
// "ollama/llama3.3"             → OllamaAdapter   + "llama3.3"
// "google/gemini-2.0-flash"     → GoogleAdapter   + "gemini-2.0-flash"
```

**`packages/llm/src/runner.ts`** — handles fallback chains:
```typescript
export async function runWithFallback(
  modelRef: string,
  fallbacks: string[],
  system: string,
  user: string
): Promise<LLMResult>
// Try primary model → on rate-limit or error → try each fallback in order
// Log which model was actually used to skill_runs.model_used
```

**Agent model config** (in agent frontmatter `.md` files):
```yaml
---
name: gtm-agent
model: anthropic/claude-sonnet-4-6          # primary
fallback:                                    # auto-tried on failure
  - openai/gpt-4o
  - google/gemini-2.0-flash
  - ollama/llama3.3                          # local fallback if Ollama running
---
```

If no `model` in agent frontmatter → use company's `config.json` `defaultModel`.
If no `config.json` → default to `anthropic/claude-sonnet-4-6`.

**`packages/runtime/src/llm/` — prompt builder + output parser** (separate from provider layer):

**prompt-builder.ts** — assemble the 10-layer system prompt in this exact order:
```
[1] SYSTEM IDENTITY      ← agents/<agent-name>.md content
[2] COMPANY CONTEXT      ← COMPANY.md content
[3] OKR CONTEXT          ← OKR.md content
[4] RUNWAY CONTEXT       ← RUNWAY.md content
[5] TEAM CONTEXT         ← TEAM.md content
[6] AVAILABLE SKILLS     ← compact skill list (name + description)
[7] TEAM MEMORY          ← team_memory rows for this company
[8] PERSONAL MEMORY      ← agent_memory rows for (company_id, agent_name)
[9] RUN HISTORY          ← last 5 skill_run_context summaries (400 chars each)
[10] TASK                ← user's request
```

**output-parser.ts** — **adapt from** `_sources/openclaw/src/runtime/output-parser.ts`, then add two new block types:
```
---ARTIFACT_START--- / ---ARTIFACT_END---       (exists in openclaw)
---MEMORY_UPDATE--- / ---END_MEMORY_UPDATE---   (exists in openclaw)
---PERSONAL_MEMORY--- / ---END_PERSONAL_MEMORY--- (exists in openclaw)
---HUMAN_GATE--- / ---END_HUMAN_GATE---         (exists in openclaw)
---OKR_UPDATE--- / ---END_OKR_UPDATE---         ← NEW: add this
---RUNWAY_UPDATE--- / ---END_RUNWAY_UPDATE---   ← NEW: add this
```

Memory category enforcement: agents can only write memory keys prefixed with their `memory-category`. E.g. gtm-agent can only write `gtm.*` keys. Drop violations silently + log.

### 6. `packages/runtime/src/memory/`

`TeamMemory` class: `get(category, key)`, `set(category, key, value, agentName)`, `getAll(category?)`, `applyUpdates(updates[], agentName)`

`AgentMemory` class: `get(key)`, `set(key, value)`, `getAll()`, `applyUpdates(updates[])`

All queries MUST include `WHERE company_id = $companyId`. No exceptions.

### 7. `packages/runtime/src/skills/`
**Adapt from:** `_sources/openclaw/src/runtime/skills/loader.ts`

Add `agents` field to frontmatter schema (array of agent names that can use the skill).
Keep file scanning logic identical to openclaw.

### 8. `packages/runtime/src/heartbeat/`
**Adapt from:** `_sources/openclaw/src/runtime/heartbeat/scheduler.ts`

Extend:
- Accept `companyId` — schedule is per company
- Before each tick: `if (await gateManager.hasPendingGate(companyId, agentName)) return`
- After each tick: insert into `heartbeat_runs` table
- Post result to the `channel` in HEARTBEAT.md config

### 9. `packages/runtime/src/gates/gate-manager.ts`
New — not in openclaw:
```typescript
class GateManager {
  createGate(companyId, agentName, gate: HumanGateRequest): Promise<string>  // returns gateId
  resolveGate(gateId, slackUserId, decision: 'approved'|'rejected', reason?: string): Promise<void>
  hasPendingGate(companyId, agentName): Promise<boolean>
}
```
`resolveGate` must check `company_members` role against the gate type before resolving:
- `spend`, `hire`, `legal` gates: require `owner` or `admin`
- `strategy` gates: require `owner`, `admin`, or `member`

### 10. `packages/runtime/src/router/intent-router.ts`
Classify `/claw <message without agent>` using claude-haiku:
```typescript
async function routeIntent(message, agentRegistry, llm): Promise<{agent, skill, confidence}>
// If confidence < 0.7: return { agent: 'clarify', skill: null, confidence }
```

### 11. `packages/slack/`
**Adapt from:** `_sources/openclaw/src/channels/slack/`

Add/modify these handlers:
- `slash-command.ts` — handles `/claw @agent /skill args`. Parse → post "thinking..." → stream LLM → update message → handle output blocks
- `gate-action.ts` — handles Approve/Reject button clicks. Check RBAC → call gateManager.resolveGate()
- `home-tab.ts` — App Home: company memory list, active agents, recent runs, pending gates
- `formatters/agent-response.ts` — convert artifacts to Block Kit. Truncate >3000 chars, add "See full" button

Streaming to Slack: buffer chunks, call `chat.update` every 1 second (not every token — rate limits).

Do NOT copy the multi-channel gateway from openclaw. Slack only.

### 12. `packages/runtime/src/agent-runner.ts`
The central orchestrator:
```typescript
async function runAgent(params: {
  companyId: string;
  agentName: string;
  skillName: string | null;
  userMessage: string;
  slackContext: { channelId: string; userId: string; messageTs: string };
}): Promise<AgentRunResult>
```
Steps: load bootstrap → load memories → load skill → build prompt → stream LLM → parse output → apply memory updates → create gates → save artifacts → record skill_run → update run_context.

### 13. `server/src/index.ts`
Wire everything: DB init → migrations → bootstrap source → Anthropic adapter → heartbeat scheduler → Bolt app → Express server on port 3000.

### 14. `docker-compose.yml`
PostgreSQL 16-alpine + server container.

### 15. `.env.example`
```env
# Slack
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SLACK_APP_TOKEN=

# Database
DATABASE_URL=postgresql://agentclaw:agentclaw@localhost:5432/agentclaw
SECRET_ENCRYPTION_KEY=        # 32-byte hex — encrypts company_secrets rows

# LLM Providers (set whichever you use — all optional except one must be set)
ANTHROPIC_API_KEY=            # anthropic/* models
OPENAI_API_KEY=               # openai/* models
GEMINI_API_KEY=               # google/* models
GROQ_API_KEY=                 # groq/* models
MISTRAL_API_KEY=              # mistral/* models
AWS_ACCESS_KEY_ID=            # bedrock/* models
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AZURE_OPENAI_API_KEY=         # azure/* models
AZURE_OPENAI_ENDPOINT=
# Ollama: no key needed — auto-detected at http://127.0.0.1:11434/v1

# Default model (provider/model format) — used when agent has no model override
DEFAULT_MODEL=anthropic/claude-sonnet-4-6
ROUTER_MODEL=anthropic/claude-haiku-4-5-20251001

# Startup integrations (stored per-company in company_secrets — these are global defaults)
STRIPE_API_KEY=
LINEAR_API_KEY=
GITHUB_TOKEN=
HUBSPOT_API_KEY=
NOTION_API_KEY=
BREX_API_KEY=
```

### 16. First agent + skills
`agents/gtm-agent.md` — **adapt from** `_sources/awesome-openclaw-agents/gtm/` templates. Add OKR and RUNWAY awareness. Add frontmatter: `name`, `model` (as `provider/model`), `fallback` (array of `provider/model`), `channel`, `skills`, `route-keywords`, `gate-types`, `memory-category`.

`skills/cold-email.md` and `skills/icp.md` — **adapt from** openclaw skill format.

---

## Phase 1 Milestone Test

```
/claw @gtm draft an ICP for B2B legal SaaS
```
Expected result: Structured artifact posted to `#gtm-agent` in Slack with ICP framework.
This is the gate that closes Phase 1. Do not move to Phase 2 until this works end-to-end.

---

## Critical Rules

1. **Never use subprocess to call any LLM.** Use the `packages/llm/` provider adapters with streaming.
2. **Use `provider/model` format everywhere.** Never hardcode a bare model name — always prefix with provider (e.g. `anthropic/claude-sonnet-4-6`, not `claude-sonnet-4-6`).
3. **Always try fallbacks on provider errors.** Rate limits, quota exhaustion, and 5xx errors must trigger the fallback chain — never surface a bare provider error to Slack.
4. **Every DB query must include `company_id` filter.** No cross-company data leakage.
5. **Never store secrets in markdown files.** Use `company_secrets` table, decrypt at runtime. API keys for providers are stored here per company.
6. **Never auto-approve gates.** All gates require a human Slack button click.
7. **Agents can only write memory in their own category.** GTM agent cannot write `finance.*` keys.
8. **Do not copy the OpenClaw multi-channel gateway.** Slack only.
9. **Load bootstrap fresh on every agent run.** No server-startup caching of bootstrap context.
10. **Buffer Slack stream updates to 1 per second.** Not per token — Slack rate limits.

---

## Key Files to Adapt (not copy wholesale)

| Read this source | Write this target | Key changes |
|---|---|---|
| `_sources/openclaw/src/runtime/llm/` | `packages/llm/src/` | Keep provider/model format; add Bedrock, Mistral if missing; add fallback runner |
| `_sources/openclaw/src/runtime/bootstrap/loader.ts` | `packages/runtime/src/bootstrap/loader.ts` | Add COMPANY/OKR/RUNWAY/TEAM loaders |
| `_sources/openclaw/src/runtime/output-parser.ts` | `packages/runtime/src/llm/output-parser.ts` | Add OKR_UPDATE + RUNWAY_UPDATE blocks |
| `_sources/openclaw/src/runtime/heartbeat/scheduler.ts` | `packages/runtime/src/heartbeat/scheduler.ts` | Add company_id scoping + DB logging |
| `_sources/openclaw/src/channels/slack/` | `packages/slack/src/` | Add /claw command, gate Block Kit |
| `_sources/openclaw/src/runtime/skills/loader.ts` | `packages/runtime/src/skills/loader.ts` | Add `agents` frontmatter field |
| `_sources/awesome-openclaw-agents/gtm/` | `agents/gtm-agent.md` | Add OKR/RUNWAY, set model as `provider/model`, add fallback array |
| `_sources/awesome-openclaw-agents/finance/` | `agents/finance-agent.md` | Add RUNWAY.md integration, provider/model format |
| `_sources/awesome-openclaw-agents/engineering/` | `agents/dev-agent.md` | Add Linear/GitHub hooks, provider/model format |

---

## Reference Docs (read these before implementing)

- `docs/IMPLEMENTATION_GUIDE.md` — detailed step-by-step for each component
- `docs/ARCHITECTURE.md` — full system diagram, request lifecycle, security model
- `docs/AGENT_SPECS.md` — per-agent prompts, skills, gates, memory rules
- `bootstrap/COMPANY.md.example` — example company bootstrap file
- `bootstrap/OKR.md.example` — example OKR file
- `bootstrap/RUNWAY.md.example` — example runway file
- `bootstrap/TEAM.md.example` — example team + RBAC file
- `bootstrap/AGENTS.md.example` — example agent registry
- `bootstrap/HEARTBEAT.md.example` — example cron schedule

---

Start with Step 1 (monorepo scaffold). Confirm each step is working before moving to the next. Ask if any step is unclear before implementing.
