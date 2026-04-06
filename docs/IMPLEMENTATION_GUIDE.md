# AgentClaw — Implementation Guide

> Step-by-step instructions for building AgentClaw on top of OpenClaw open-source base.
> Follow phases in order. Do not skip ahead.

---

## Prerequisites

- Node.js 22.14+ (OpenClaw requires 22.14+)
- pnpm 9+
- Docker Desktop (for local PostgreSQL)
- Slack workspace with admin access (to install app)
- Anthropic API key

---

## Phase 1: Foundation

### Step 1 — Initialize Monorepo

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
  - 'server'
  - 'cli'
```

Create root `package.json`:
```json
{
  "name": "agentclaw",
  "private": true,
  "scripts": {
    "dev": "node --watch server/src/index.ts",
    "db:migrate": "pnpm --filter @agentclaw/db migrate",
    "db:studio": "pnpm --filter @agentclaw/db studio"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "@types/node": "^22.0.0"
  }
}
```

Run: `pnpm install`

---

### Step 2 — Database Package (`packages/db/`)

**Copy reference:** Look at `_sources/openclaw/` for any existing DB adapter patterns.
**Build with Drizzle ORM + PostgreSQL.**

`packages/db/package.json`:
```json
{
  "name": "@agentclaw/db",
  "main": "./src/index.ts",
  "dependencies": {
    "drizzle-orm": "^0.38.0",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0"
  }
}
```

Create all schema files in `packages/db/src/schema/` per the table definitions in `COPILOT_CONTEXT.md`.

Create `packages/db/src/migrate.ts` — runs migrations on startup.

Create `packages/db/drizzle.config.ts`:
```typescript
export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! }
}
```

**Test:** `pnpm db:migrate` creates all tables successfully.

---

### Step 3 — Shared Types Package (`packages/shared/`)

Define TypeScript types in `packages/shared/src/types/`:

**`bootstrap.ts`:**
```typescript
export interface BootstrapContext {
  company: CompanyContext;
  team: TeamContext;
  okrs: OKRSet;
  runway: RunwaySnapshot;
  agents: AgentRegistry;
  skills: SkillManifest;
  heartbeat: HeartbeatSchedule;
}

export interface CompanyContext {
  name: string;
  oneLiner: string;
  stage: string;
  businessModel: string;
  targetMarket: string;
  topPriorities: string[];
  raw: string; // full markdown
}

export interface OKRSet {
  quarter: string;
  objectives: Objective[];
  raw: string;
}

export interface Objective {
  id: string;
  title: string;
  keyResults: KeyResult[];
}

export interface KeyResult {
  id: string;
  description: string;
  current: string;
  target: string;
}

export interface RunwaySnapshot {
  cashBalance: number;
  monthlyBurn: number;
  runwayMonths: number;
  mrr: number;
  nextRaiseTarget?: number;
  nextRaiseTimeline?: string;
  asOf: string;
  raw: string;
}
```

**`agent.ts`:**
```typescript
export interface AgentConfig {
  name: string;
  model: string;
  channel: string;
  skills: string[];
  routeKeywords: string[];
  gateTypes: GateType[];
  memoryCategory: MemoryCategory;
  raw: string;
}

export type GateType = 'strategy' | 'spend' | 'hire' | 'legal';
export type MemoryCategory = 'company' | 'gtm' | 'hiring' | 'finance' | 'product';
export type MemberRole = 'owner' | 'admin' | 'member' | 'read_only';

export interface AgentRunResult {
  artifacts: Artifact[];
  memoryUpdates: MemoryUpdate[];
  personalMemoryUpdates: MemoryUpdate[];
  okrUpdates: OKRUpdate[];
  runwayUpdates: RunwayUpdate[];
  humanGates: HumanGateRequest[];
  rawOutput: string;
}

export interface HumanGateRequest {
  type: GateType;
  title: string;
  description: string;
  approvers: MemberRole[];
}

export interface Artifact {
  title: string;
  type: string;
  content: string;
  format: 'markdown' | 'json' | 'text';
}
```

---

### Step 4 — Runtime Bootstrap Loader (`packages/runtime/src/bootstrap/`)

**Copy from:** `_sources/openclaw/src/runtime/bootstrap/loader.ts`

**Modify to:**
1. Add `loadCompany()` → parses `COMPANY.md`
2. Add `loadOKRs()` → parses `OKR.md`
3. Add `loadRunway()` → parses `RUNWAY.md`
4. Add `loadTeam()` → parses `TEAM.md`
5. Keep existing `loadAgents()`, `loadSkills()`, `loadHeartbeat()` from openclaw

Implement `BootstrapSource` interface with two implementations:
- `FileSystemBootstrapSource` — reads from `~/.agentclaw/<slug>/`
- `DatabaseBootstrapSource` — reads from `bootstrap_files` table (cloud mode)

**`loader.ts` pattern:**
```typescript
export interface BootstrapSource {
  loadCompany(): Promise<CompanyContext>;
  loadTeam(): Promise<TeamContext>;
  loadOKRs(): Promise<OKRSet>;
  loadRunway(): Promise<RunwaySnapshot>;
  loadAgents(): Promise<AgentRegistry>;
  loadSkills(): Promise<SkillManifest>;
  loadHeartbeat(): Promise<HeartbeatSchedule>;
}

