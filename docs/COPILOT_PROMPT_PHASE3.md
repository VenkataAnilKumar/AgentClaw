# AgentClaw — Phase 3 Copilot Prompt (Skills Marketplace)

> Paste everything below this line as your first message to the copilot.

---

Phases 1 and 2 of AgentClaw are complete and validated. All 5 agents (GTM, Hiring, Dev, Finance, Legal), 18 skills, 4 integrations (Stripe, Linear, GitHub, HubSpot), and HEARTBEAT schedules are working.

You are now implementing **Phase 3: Skills Marketplace** — the ability for startup teams to install additional skills and integrations without touching code, via `agentclaw install <skill>` and Slack commands.

---

## What Is Already Built (do not rebuild)

- Full monorepo: `packages/db`, `packages/shared`, `packages/llm`, `packages/runtime`, `packages/slack`, `packages/integrations`
- All 5 agents + 18 skills in `agents/` and `skills/`
- 4 integrations: Stripe, Linear, GitHub, HubSpot in `packages/integrations/src/`
- HEARTBEAT scheduler running per company
- `company_secrets` table for per-company encrypted credentials
- `cli/` stub (init, doctor commands)

---

## Phase 3 Goals

1. Skills are versioned npm packages (`@agentclaw-skills/<name>`) installable via CLI or Slack
2. Integrations expose install-time credential prompts
3. Company admins manage installed skills + credentials via Slack Home Tab
4. 4 new integrations added: Notion, Brex, Calendly, Slack-ops
5. Skill registry API for listing + installing skills

---

## Phase 3 Build Order

### Step 1 — Skill Package Schema

Define the standard schema every installable skill package must follow.

**`packages/shared/src/types/skill-package.ts`:**
```typescript
export interface SkillPackageManifest {
  name: string                    // e.g. "stripe-mrr"
  displayName: string             // e.g. "Stripe MRR Snapshot"
  version: string                 // semver
  description: string
  agents: string[]                // which agents can use it
  requiredSecrets: SecretDef[]    // credentials the user must provide
  optionalSecrets: SecretDef[]
  memoryWrites: string[]          // memory keys this skill may write
  gateRequired: GateType | null
  heartbeatCapable: boolean       // can run on a schedule
}

export interface SecretDef {
  key: string           // e.g. "NOTION_API_KEY"
  label: string         // e.g. "Notion Integration Token"
  helpUrl: string       // link to where user gets this key
  sensitive: boolean    // mask in UI
}
```

Each installable skill is an npm package with:
- `manifest.json` — the `SkillPackageManifest`
- `skill.md` — the prompt template (same format as built-in skills)
- `client.ts` (optional) — integration API client if skill needs external data

---

### Step 2 — Skill Registry API (`server/src/routes/skills.ts`)

REST endpoints for skill management:

```
GET    /api/skills                     — list all available skills (registry + installed)
GET    /api/skills/installed           — list installed skills for a company
POST   /api/skills/install             — install a skill package
DELETE /api/skills/:name               — uninstall a skill
GET    /api/skills/:name/manifest      — get manifest for a skill
POST   /api/skills/:name/configure     — set secrets for a skill
```

**Registry sources (in priority order):**
1. `packages/skills-registry/` — local registry of all `@agentclaw-skills/*` packages
2. npm registry — future: search `@agentclaw-skills/` scope

**`POST /api/skills/install` body:**
```json
{
  "companyId": "...",
  "skillName": "notion-write",
  "secrets": { "NOTION_API_KEY": "secret_..." }
}
```

Steps on install:
1. Validate `skillName` exists in registry
2. Encrypt and store each secret in `company_secrets` table
3. Copy `skill.md` to company's active skills directory
4. Update `SKILLS.md` bootstrap file for this company
5. Return success + any HEARTBEAT suggestions

Add new DB table:
```typescript
installed_skills: {
  id, company_id, skill_name, version, installed_by, installed_at, enabled
}
```

---

### Step 3 — Skills Registry Package (`packages/skills-registry/`)

Local registry listing all available `@agentclaw-skills/*` packages with their manifests.

**`packages/skills-registry/src/index.ts`:**
```typescript
export const REGISTRY: SkillPackageManifest[] = [
  // Built-in skills (no install needed)
  { name: 'icp', displayName: 'ICP Generator', ... },
  { name: 'cold-email', ... },
  // ... all 18 built-in skills

  // Installable integration skills
  { name: 'notion-write', displayName: 'Write to Notion', requiredSecrets: [NOTION_API_KEY], ... },
  { name: 'brex-spend', displayName: 'Brex Spend Review', requiredSecrets: [BREX_API_KEY], ... },
  { name: 'calendly-booked', displayName: 'Calendly Booking Rate', requiredSecrets: [CALENDLY_API_KEY], ... },
  { name: 'slack-announce', displayName: 'Slack Channel Announcement', requiredSecrets: [], ... },
  { name: 'github-release-notes', displayName: 'GitHub Release Notes', requiredSecrets: [GITHUB_TOKEN], ... },
  { name: 'hubspot-contacts', displayName: 'HubSpot Contact Enrichment', requiredSecrets: [HUBSPOT_API_KEY], ... },
]
```

