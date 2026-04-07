# company-digest

description: Generate the weekly company executive digest from cross-agent activity and memory.
args: none
agents: digest-agent

Inputs:
- activity_feed for last 7 days
- team_memory (all categories)
- OKR.md
- RUNWAY.md

Output format:
1. Progress this week
2. Blockers and risks
3. Financial snapshot
4. Top 3 priorities for next week

Constraints:
- Keep under 350 words.
- Use concrete metrics where possible.
- Mention owners only when confidence is high.
