# Changelog

## 2026-04-06 - Phase 4: Team Features & Production Hardening

### Added
- Multi-workspace Slack OAuth install flow with persisted installations and OAuth state.
- Team member management with role-based permissions: invite, role update, remove, and team listing.
- Shared memory management APIs and Slack Home Tab editor (view, add, edit) with memory audit log.
- Activity feed service and API covering skill runs, gates, memory updates, installs, invites, heartbeat, and run errors.
- Cost tracking service and APIs with monthly summaries, budget configuration, and usage checks.
- Weekly digest assets: `digest-agent` and `company-digest` skill, plus heartbeat schedule and agent registry examples.
- Per-company rate limiting middleware for slash commands, concurrent runs, and skill installs.

### Changed
- Agent runner now computes and persists `cost_usd` per run.
- Budget rules now enforce 80% founder alerting and 100% block for non-heartbeat runs.
- `/claw help` now returns full command reference for agents, team, skills, and system operations.
- `/health` endpoint now reports db, slack, provider readiness, company count, and uptime.

### Reliability & Observability
- Structured logging with pino for server, agent runs, and LLM run attempts/success/failure.
- Friendly slash-level error boundaries plus `run_error` activity capture.
