# AgentClaw — Phase 4 Copilot Prompt (Team Features)

> Paste everything below this line as your first message to the copilot.

---

Phases 1, 2, and 3 of AgentClaw are complete and validated.
- Phase 1: Core runtime, LLM multi-provider, Slack interface, GTM agent
- Phase 2: All 5 agents, 18 skills, 4 integrations, HEARTBEAT schedules
- Phase 3: Skills Marketplace, CLI install, Slack modal install, Notion/Brex/Calendly/Slack-ops

You are now implementing **Phase 4: Team Features** — production-ready multi-user system with proper access control, shared memory management, activity feed, and cost tracking.

---

## What Is Already Built (do not rebuild)

- Full monorepo with all packages
- All 5 agents + 18 built-in skills + 6 installable skills
- Skill registry, CLI, Slack Home Tab (basic)
- `company_members` table exists with role field (`owner`, `admin`, `member`, `read_only`)
- `company_secrets` table with AES encryption
- Gate RBAC enforcement in `gate-manager.ts`
- `skill_runs` table tracking `tokens_used`, `cost_usd`, `model_used`

---

## Phase 4 Goals

1. **Multi-workspace Slack install** — any Slack workspace installs AgentClaw via OAuth, first user becomes owner
2. **Team member management** — invite team members, assign roles, control who approves what
3. **Shared memory editor** — view, edit, and audit all team memory from Slack Home Tab
4. **Activity feed** — full history of agent runs, gate decisions, memory updates
5. **Cost tracking** — per-company monthly spend on LLM tokens, breakdown by agent
6. **Weekly company digest** — synthesizes all agent outputs into one executive summary
7. **Production hardening** — rate limiting, error boundaries, observability

---

## Phase 4 Build Order

### Step 1 — Slack OAuth Multi-Workspace Install

Replace single-workspace Socket Mode auth with proper Slack OAuth for multi-tenant SaaS.

**New DB tables:**
```typescript
slack_installations: {
  id, team_id, team_name, bot_token, bot_user_id,
  app_id, authed_user_id, installed_at, updated_at
}
```

**OAuth flow (`server/src/routes/oauth.ts`):**
```
GET  /oauth/start        ← redirects to Slack OAuth URL
GET  /oauth/callback     ← handles code exchange, stores installation
GET  /oauth/success      ← success page shown after install
```

OAuth scopes required:
```
channels:read, channels:manage, chat:write, commands,
users:read, users:read.email, team:read,
app_mentions:read, im:read, im:write
```

**First-install flow:**
1. User clicks "Add to Slack" → OAuth callback fires
2. Create `companies` row (slug from team name)
3. Create `slack_installations` row
4. Create `company_members` row for installing user with role `owner`
5. Post welcome DM to installing user:
   ```
   Welcome to AgentClaw! 🦞
   Run /claw init to set up your company profile.
   Run /claw invite @teammate to add your team.
   ```
6. Create default Slack channels: `#gtm-agent`, `#hiring-agent`, `#dev-agent`, `#finance-agent`, `#founders`, `#team-updates`

**Bolt app update:** Switch from `SocketModeReceiver` to `ExpressReceiver` with OAuth state store backed by PostgreSQL.

---

### Step 2 — Team Member Management

**`/claw invite @user as <role>`** — invite a Slack user to AgentClaw:

```
/claw invite @priya as admin
/claw invite @james as member
/claw invite @sarah as read_only
```

Handler in `packages/slack/src/handlers/slash-command.ts`:
1. Look up Slack user profile from `@user` mention
2. Check invoking user is `owner` or `admin` (only they can invite)
3. Insert into `company_members`
4. Send DM to invited user:
   ```
   @venkat has added you to AgentClaw as admin.
   You can now use /claw in this workspace.
   Run /claw help to get started.
   ```

**`/claw team`** — list all team members and their roles:
```
Team — Acme AI

@venkat   owner   joined Apr 2026
@priya    admin   joined Apr 2026
@james    member  joined Apr 2026

Use /claw invite @user as <role> to add teammates.
Use /claw role @user <new-role> to change a role.
```

**`/claw role @user <role>`** — change a member's role (owner only):
```
/claw role @james admin
```

