import type express from 'express';

import { and, eq } from 'drizzle-orm';

import { companyMembers, db } from '@agentclaw/db';
import { MemoryAdminService } from '@agentclaw/runtime';
import type { JsonValue, MemberRole } from '@agentclaw/shared';

type ResolveCompanyId = (teamId: string) => Promise<string>;

export function registerMemoryRoutes(
  app: express.Express,
  resolveCompanyIdByTeamId: ResolveCompanyId,
): void {
  app.get('/api/memory', async (req, res) => {
    try {
      const companyId = await resolveCompany(req, resolveCompanyIdByTeamId);
      if (!companyId) {
        res.status(400).json({ error: 'teamId or companyId query parameter required' });
        return;
      }

      const service = new MemoryAdminService(companyId);
      const rows = await service.listAll();
      res.json({ memory: rows.map(withScopedKey) });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get('/api/memory/audit', async (req, res) => {
    try {
      const companyId = await resolveCompany(req, resolveCompanyIdByTeamId);
      if (!companyId) {
        res.status(400).json({ error: 'teamId or companyId query parameter required' });
        return;
      }

      const service = new MemoryAdminService(companyId);
      const rows = await service.listAudit(50);
      res.json({ audit: rows.map((row) => ({ ...row, scopedKey: `${row.category}.${row.key}` })) });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get('/api/memory/:key', async (req, res) => {
    try {
      const companyId = await resolveCompany(req, resolveCompanyIdByTeamId);
      if (!companyId) {
        res.status(400).json({ error: 'teamId or companyId query parameter required' });
        return;
      }

      const service = new MemoryAdminService(companyId);
      const row = await service.get(String(req.params['key'] ?? ''));
      if (!row) {
        res.status(404).json({ error: 'Memory key not found' });
        return;
      }

      res.json({ memory: withScopedKey(row) });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/memory', async (req, res) => {
    try {
      const { key, value, actorSlackUserId, teamId, companyId } = req.body as {
        key?: string;
        value?: JsonValue;
        actorSlackUserId?: string;
        teamId?: string;
        companyId?: string;
      };

      const resolvedCompanyId = companyId ?? (teamId ? await resolveCompanyIdByTeamId(teamId) : null);
      if (!resolvedCompanyId || !key) {
        res.status(400).json({ error: 'key and teamId/companyId are required' });
        return;
      }

      if (!actorSlackUserId) {
        res.status(400).json({ error: 'actorSlackUserId is required' });
        return;
      }

      await assertMemoryEditPermission(resolvedCompanyId, actorSlackUserId);

      const service = new MemoryAdminService(resolvedCompanyId);
      await service.upsert(key, value ?? '', actorSlackUserId, 'human');

      const row = await service.get(key);
      res.json({ memory: row ? withScopedKey(row) : null });
    } catch (error) {
      const message = String(error);
      res.status(message.includes('Insufficient permissions') ? 403 : 500).json({ error: message });
    }
  });

  app.patch('/api/memory/:key', async (req, res) => {
    try {
      const { value, actorSlackUserId, teamId, companyId } = req.body as {
        value?: JsonValue;
        actorSlackUserId?: string;
        teamId?: string;
        companyId?: string;
      };

      const resolvedCompanyId = companyId ?? (teamId ? await resolveCompanyIdByTeamId(teamId) : null);
      const key = String(req.params['key'] ?? '');
      if (!resolvedCompanyId || !key) {
        res.status(400).json({ error: 'memory key and teamId/companyId are required' });
        return;
      }

      if (!actorSlackUserId) {
        res.status(400).json({ error: 'actorSlackUserId is required' });
        return;
      }

      await assertMemoryEditPermission(resolvedCompanyId, actorSlackUserId);

      const service = new MemoryAdminService(resolvedCompanyId);
      await service.upsert(key, value ?? '', actorSlackUserId, 'human');

      const row = await service.get(key);
      res.json({ memory: row ? withScopedKey(row) : null });
    } catch (error) {
      const message = String(error);
      res.status(message.includes('Insufficient permissions') ? 403 : 500).json({ error: message });
    }
  });

  app.delete('/api/memory/:key', async (req, res) => {
    try {
      const { actorSlackUserId, teamId, companyId } = req.body as {
        actorSlackUserId?: string;
        teamId?: string;
        companyId?: string;
      };

      const resolvedCompanyId = companyId ?? (teamId ? await resolveCompanyIdByTeamId(teamId) : null);
      const key = String(req.params['key'] ?? '');
      if (!resolvedCompanyId || !key) {
        res.status(400).json({ error: 'memory key and teamId/companyId are required' });
        return;
      }

      if (!actorSlackUserId) {
        res.status(400).json({ error: 'actorSlackUserId is required' });
        return;
      }

      await assertRole(resolvedCompanyId, actorSlackUserId, ['owner', 'admin']);

      const service = new MemoryAdminService(resolvedCompanyId);
      await service.delete(key, actorSlackUserId, 'human');
      res.json({ ok: true });
    } catch (error) {
      const message = String(error);
      res.status(message.includes('Insufficient permissions') ? 403 : 500).json({ error: message });
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

async function assertMemoryEditPermission(companyId: string, slackUserId: string): Promise<void> {
  await assertRole(companyId, slackUserId, ['owner', 'admin']);
}

async function assertRole(
  companyId: string,
  slackUserId: string,
  allowedRoles: MemberRole[],
): Promise<void> {
  const member = await db.query.companyMembers.findFirst({
    where: and(
      eq(companyMembers.companyId, companyId),
      eq(companyMembers.slackUserId, slackUserId),
    ),
  });

  if (!member || !allowedRoles.includes(member.role)) {
    throw new Error('Insufficient permissions');
  }
}

function withScopedKey(row: {
  category: string;
  key: string;
  id: string;
  companyId: string;
  value: JsonValue;
  writtenByAgent: string;
  updatedAt: string;
}) {
  return {
    ...row,
    scopedKey: `${row.category}.${row.key}`,
  };
}