export async function loadBootstrap(source: BootstrapSource): Promise<BootstrapContext> {
  const [company, team, okrs, runway, agents, skills, heartbeat] = await Promise.all([
    source.loadCompany(),
    source.loadTeam(),
    source.loadOKRs(),
    source.loadRunway(),
    source.loadAgents(),
    source.loadSkills(),
    source.loadHeartbeat(),
  ]);
  return { company, team, okrs, runway, agents, skills, heartbeat };
}
```

---

### Step 5 — LLM Adapter (`packages/runtime/src/llm/`)

**Do NOT copy from openclaw** — openclaw uses subprocess. Build fresh with Anthropic SDK.

`anthropic.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicAdapter {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async run(systemPrompt: string, userMessage: string, model: string): Promise<string> {
    const response = await this.client.messages.create({
      model,
      max_tokens: 8096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  async *stream(systemPrompt: string, userMessage: string, model: string): AsyncIterable<string> {
    const stream = this.client.messages.stream({
      model,
      max_tokens: 8096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }
}
```

**`prompt-builder.ts`** — assembles the 10-layer prompt (see COPILOT_CONTEXT.md prompt structure).

**`output-parser.ts`** — copy regex block extractor from `_sources/openclaw/src/runtime/output-parser.ts`, then add `OKR_UPDATE` and `RUNWAY_UPDATE` block types.

---

### Step 6 — Memory Layer (`packages/runtime/src/memory/`)

`team-memory.ts`:
```typescript
export class TeamMemory {
  constructor(private db: Database, private companyId: string) {}

  async get(category: MemoryCategory, key: string): Promise<string | null>
  async set(category: MemoryCategory, key: string, value: string, writtenByAgent: string): Promise<void>
  async getAll(category?: MemoryCategory): Promise<TeamMemoryRow[]>
  async applyUpdates(updates: MemoryUpdate[], agentName: string): Promise<void>
}
```

`agent-memory.ts`:
```typescript
export class AgentMemory {
  constructor(private db: Database, private companyId: string, private agentName: string) {}

  async get(key: string): Promise<string | null>
  async set(key: string, value: string): Promise<void>
  async getAll(): Promise<AgentMemoryRow[]>
  async applyUpdates(updates: MemoryUpdate[]): Promise<void>
}
```

---

### Step 7 — Skill Loader (`packages/runtime/src/skills/`)

**Copy from:** `_sources/openclaw/src/runtime/skills/loader.ts`

Minimal changes:
- Add `agents` field to frontmatter schema (array of agent names that can use this skill)
- Add `memory-category` field (which memory category this skill reads from)
- Keep file scanning logic identical

---

### Step 8 — HEARTBEAT Scheduler (`packages/runtime/src/heartbeat/`)

**Copy from:** `_sources/openclaw/src/runtime/heartbeat/scheduler.ts`

Extend with:
- Accept `companyId` parameter — schedule is per-company
- Log each run to `heartbeat_runs` table
- Before running: check for any pending `HUMAN_GATE` for this agent — if exists, skip
- Post output to the `channel` specified in HEARTBEAT.md config

---

### Step 9 — Gate Manager (`packages/runtime/src/gates/`)

New file — not in openclaw base:

```typescript
export class GateManager {
  async createGate(companyId: string, agentName: string, gate: HumanGateRequest): Promise<string>
  // Returns gate ID, creates human_gates row (status: pending)

  async resolveGate(gateId: string, userId: string, decision: 'approved' | 'rejected', reason?: string): Promise<void>
  // Checks RBAC, updates row, triggers continuation if approved

  async hasPendingGate(companyId: string, agentName: string): Promise<boolean>
}
```

---

### Step 10 — Slack Interface (`packages/slack/`)

**Copy from:** `_sources/openclaw/src/channels/slack/`

**Extend with:**

`handlers/slash-command.ts` — handles `/claw @agent /skill args`:
```typescript
// Parse: agent name, skill name, args
// If no agent → call router-agent for intent classification
// Post "thinking..." message immediately
// Run agent → stream output
// Update message with result
// If contains HUMAN_GATE → call gate-manager, post Block Kit gate
```

`handlers/gate-action.ts` — handles Approve/Reject button clicks:
```typescript
// Extract gateId from action payload
// Look up user's role via company_members
// Enforce RBAC (reject if role insufficient for gate type)
// Call gate-manager.resolveGate()
// Update Slack message to show outcome
```

`handlers/home-tab.ts` — App Home dashboard:
```typescript
// Show: company name, active agents list, last 10 runs, pending gates, team memory viewer
```

`formatters/agent-response.ts` — converts artifact blocks to Block Kit sections:
```typescript
// ARTIFACT → rich text section with title header
// HUMAN_GATE → already handled by gate-action handler
// Long output (>3000 chars) → truncate + "See full artifact" button
```

---

### Step 11 — Router Agent

Not a full agent — a lightweight classifier. Lives in `packages/runtime/src/router/intent-router.ts`:

```typescript
export async function routeIntent(
  message: string,
  agentRegistry: AgentRegistry,
  llm: AnthropicAdapter
): Promise<{ agent: string; skill: string | null; confidence: number }> {
  // Build a short classification prompt from AGENTS.md registry
  // Call claude-haiku with the message + registry
  // Parse: { agent, skill, confidence }
  // If confidence < 0.7: return { agent: 'clarify', skill: null, confidence }
}
```

---

### Step 12 — Server Entry Point (`server/src/index.ts`)

Wire everything together:
1. Load env vars
2. Initialize DB connection + run migrations
3. Load bootstrap context (FileSystemBootstrapSource or DatabaseBootstrapSource)
4. Initialize AnthropicAdapter
5. Initialize HeartbeatScheduler
6. Initialize Bolt Slack app (Socket Mode in dev, HTTP in prod)
7. Register all Slack handlers
8. Start Express server on port 3000

---

### Step 13 — Docker Compose

`docker-compose.yml`:
```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: agentclaw
      POSTGRES_USER: agentclaw
      POSTGRES_PASSWORD: agentclaw
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  server:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://agentclaw:agentclaw@postgres:5432/agentclaw
    depends_on:
      - postgres

volumes:
  pgdata:
```

---

### Step 14 — First Agent and Skills

Create `agents/gtm-agent.md` — adapt from `_sources/awesome-openclaw-agents/gtm/` templates.
Create `skills/cold-email.md` and `skills/icp.md`.

**Phase 1 milestone test:**
```
/claw @gtm draft an ICP for B2B legal SaaS
```
Expected: Structured artifact posted to `#gtm-agent` in Slack.

---

## Phase 2: Agent Library

After Phase 1 milestone passes, build remaining agents:

1. `agents/hiring-agent.md` + skills: `jd.md`, `interview-plan.md`, `scorecard.md`, `offer-letter.md`, `pipeline-review.md`
2. `agents/dev-agent.md` + skills: `spec.md`, `adr.md`, `sprint-plan.md`, `postmortem.md`
3. `agents/finance-agent.md` + skills: `runway-check.md`, `investor-update.md`, `burn-scenario.md`, `spend-review.md`
4. `agents/router-agent.md` — document the router for transparency
5. Add HEARTBEAT entries for: weekly GTM digest, daily runway check

**Integrations (build in priority order):**
1. Stripe → Finance Agent `runway-check` skill reads MRR + churn
2. Linear → Dev Agent `sprint-plan` reads backlog, writes issues
3. GitHub → Dev Agent `postmortem` reads PR/incident data
4. HubSpot → GTM Agent `weekly-digest` reads pipeline data

---

## Phase 3: Skills Marketplace

- Define `@agentclaw-skills/*` npm package schema
- Build skill registry REST API: `GET /skills`, `POST /skills/install`, `DELETE /skills/:name`
- Slack command: `/claw install stripe`
- Skill credential vault UI in Home Tab

---

## Phase 4: Team Features

- Slack OAuth flow for multi-workspace install
- `company_members` population from Slack workspace user list
- Role assignment UI in Home Tab
- RBAC enforcement on all gate approvals
- Memory editor UI in Home Tab
- Company-level cost tracking (sum `cost_usd` from `skill_runs`)

---

## Common Gotchas

1. **OpenClaw uses subprocess for LLM calls.** AgentClaw uses `@anthropic-ai/sdk` directly. Do not copy the subprocess invocation pattern.

2. **OpenClaw memory is personal (per-user file).** AgentClaw memory is team-shared (PostgreSQL). The memory API is completely different.

3. **OpenClaw multi-channel gateway.** Only copy the Slack channel implementation, not the gateway router. The gateway routes to multiple channels — we don't need that.

4. **Bootstrap files must be loaded per-company at runtime**, not once at server startup. Every agent run loads the bootstrap context for its specific company.

5. **Secrets injection.** Integration API keys from `company_secrets` table must be decrypted and injected into skill calls. Never put API keys in bootstrap markdown files.

6. **Gate RBAC.** The `gate_type` determines which roles can approve. Enforce this in `gate-action.ts`, not in the LLM prompt.

7. **Streaming to Slack.** Slack's `chat.update` has rate limits. Buffer streamed chunks and update every 1 second, not on every token.
