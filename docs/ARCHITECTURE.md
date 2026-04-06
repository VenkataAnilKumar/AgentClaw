# AgentClaw — Technical Architecture

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            SLACK WORKSPACE                                │
│  /claw @gtm /cold-email enterprise buyers     @AgentClaw help            │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │ Slack Events API (Bolt.js)
┌─────────────────────────────────▼────────────────────────────────────────┐
│                         packages/slack (Bolt.js)                          │
│                                                                           │
│  slash-command.ts   app-mention.ts   gate-action.ts   home-tab.ts        │
│       │                   │               │                               │
│       └───────────────────▼───────────────┘                               │
│                    SlackEventDispatcher                                   │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼────────────────────────────────────────┐
│                        packages/runtime (Core Engine)                     │
│                                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────────────┐ │
│  │   Router    │  │  Bootstrap   │  │         AgentRunner             │ │
│  │   Agent     │→ │   Loader     │→ │  buildPrompt() [10 layers]      │ │
│  │ (classify)  │  │  (per co.)   │  │  llm.stream()                   │ │
│  └─────────────┘  └──────────────┘  │  parseOutput()                  │ │
│                                     └─────────────┬─────────────────────┘ │
│  ┌─────────────┐  ┌──────────────┐               │                       │
│  │  Heartbeat  │  │    Gate      │  ┌────────────▼──────────────────────┐ │
│  │  Scheduler  │  │   Manager   │  │         Output Handlers           │ │
│  │ (node-cron) │  │  (RBAC)     │  │  artifacts | memory | gates       │ │
│  └─────────────┘  └──────────────┘  │  okr_updates | runway_updates    │ │
│                                     └───────────────────────────────────┘ │
└─────────────────────────┬──────────────────────────┬───────────────────────┘
                          │                          │
          ┌───────────────▼───────────┐  ┌──────────▼────────────────────┐
          │    PostgreSQL (Drizzle)   │  │   Anthropic API               │
          │                          │  │   claude-sonnet-4-6           │
          │  companies               │  │   claude-haiku-4-5 (router)   │
          │  company_members         │  │   claude-opus-4-6 (finance)   │
          │  team_memory             │  └───────────────────────────────┘
          │  agent_memory            │
          │  skill_runs              │  ┌───────────────────────────────┐
          │  artifacts               │  │   packages/integrations       │
          │  human_gates             │  │                               │
          │  heartbeat_runs          │  │   stripe | brex | linear      │
          │  company_secrets         │  │   github | hubspot | notion   │
          └──────────────────────────┘  └───────────────────────────────┘
```

---

## Request Lifecycle

### User invokes `/claw @gtm /cold-email enterprise buyers`

```
1. Slack sends slash command event to server:3000/slack/events
2. slash-command.ts parses: agent=gtm-agent, skill=cold-email, args="enterprise buyers"
3. Post immediate "thinking..." message to #gtm-agent channel
4. Load BootstrapContext for company_id (FileSystemBootstrapSource or DB)
5. Load TeamMemory(company_id, category=gtm) from PostgreSQL
6. Load AgentMemory(company_id, "gtm-agent") from PostgreSQL
7. Load last 5 skill_run_context rows for (company_id, "gtm-agent")
8. buildAgentPrompt() assembles 10-layer system prompt
9. Load cold-email.md skill definition
10. llm.stream(systemPrompt, userMessage, "claude-sonnet-4-6") → AsyncIterable<string>
11. Buffer stream chunks, call chat.update every 1 second with accumulated output
12. On stream complete: parseOutput() extracts structured blocks
13. For each ARTIFACT block: insert into artifacts table, format as Block Kit
14. For each MEMORY_UPDATE block: insert into team_memory table (category: gtm)
15. For each HUMAN_GATE block: createGate() → insert into human_gates, post gate Block Kit
16. Record skill_run row (tokens_used, cost_usd, duration_ms)
17. Append summarized output to skill_run_context (rotate if >5 rows)
18. Update Slack message with final formatted output
```

### User clicks "Approve" on a HUMAN_GATE

```
1. Slack sends block_action event with action_id=approve_gate
2. gate-action.ts extracts gateId from action payload
3. Look up company_members for the Slack user_id → get role
4. Check: gate.type="spend" → requires role in ['owner', 'admin']
5. If role insufficient: post ephemeral error message to approver
6. If role sufficient:
   - Update human_gates: status=approved, approved_by=user_id, resolved_at=now
   - Update Slack gate message to show "Approved by @user"
   - If gate was blocking an artifact: post the artifact to the channel
```

---

## Bootstrap Context Loading

```
FileSystemBootstrapSource
  ~/.agentclaw/<company-slug>/
    ├── COMPANY.md  → CompanyContext
    ├── TEAM.md     → TeamContext
    ├── OKR.md      → OKRSet
    ├── RUNWAY.md   → RunwaySnapshot
    ├── AGENTS.md   → AgentRegistry
    ├── SKILLS.md   → SkillManifest
    └── HEARTBEAT.md → HeartbeatSchedule