**`/claw remove @user`** — remove a member (owner only). Confirm with Block Kit dialog before executing.

**Role permission matrix** (enforce in every handler):
```typescript
const ROLE_PERMISSIONS = {
  owner:     ['invite', 'remove', 'role', 'approve:all', 'install:skills', 'memory:edit'],
  admin:     ['invite', 'approve:strategy', 'approve:spend', 'approve:hire', 'install:skills', 'memory:edit'],
  member:    ['approve:strategy', 'memory:view'],
  read_only: ['memory:view'],
}
```

---

### Step 3 — Shared Memory Editor (Slack Home Tab)

Extend `packages/slack/src/handlers/home-tab.ts` with a full memory management panel.

**Memory section layout:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 Company Memory
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GTM
  gtm.icp          "Mid-market legal ops teams, 50-500 employees..."  [Edit]
  gtm.positioning  "AI-powered contract review for lean legal teams"  [Edit]
  gtm.competitors  "Ironclad, Kira, manual review"                    [Edit]

Hiring
  hiring.pipeline  "3 candidates in final round for eng role"         [Edit]

Finance
  finance.runway_trend  "Stable, 19mo runway as of Apr 2026"          [Edit]

Product
  product.stack  "Next.js, PostgreSQL, Anthropic"                     [Edit]

[+ Add Memory Key]
```

**`[Edit]` button** → opens a plain-text modal to update the value → on submit calls `PATCH /api/memory/:key`.
**`[+ Add Memory Key]`** → modal with category dropdown + key + value fields.

**Memory audit log** — below the editor:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Memory Audit Log
━━━━━━━━━━━━━━━━━━━━━━━━━━
gtm.icp         updated by gtm-agent       2h ago
hiring.pipeline updated by hiring-agent    1d ago
gtm.positioning updated by @venkat (human) 3d ago
```

Store human edits with `written_by_agent = 'human:<slack_user_id>'`.

**New REST endpoints (`server/src/routes/memory.ts`):**
```
GET    /api/memory              — list all team memory for company
GET    /api/memory/:key         — get single key
PATCH  /api/memory/:key         — update value (human edit)
POST   /api/memory              — create new key
DELETE /api/memory/:key         — delete key (owner/admin only)
GET    /api/memory/audit        — audit log (last 50 changes)
```

---

### Step 4 — Activity Feed

Full history of all agent activity per company.

**New DB table:**
```typescript
activity_feed: {
  id, company_id, event_type, agent_name, skill_name,
  actor,           // agent name or 'human:<slack_user_id>'
  summary,         // one-line human-readable description
  metadata,        // JSON — run_id, gate_id, memory_key, etc.
  created_at
}

// event_type values:
// 'skill_run' | 'gate_created' | 'gate_approved' | 'gate_rejected'
// 'memory_update' | 'skill_installed' | 'member_invited' | 'heartbeat_run'
```

**Write to activity feed** from:
- `agent-runner.ts` → `skill_run` event after every run
- `gate-manager.ts` → `gate_created`, `gate_approved`, `gate_rejected` events
- `team-memory.ts` → `memory_update` event on every write
- `skill install handler` → `skill_installed` event
- `invite handler` → `member_invited` event
- `heartbeat scheduler` → `heartbeat_run` event

**Activity Feed in Slack Home Tab:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Recent Activity
━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 gtm-agent ran /weekly-digest          2h ago
✅ @venkat approved spend gate ($800 HubSpot)  3h ago
🧠 finance-agent updated finance.runway_trend  8h ago
🤖 hiring-agent ran /pipeline-review     1d ago
⏰ HEARTBEAT: runway-check fired         1d ago
👤 @venkat invited @priya as admin       2d ago
📦 notion-write skill installed          3d ago

