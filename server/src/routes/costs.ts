import type express from 'express';

import { CostService } from '@agentclaw/runtime';

type ResolveCompanyId = (teamId: string) => Promise<string>;

export function registerCostRoutes(
  app: express.Express,
  resolveCompanyIdByTeamId: ResolveCompanyId,
): void {
  app.get('/api/costs/summary', async (req, res) => {
    try {
      const companyId = await resolveCompany(req, resolveCompanyIdByTeamId);
      if (!companyId) {
        res.status(400).json({ error: 'teamId or companyId query parameter required' });
        return;
      }

      const costs = new CostService();
      const summary = await costs.getSummary(companyId);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get('/api/costs/monthly', async (req, res) => {
    try {
      const companyId = await resolveCompany(req, resolveCompanyIdByTeamId);
      if (!companyId) {
        res.status(400).json({ error: 'teamId or companyId query parameter required' });
        return;
      }

      const months = Number.parseInt(String(req.query.months ?? '3'), 10);
      const costs = new CostService();
      const history = await costs.getMonthly(companyId, Number.isNaN(months) ? 3 : months);
      res.json({ months: history });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get('/api/costs/budget', async (req, res) => {
    try {
      const companyId = await resolveCompany(req, resolveCompanyIdByTeamId);
      if (!companyId) {
        res.status(400).json({ error: 'teamId or companyId query parameter required' });
        return;
      }

      const costs = new CostService();
      const budget = await costs.getBudget(companyId);
      const usage = await costs.checkBudget(companyId, false);
      res.json({ budget, usage });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/costs/budget', async (req, res) => {
    try {
      const { teamId, companyId, monthlyUsd } = req.body as {
        teamId?: string;
        companyId?: string;
        monthlyUsd?: number;
      };

      const resolvedCompanyId = companyId ?? (teamId ? await resolveCompanyIdByTeamId(teamId) : null);
      if (!resolvedCompanyId || typeof monthlyUsd !== 'number') {
        res.status(400).json({ error: 'companyId/teamId and numeric monthlyUsd are required' });
        return;
      }

      const costs = new CostService();
      await costs.setBudget(resolvedCompanyId, monthlyUsd);
      const budget = await costs.getBudget(resolvedCompanyId);
      res.json({ budget });
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