DatabaseBootstrapSource
  bootstrap_files table
    (company_id, file_name, content, updated_at)
  Editable via Slack Home Tab in cloud mode
```

Both sources implement the same `BootstrapSource` interface.
Bootstrap is loaded fresh on every agent run — no caching.
(Files are small; disk/DB reads are negligible vs LLM call latency.)

---

## Prompt Assembly (10 layers)

```typescript
function buildAgentPrompt(ctx: {
  agent: AgentConfig;
  bootstrap: BootstrapContext;
  teamMemory: TeamMemoryRow[];
  agentMemory: AgentMemoryRow[];
  runHistory: string[];
  skill: SkillDefinition;
  userMessage: string;
}): { system: string; user: string } {

  const system = [
    `# IDENTITY\n${ctx.agent.raw}`,
    `# COMPANY\n${ctx.bootstrap.company.raw}`,
    `# OKRs\n${ctx.bootstrap.okrs.raw}`,
    `# RUNWAY\n${ctx.bootstrap.runway.raw}`,
    `# TEAM\n${ctx.bootstrap.team.raw}`,
    `# AVAILABLE SKILLS\n${formatSkillList(ctx.bootstrap.skills)}`,
    `# TEAM MEMORY\n${formatMemory(ctx.teamMemory)}`,
    `# PERSONAL MEMORY\n${formatMemory(ctx.agentMemory)}`,
    `# RECENT HISTORY\n${ctx.runHistory.join('\n---\n')}`,
  ].join('\n\n---\n\n');

  const user = `${ctx.skill.raw}\n\nUser request: ${ctx.userMessage}`;

  return { system, user };
}
```

---

## Output Block Parser

Regex-based extraction. Blocks are parsed in order. Multiple blocks of same type are allowed.

```
ARTIFACT      → artifacts[] array
MEMORY_UPDATE → teamMemoryUpdates[] (filtered by agent's allowed category)
PERSONAL_MEMORY → agentMemoryUpdates[]
OKR_UPDATE    → okrUpdates[] (updates OKR.md progress notes)
RUNWAY_UPDATE → runwayUpdates[] (updates RUNWAY.md fields)
HUMAN_GATE    → humanGates[] (creates gate, blocks artifact posting)
```

**Category enforcement on MEMORY_UPDATE:**
```typescript
function isAllowedMemoryWrite(agentName: string, memoryKey: string): boolean {
  const allowed = AGENT_MEMORY_CATEGORIES[agentName]; // e.g. 'gtm'
  return memoryKey.startsWith(allowed + '.');
}
// Violations: silently drop + log warning
```

---

## HEARTBEAT Flow

```
HeartbeatScheduler.start()
  → parse HEARTBEAT.md per company
  → for each schedule entry:
      node-cron.schedule(cron_expression, async () => {
        const hasPendingGate = await gateManager.hasPendingGate(companyId, agentName)
        if (hasPendingGate) return; // skip this tick

        const result = await agentRunner.run(companyId, agentName, skillName, '')
        await slackClient.postToChannel(channel, formatDigest(result))
        await db.insert(heartbeat_runs, { companyId, agentName, skillName, status: 'ok' })
      })
```

---

## Integration Architecture

All integrations follow the same pattern:

```typescript
// packages/integrations/src/stripe/client.ts
export class StripeClient {
  constructor(private apiKey: string) {}

  async getMRR(): Promise<{ mrr: number; currency: string }> {
    // Stripe API call
    // Return typed result — never throw
    // On error: return { error: 'description' }
  }
}

// Usage in skill execution:
const secret = await db.getSecret(companyId, 'STRIPE_API_KEY'); // decrypts
if (secret) {
  const stripe = new StripeClient(secret);
  const { mrr } = await stripe.getMRR();
  // inject into prompt context
}
```

Secrets are decrypted at runtime from `company_secrets` table using `SECRET_ENCRYPTION_KEY` env var.
They are never stored in plaintext, never logged, never put in prompts.

---

## Multi-Company Isolation

Every database query is scoped to `company_id`. No query exists without a `company_id` filter.

```typescript
// Always like this:
await db.query.teamMemory.findMany({
  where: eq(teamMemory.companyId, companyId) // MANDATORY
});

// Never like this (would leak cross-company data):
await db.query.teamMemory.findMany(); // FORBIDDEN
```

The Express middleware sets `req.companyId` from the Slack workspace ID. Every route handler
passes `companyId` to all service calls.

---

## Security Model

| Concern | Implementation |
|---|---|
| Cross-company data leak | All queries scoped to `company_id` |
| Secret storage | `company_secrets` AES-256 encrypted, `SECRET_ENCRYPTION_KEY` env |
| Gate RBAC | Role checked server-side in `gate-action.ts` — never trust Slack payload alone |
| Prompt injection | Bootstrap files are markdown (static) — not user-controlled input |
| Cost runaway | Per-company monthly token budget (Phase 4) — kill switch if exceeded |
| Slack verification | Bolt.js verifies `X-Slack-Signature` on every request |