[View Full History]
```

**REST endpoint:**
```
GET /api/activity?limit=50&offset=0&agent=gtm-agent&event_type=skill_run
```

---

### Step 5 — Cost Tracking

Track LLM token spend per company per month. `skill_runs.cost_usd` is already recorded — build the aggregation layer.

**Cost calculation per provider (in `packages/llm/src/runner.ts`):**
```typescript
// After each LLM call, compute cost_usd based on model pricing:
const PRICING: Record<string, { input: number; output: number }> = {
  'anthropic/claude-sonnet-4-6':       { input: 0.000003,  output: 0.000015  },
  'anthropic/claude-opus-4-6':         { input: 0.000015,  output: 0.000075  },
  'anthropic/claude-haiku-4-5-20251001':{ input: 0.00000025,output: 0.00000125},
  'openai/gpt-4o':                     { input: 0.000005,  output: 0.000015  },
  'openai/gpt-4o-mini':                { input: 0.00000015,output: 0.0000006 },
  'google/gemini-2.0-flash':           { input: 0.000000075,output: 0.0000003},
  'groq/llama-3.3-70b-versatile':      { input: 0.00000059,output: 0.00000079},
  'ollama/*':                          { input: 0,         output: 0         }, // free
}
// cost_usd = (inputTokens * pricing.input) + (outputTokens * pricing.output)
```

**Cost aggregation REST endpoints:**
```
GET /api/costs/summary          — current month total + by agent + by model
GET /api/costs/monthly?months=3 — last N months breakdown
GET /api/costs/budget           — current budget limit + % used
POST /api/costs/budget          — set monthly budget limit
```

**Cost panel in Slack Home Tab:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━
💰 LLM Cost — April 2026
━━━━━━━━━━━━━━━━━━━━━━━━━
Total this month:  $12.40  (Budget: $50.00 — 25% used)

By agent:
  finance-agent   $4.20  (34%)   ← claude-opus-4-6
  gtm-agent       $3.80  (31%)
  dev-agent       $2.60  (21%)
  hiring-agent    $1.80  (14%)

By model:
  anthropic/claude-opus-4-6     $4.20
  anthropic/claude-sonnet-4-6   $8.20
  ollama/llama3.3               $0.00  (free)

[Set Budget Limit]
```

**Budget alert:** if monthly spend exceeds 80% of budget limit, post alert to `#founders`. If 100%, disable non-HEARTBEAT agent runs until next month (post warning to user on `/claw` commands).

---

### Step 6 — Weekly Company Digest Agent

A new meta-agent that synthesizes all agent outputs from the past week into one executive summary.

**`agents/digest-agent.md`**
- Model: `anthropic/claude-sonnet-4-6`
- Fallback: `openai/gpt-4o`, `google/gemini-2.0-flash`
- Channel: `#team-updates`
- Memory category: `company`
- Not user-invocable — HEARTBEAT only

Identity prompt:
```
You are the Weekly Digest Agent for {{company.name}}.
Every Monday morning you synthesize what all agents did last week into
one crisp executive summary for the founding team.
You read last week's activity feed, OKR progress, and memory updates.
You highlight what moved forward, what's blocked, and the top 3 priorities for this week.
Be direct, data-driven, and concise — founders read this in 2 minutes.
```

**`skills/company-digest.md`**
- Reads: `activity_feed` (last 7 days), `team_memory` (all categories), OKR.md, RUNWAY.md
- Output: digest artifact (wins this week, metrics moved, blockers, top 3 priorities, agent activity summary)
- HEARTBEAT: Every Monday 8:30am → posts to `#team-updates`

Add to `bootstrap/HEARTBEAT.md.example`:
```
## Weekly Company Digest
agent: digest-agent
skill: company-digest
schedule: "30 8 * * 1"
channel: "#team-updates"
description: Every Monday 8:30am — synthesize full week activity into executive digest
```

---

### Step 7 — Production Hardening

#### 7a. Rate Limiting (`server/src/middleware/rate-limit.ts`)

```typescript
// Per company per minute limits:
const RATE_LIMITS = {
  slashCommand:  10,   // max 10 /claw commands per company per minute
  agentRun:      5,    // max 5 concurrent agent runs per company
  skillInstall:  3,    // max 3 skill installs per company per hour
}
```

Use `express-rate-limit` with Redis or in-memory store.
On limit exceeded: post ephemeral Slack message "AgentClaw is busy, try again in a moment."

#### 7b. Error Boundaries

Wrap every agent run in try/catch. On unhandled error:
1. Post error message to the originating Slack channel (not a raw stack trace — friendly message)
2. Insert `activity_feed` event with `event_type: 'run_error'`
3. Log full error to server logs with `company_id`, `agent_name`, `skill_name`, `error_message`

