import type express from 'express';

import { ActivityFeedService, type ActivityEventType } from '@agentclaw/runtime';

type ResolveCompanyId = (teamId: string) => Promise<string>;

export function registerActivityRoutes(
  app: express.Express,
  resolveCompanyIdByTeamId: ResolveCompanyId,
): void {
  app.get('/api/activity', async (req, res) => {
    try {
      const companyId = await resolveCompany(req, resolveCompanyIdByTeamId);
      if (!companyId) {
        res.status(400).json({ error: 'teamId or companyId query parameter required' });
        return;
      }

      const limit = Number.parseInt(String(req.query.limit ?? '50'), 10);
      const offset = Number.parseInt(String(req.query.offset ?? '0'), 10);
      const agentName = String(req.query.agent ?? '').trim() || undefined;
      const eventTypeRaw = String(req.query.event_type ?? '').trim();
      const eventType = (eventTypeRaw || undefined) as ActivityEventType | undefined;

      const activity = new ActivityFeedService();
      const items = await activity.list({
        companyId,
        limit: Number.isNaN(limit) ? 50 : limit,
        offset: Number.isNaN(offset) ? 0 : offset,
        agentName,
        eventType,
      });

      res.json({ activity: items, count: items.length });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });
}

async function resolveCompany(
  req: express.Request,
  resolveCompanyIdByTeamId: ResolveCompanyId,
): Promise<string | null> {
  const companyId = String(req.query.companyId ?? '').trim();
  if (companyId) return companyId;

  const teamId = String(req.query.teamId ?? '').trim();
  if (!teamId) return null;

  return resolveCompanyIdByTeamId(teamId);
}