---

### Step 4 — CLI Install Command (`cli/src/commands/install.ts`)

`agentclaw install <skill-name>`

Flow:
1. Look up skill in registry — show manifest (description, required secrets, which agents use it)
2. Prompt user for each `requiredSecret` (masked input for sensitive keys)
3. `POST /api/skills/install` with secrets
4. On success: print confirmation + example usage command
5. If skill has HEARTBEAT capability: suggest adding to HEARTBEAT.md

```bash
$ agentclaw install notion-write

Installing: Notion Write (v1.0.0)
This skill lets agents write artifacts directly to Notion pages.
Used by: gtm-agent, dev-agent, hiring-agent

Required credentials:
? Notion Integration Token: **********************

✓ notion-write installed for Acme AI
✓ Credentials stored securely

Usage: /claw @dev /spec "payment feature" → artifacts will be written to Notion
Tip: Add to HEARTBEAT.md to auto-sync weekly digests to Notion
```

Also add to existing CLI commands:
- `agentclaw skills list` — list installed skills with status
- `agentclaw skills remove <name>` — uninstall a skill + delete its secrets

---

### Step 5 — Slack Install Flow (`/claw install <skill>`)

Add Slack slash command handler for skill installation:

`/claw install notion-write`

Flow:
1. Look up skill in registry
2. Post Block Kit modal with secret input fields (marked as sensitive = password type)
3. On modal submit: call `POST /api/skills/install`
4. Post confirmation message to channel

**Block Kit modal structure:**
```
Title: Install Notion Write

[Section] Notion Write v1.0.0
Lets agents write artifacts directly to Notion pages.
Used by: GTM, Dev, Hiring agents.

[Input] Notion Integration Token
hint: Get this from notion.so/my-integrations
type: password (masked)

[Actions] Install  |  Cancel
```

---

### Step 6 — New Integration Clients

#### 6a. Notion (`packages/integrations/src/notion/client.ts`)

```typescript
class NotionClient {
  writePage(title: string, content: string, databaseId: string): Promise<{ pageId: string; url: string; error?: string }>
  updatePage(pageId: string, content: string): Promise<{ url: string; error?: string }>
  searchDatabase(databaseId: string, query: string): Promise<{ pages: Page[]; error?: string }>
  appendToPage(pageId: string, content: string): Promise<{ error?: string }>
}
```

Secret key: `NOTION_API_KEY`
SDK: `@notionhq/client`
Used by: All agents — write artifacts to Notion after generation

**`skills/notion-write.md`** — skill that writes the most recent artifact to a configured Notion database. Args: `<optional page title override>`.

#### 6b. Brex (`packages/integrations/src/brex/client.ts`)

```typescript
class BrexClient {
  getMonthlySpend(month?: string): Promise<{ total: number; by_category: Record<string, number>; error?: string }>
  getPendingExpenses(): Promise<{ expenses: Expense[]; total: number; error?: string }>
  getCardTransactions(since: Date): Promise<{ transactions: Transaction[]; error?: string }>
  getBudgetStatus(): Promise<{ budgets: Budget[]; error?: string }>
}
```

Secret key: `BREX_API_KEY`
SDK: Brex REST API (no official npm SDK — use `node-fetch`)
Used by: Finance Agent `spend-review` and `runway-check` skills

**`skills/brex-spend.md`** — reads Brex spend data and categorizes for Finance Agent. No args needed.

#### 6c. Calendly (`packages/integrations/src/calendly/client.ts`)

```typescript
class CalendlyClient {
  getBookingRate(since: Date): Promise<{ booked: number; cancelled: number; rate: number; error?: string }>
  getUpcomingMeetings(days?: number): Promise<{ meetings: Meeting[]; error?: string }>
  getEventTypes(): Promise<{ types: EventType[]; error?: string }>
}
```

Secret key: `CALENDLY_API_KEY`
SDK: Calendly REST API v2
Used by: GTM Agent — measures outreach-to-meeting conversion rate

**`skills/calendly-booked.md`** — reports meeting booking rate for GTM weekly digest.

#### 6d. Slack-ops (`packages/integrations/src/slack-ops/client.ts`)

No external API key needed — uses existing `SLACK_BOT_TOKEN`.

```typescript
class SlackOpsClient {
  postToChannel(channelId: string, text: string, blocks?: Block[]): Promise<{ ts: string; error?: string }>
  createChannel(name: string): Promise<{ channelId: string; error?: string }>
  inviteToChannel(channelId: string, userIds: string[]): Promise<{ error?: string }>
  getChannelMembers(channelId: string): Promise<{ members: string[]; error?: string }>
  scheduleMessage(channelId: string, text: string, postAt: Date): Promise<{ error?: string }>
}
```

Used by: All agents — post announcements, create channels for new hires, schedule messages.

**`skills/slack-announce.md`** — posts a formatted announcement to a specified Slack channel. Args: `<channel> <message>`.

---

### Step 7 — Slack Home Tab: Skills Management Panel

Extend `packages/slack/src/handlers/home-tab.ts` to add a Skills section.

