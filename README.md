# AgentClaw

**Your startup's first AI teammates. In Slack, where you already work.**

AgentClaw is a startup-native AI agent framework built on top of [OpenClaw](https://github.com/openclaw/openclaw) (MIT).
It brings GTM, Hiring, Finance, Dev, and Legal agents to your Slack workspace — with shared team memory,
startup-specific context (OKRs, runway, company), and human-in-the-loop gates for critical decisions.

---

## Agents

| Agent | What it does | Skills |
|---|---|---|
| GTM | ICP, cold email, positioning, battlecards, launch plans | `/icp`, `/cold-email`, `/positioning`, `/battlecard`, `/launch-plan` |
| Hiring | JDs, interview plans, scorecards, offer letters | `/jd`, `/interview-plan`, `/scorecard`, `/offer-letter` |
| Dev | Specs, ADRs, sprint plans, postmortems | `/spec`, `/adr`, `/sprint-plan`, `/postmortem` |
| Finance | Runway checks, investor updates, burn scenarios | `/runway-check`, `/investor-update`, `/burn-scenario` |
| Legal | NDAs, contractor agreements, ToS, privacy policy | `/nda`, `/contractor-agreement` |

---

## Usage

```
/claw @gtm /cold-email enterprise legal ops buyers
/claw @hiring /jd founding engineer
/claw @finance /runway-check
/claw @dev /spec payment integration with Stripe
```

Or skip the agent name and let AgentClaw route:
```
/claw draft a cold email for our fintech ICP
```

---

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill env vars
cp .env.example .env

# 3. Start database
docker-compose up -d postgres

# 4. Run migrations
pnpm db:migrate

# 5. Initialize your company bootstrap files
pnpm agentclaw init

# 6. Start the server (dev mode, Socket Mode)
pnpm dev
```

---

## Bootstrap Files

Configure AgentClaw for your startup by filling out these files in `~/.agentclaw/<your-slug>/`:

| File | What to put in it |
|---|---|
| `COMPANY.md` | Company name, stage, business model, top priorities |
| `OKR.md` | Current quarter objectives and key results |
| `RUNWAY.md` | Cash, burn rate, MRR, fundraise timeline |
| `TEAM.md` | Team roster, Slack handles, roles, who can approve what |
| `HEARTBEAT.md` | Scheduled agent runs (weekly digests, daily runway checks) |

See `bootstrap/*.example` files for templates.

---

## Built On

- [OpenClaw](https://github.com/openclaw/openclaw) (MIT) — core runtime
- [ClawTeam-OpenClaw](https://github.com/win4r/ClawTeam-OpenClaw) (MIT) — multi-agent patterns
- [awesome-openclaw-agents](https://github.com/mergisi/awesome-openclaw-agents) — agent templates
- [@slack/bolt](https://github.com/slackapi/bolt-js) — Slack interface
- [Drizzle ORM](https://github.com/drizzle-team/drizzle-orm) + PostgreSQL — team memory
- [Anthropic SDK](https://github.com/anthropic-ai/sdk-python) — LLM streaming

---

## Documentation

- [`COPILOT_CONTEXT.md`](./COPILOT_CONTEXT.md) — Full context for AI-assisted development
- [`docs/IMPLEMENTATION_GUIDE.md`](./docs/IMPLEMENTATION_GUIDE.md) — Step-by-step build guide
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — System architecture and data flow
- [`docs/AGENT_SPECS.md`](./docs/AGENT_SPECS.md) — Per-agent detailed specifications