```typescript
// In agent-runner.ts:
try {
  return await executeAgentRun(params)
} catch (err) {
  await logError(companyId, agentName, skillName, err)
  await slack.postEphemeral(channelId, userId,
    `Something went wrong with ${agentName}. Our team has been notified. Try again in a moment.`
  )
  throw err
}
```

#### 7c. Observability

Add structured logging throughout using `pino`:

```typescript
// Every agent run logs:
logger.info({
  event: 'agent_run',
  company_id, agent_name, skill_name,
  model_used, tokens_used, cost_usd,
  duration_ms, gate_created: boolean,
  fallback_used: boolean
})

// Every provider call logs:
logger.info({
  event: 'llm_call',
  provider, model, input_tokens, output_tokens,
  duration_ms, fallback_attempt: number
})
```

#### 7d. Health Check Endpoint

Extend `server/src/routes/health.ts`:
```
GET /health
```
Returns:
```json
{
  "status": "ok",
  "db": "connected",
  "slack": "authenticated",
  "providers": {
    "anthropic": "ok",
    "openai": "ok",
    "ollama": "detected"
  },
  "companies": 3,
  "uptime_seconds": 86400
}
```

---

### Step 8 — `/claw help` Command

Complete help command showing all available agents, skills, and commands:

```
/claw help

AgentClaw 🦞 — Your startup's AI teammates

AGENTS
  /claw @gtm    /icp /cold-email /positioning /battlecard /launch-plan /weekly-digest
  /claw @hiring /jd /interview-plan /scorecard /offer-letter /pipeline-review
  /claw @dev    /spec /adr /sprint-plan /postmortem /tech-debt
  /claw @finance /runway-check /investor-update /burn-scenario /spend-review
  /claw @legal  /nda /contractor-agreement /saas-terms /privacy-policy

TEAM
  /claw invite @user as owner|admin|member|read_only
  /claw team
  /claw role @user <new-role>
  /claw remove @user

SKILLS
  /claw install <skill>
  /claw skills list

MEMORY
  (use the Home Tab to view and edit company memory)

SYSTEM
  /claw status
  /claw help
```

---

## Phase 4 Completion Checklist

- [ ] Slack OAuth flow installs AgentClaw into a new workspace end-to-end
- [ ] First installer is automatically set as `owner`
- [ ] Default channels (#gtm-agent, #hiring-agent, etc.) created on install
- [ ] `/claw invite @user as admin` adds member + sends welcome DM
- [ ] `/claw team` lists all members with roles
- [ ] `/claw role` and `/claw remove` work with correct RBAC checks
- [ ] Home Tab memory editor: view, edit, add, delete memory keys
- [ ] Memory audit log shows who changed what and when
- [ ] Activity feed records all 8 event types correctly
- [ ] Activity feed visible in Home Tab with pagination
- [ ] `skill_runs.cost_usd` populated for every run
- [ ] Cost panel in Home Tab shows breakdown by agent and model
- [ ] Budget limit can be set via Home Tab — alert fires at 80%
- [ ] Budget at 100% blocks non-HEARTBEAT runs with user-facing message
- [ ] Digest agent runs every Monday 8:30am and posts to #team-updates
- [ ] Rate limiting: >10 /claw commands/minute returns friendly message
- [ ] Error boundary: unhandled agent errors post friendly Slack message
- [ ] Structured pino logs for every agent run and LLM call
- [ ] `GET /health` returns all system status
- [ ] `/claw help` shows full command reference

---

## Critical Rules (unchanged)

1. Never subprocess any LLM — use `packages/llm/` adapters
2. Always `provider/model` format
3. Every DB query must include `company_id`
4. Never store secrets in markdown — `company_secrets` table only
5. Never auto-approve gates — human Slack click required
6. Agents write only to their own memory category
7. Slack OAuth tokens stored in `slack_installations` — never in env vars per company
8. Budget enforcement: check budget before every agent run, not after
9. Rate limits are per company, not per user — one heavy user shouldn't block teammates

---

## Reference Docs

- `docs/ARCHITECTURE.md` — security model, multi-company isolation
- `docs/AGENT_SPECS.md` — digest agent identity prompt details
- `bootstrap/HEARTBEAT.md.example` — updated with digest agent schedule
