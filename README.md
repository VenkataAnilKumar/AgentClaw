# AgentClaw 🦞

**Your startup's first AI teammates. In Slack, where you already work.**

AgentClaw is an open-source AI agent framework purpose-built for founding teams. Drop GTM, Hiring, Finance, Dev, and Legal agents into your Slack workspace — they share company memory, understand your OKRs and runway, and ask for human approval before any critical decision.

Works with any AI model: Anthropic, OpenAI, Google, Ollama (local), Groq, AWS Bedrock, Azure, Mistral.

---

## How It Works

You talk to your agents in Slack using slash commands:

```
/claw @gtm /cold-email enterprise legal ops buyers
/claw @hiring /jd founding engineer
/claw @finance /runway-check
/claw @dev /spec Stripe payment integration
/claw @legal /nda with design partner
```

No agent specified? AgentClaw routes automatically:

```
/claw draft a cold email for our fintech ICP
```

---

## Agents

| Agent | Skills |
|---|---|
| **GTM** | `/icp` `/cold-email` `/positioning` `/battlecard` `/launch-plan` `/weekly-digest` |
| **Hiring** | `/jd` `/interview-plan` `/scorecard` `/offer-letter` `/pipeline-review` |
| **Dev** | `/spec` `/adr` `/sprint-plan` `/postmortem` `/tech-debt` |
| **Finance** | `/runway-check` `/investor-update` `/burn-scenario` `/spend-review` |
| **Legal** | `/nda` `/contractor-agreement` `/saas-terms` `/privacy-policy` |
| **Customer Success** | `/health-score` `/qbr-prep` `/churn-analysis` `/playbook-builder` |
| **Operations** | `/ops-audit` `/vendor-review` `/metric-dashboard` `/budget-forecast` |
| **Founder** | `/board-prep` `/decision-router` `/daily-standup` |

---

## Supported AI Models

All agents use `provider/model` format with automatic fallback chains:

```yaml
model: anthropic/claude-sonnet-4-6
fallback:
  - openai/gpt-4o
  - google/gemini-2.0-flash
  - ollama/llama3.3        # free, runs locally
```

| Provider | Models |
|---|---|
| Anthropic | claude-sonnet-4-6, claude-opus-4-6, claude-haiku-4-5 |
| OpenAI | gpt-4o, gpt-4o-mini, o3, o4-mini |
| Google | gemini-2.0-flash, gemini-2.5-pro |
| Ollama | llama3.3, mistral, gemma3, phi4 (local, no API key) |
| Groq | llama-3.3-70b-versatile |
| AWS Bedrock | anthropic.claude-*, amazon.titan-* |
| Azure OpenAI | gpt-4o (Azure-hosted) |
| Mistral | mistral-large-latest, codestral |

If a provider fails (rate limit, outage), AgentClaw silently tries the next one.

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/your-username/agentclaw.git
cd agentclaw
pnpm install

# 2. Configure environment
cp .env.example .env
# Fill in SLACK_BOT_TOKEN, ANTHROPIC_API_KEY, DATABASE_URL

# 3. Start database
docker-compose up -d postgres

# 4. Run migrations
pnpm db:migrate

# 5. Set up your company
agentclaw init

# 6. Start
pnpm dev
```

---

## Company Bootstrap Files

AgentClaw agents read these markdown files before every response. They are your company's "source of truth":

| File | Contents |
|---|---|
| `COMPANY.md` | Name, stage, business model, top priorities |
| `OKR.md` | Current quarter objectives and key results |
| `RUNWAY.md` | Cash balance, burn rate, MRR, fundraise timeline |
| `TEAM.md` | Team roster, Slack handles, roles, approval permissions |
| `AGENTS.md` | Active agents, channels, routing keywords |
| `HEARTBEAT.md` | Scheduled runs (weekly digests, daily runway checks) |

See [`bootstrap/`](./bootstrap/) for examples.

---

## Human-in-the-Loop Gates

Agents never take critical actions autonomously. They post an approval request to Slack first:

| Gate | When triggered | Who can approve |
|---|---|---|
| `strategy` | Positioning or pricing changes | owner, admin, member |
| `spend` | Any spend recommendation > $500 | owner, admin |
| `hire` | Every offer letter, every time | owner only |
| `legal` | Any document before external use | owner only |

---

## Integrations

Install integrations via CLI or Slack:

```bash
agentclaw install stripe
agentclaw install linear
agentclaw install notion
```

```
/claw install hubspot
```

Supported: **Stripe** · **Linear** · **GitHub** · **HubSpot** · **Notion** · **Brex** · **Calendly** · **Slack**

---

## Scheduled Agents (HEARTBEAT)

Define cron schedules in `HEARTBEAT.md` and agents run automatically:

```markdown
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
```

---

## Team Memory

Every agent run updates shared team memory in PostgreSQL. Agents remember:
- Your ICP, competitors, positioning
- Hiring pipeline status
- Runway trends and burn patterns
- Product architecture decisions

All memory is visible and editable from the Slack Home Tab.

---

## CLI

```bash
agentclaw init              # scaffold bootstrap files for a new company
agentclaw install <skill>   # install a skill or integration
agentclaw doctor            # check all connections and credentials
agentclaw status            # show active agents and last run times
agentclaw memory list       # view all team memory
```

---

## Tech Stack

- **Runtime:** TypeScript / Node.js 22+ / pnpm workspaces
- **Slack:** `@slack/bolt` v4 (Socket Mode dev, HTTP prod)
- **Database:** PostgreSQL 16 + Drizzle ORM
- **LLM:** Multi-provider with streaming and fallbacks
- **Scheduler:** `node-cron` for HEARTBEAT

---

## License

MIT — built on [OpenClaw](https://github.com/openclaw/openclaw) (MIT).