**Home Tab layout (add after existing memory/agents sections):**

```
━━━━━━━━━━━━━━━━━━━━━
📦 Installed Skills
━━━━━━━━━━━━━━━━━━━━━

✅ icp          (built-in)  Used by: GTM
✅ cold-email   (built-in)  Used by: GTM
✅ notion-write (installed) Used by: GTM, Dev, Hiring  [Remove]
✅ brex-spend   (installed) Used by: Finance           [Remove]
⭕ calendly-booked          Not installed              [Install]
⭕ slack-announce           Not installed              [Install]

[+ Browse All Skills]
```

Each `[Install]` button opens the install modal (Step 5).
Each `[Remove]` button calls `DELETE /api/skills/:name` with confirmation prompt.

---

### Step 8 — Auto-wire Installed Skills into Agent Runs

Extend `agent-runner.ts` to dynamically load installed integration skills:

```typescript
// Before building prompt, load installed skills for this company
const installedSkills = await db.query.installedSkills.findMany({
  where: and(
    eq(installedSkills.companyId, companyId),
    eq(installedSkills.enabled, true)
  )
})

// For each installed skill that has an integration client:
for (const skill of installedSkills) {
  const secret = await db.getSecret(companyId, skill.requiredSecretKey)
  if (secret) {
    const data = await runIntegrationSnapshot(skill.name, secret)
    if (data && !data.error) {
      liveData.push(formatIntegrationData(skill.name, data))
    }
  }
}
// Inject liveData as Layer 11 in prompt if non-empty
```

---

### Step 9 — `agentclaw doctor` Enhancement

Extend `cli/src/commands/doctor.ts` to check installed skills:

```
$ agentclaw doctor

✓ Database connected (PostgreSQL)
✓ Slack app authenticated (AgentClaw)
✓ Anthropic API key valid
✗ OpenAI API key not set (fallback will skip openai/*)
✓ Ollama detected at localhost:11434 (llama3.3 available)

Installed Skills:
✓ notion-write  — Notion API connected
✓ brex-spend    — Brex API connected
⚠ hubspot       — HubSpot API key set but returns 401 (check scopes)

Agents:
✓ gtm-agent     last run: 2 hours ago
✓ hiring-agent  last run: 1 day ago
✓ dev-agent     last run: 3 hours ago
✓ finance-agent last run: 8 hours ago (HEARTBEAT)
⭕ legal-agent   inactive

HEARTBEAT:
✓ weekly-digest    next: Mon 9:00am
✓ runway-check     next: tomorrow 8:00am
✓ pipeline-review  next: Tue 10:00am
```

---

### Step 10 — `agentclaw init` Enhancement

Extend `cli/src/commands/init.ts` to include skill marketplace onboarding:

After scaffolding bootstrap files, add an interactive step:
```
Which integrations does your team use? (space to select, enter to confirm)

 ◉ Stripe      (recommended for finance agent)
 ◉ Linear      (recommended for dev agent)
 ◉ GitHub      (recommended for dev agent)
 ○ HubSpot     (for GTM pipeline)
 ○ Notion      (write artifacts to Notion)
 ○ Brex        (for finance spend review)
 ○ Calendly    (for GTM meeting tracking)

Installing Stripe...
? Stripe Secret Key: sk_live_****

Installing Linear...
? Linear API Key: lin_api_****

✓ 2 integrations installed
✓ Bootstrap files created at ~/.agentclaw/acme-ai/
✓ Ready. Run: pnpm dev
```

---

## Phase 3 Completion Checklist

- [ ] `installed_skills` table migrated
- [ ] Skill registry lists all 18 built-in + 6 installable skills
- [ ] `POST /api/skills/install` stores secrets + updates SKILLS.md
- [ ] `agentclaw install notion-write` prompts for key and installs end-to-end
- [ ] `/claw install brex-spend` Slack modal works end-to-end
- [ ] Notion client writes artifacts to a test database
- [ ] Brex client returns spend data (or gracefully errors if no key)
- [ ] Calendly client returns booking rate
- [ ] Slack-ops client posts to a test channel
- [ ] Home Tab shows installed/available skills with install/remove buttons
- [ ] `agentclaw doctor` shows skill health status
- [ ] `agentclaw init` includes integration selection step
- [ ] Installed integration data appears as Layer 11 in agent prompts

---

## Critical Rules (unchanged from Phase 1 + 2)

1. Never subprocess any LLM — use `packages/llm/` adapters
2. Always `provider/model` format
3. Every DB query must include `company_id`
4. Never store secrets in markdown — `company_secrets` table only
5. Never auto-approve gates
6. Integration errors must never crash agent runs — degrade gracefully
7. Skill install must require `owner` or `admin` role — check `company_members`
8. Sensitive secret fields in Slack modals must use `password` type (masked)

---

## Reference Docs

- `docs/ARCHITECTURE.md` — integration wiring pattern (Layer 11 live data)
- `docs/IMPLEMENTATION_GUIDE.md` — Phase 3 section
- `bootstrap/SKILLS.md.example` — skills manifest format
- `packages/integrations/src/stripe/client.ts` — reference integration client pattern
