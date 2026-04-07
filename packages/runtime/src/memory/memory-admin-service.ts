import { and, desc, eq } from 'drizzle-orm';

import { db, teamMemory, teamMemoryAudit } from '@agentclaw/db';
import type { JsonValue, TeamMemoryRow } from '@agentclaw/shared';

import { TeamMemory } from './team-memory.js';

export type TeamMemoryAuditRow = {
  id: string;
  companyId: string;
  category: string;
  key: string;
  actor: string;
  source: string;
  action: string;
  summary: string;
  createdAt: string;
};

export class MemoryAdminService {
  constructor(private readonly companyId: string) {}

  async listAll(): Promise<TeamMemoryRow[]> {
    const store = new TeamMemory(this.companyId);
    return store.getAll();
  }

  async get(scopedKey: string): Promise<TeamMemoryRow | null> {
    const parsed = parseScopedMemoryKey(scopedKey);
    if (!parsed) return null;

    const store = new TeamMemory(this.companyId);
    return store.get(parsed.category, parsed.key);
  }

  async upsert(scopedKey: string, value: JsonValue, actor: string, source: 'human' | 'agent'): Promise<void> {
    const parsed = parseScopedMemoryKey(scopedKey);
    if (!parsed) {
      throw new Error('Invalid memory key. Expected category.key format.');
    }

    const store = new TeamMemory(this.companyId);
    await store.set(parsed.category, parsed.key, value, actor, source);
  }

  async delete(scopedKey: string, actor: string, source: 'human' | 'agent' = 'human'): Promise<void> {
    const parsed = parseScopedMemoryKey(scopedKey);
    if (!parsed) {
      throw new Error('Invalid memory key. Expected category.key format.');
    }

    const existing = await db.query.teamMemory.findFirst({
      where: and(
        eq(teamMemory.companyId, this.companyId),
        eq(teamMemory.category, parsed.category),
        eq(teamMemory.key, parsed.key),
      ),
    });

    if (!existing) {
      return;
    }

    await db
      .delete(teamMemory)
      .where(
        and(
          eq(teamMemory.companyId, this.companyId),
          eq(teamMemory.category, parsed.category),
          eq(teamMemory.key, parsed.key),
        ),
      );

    await db.insert(teamMemoryAudit).values({
      companyId: this.companyId,
      category: parsed.category,
      key: parsed.key,
      actor,
      source,
      action: 'delete',
      summary: summarizeValue(existing.value as JsonValue),
    });
  }

  async listAudit(limit = 50): Promise<TeamMemoryAuditRow[]> {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const rows = await db.query.teamMemoryAudit.findMany({
      where: eq(teamMemoryAudit.companyId, this.companyId),
      orderBy: [desc(teamMemoryAudit.createdAt)],
      limit: safeLimit,
    });

    return rows.map((row) => ({
      id: row.id,
      companyId: row.companyId,
      category: row.category,
      key: row.key,
      actor: row.actor,
      source: row.source,
      action: row.action,
      summary: row.summary,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}

function parseScopedMemoryKey(key: string): { category: string; key: string } | null {
  const parts = key.split('.').map((value) => value.trim()).filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const [category, ...rest] = parts;
  const scopedKey = rest.join('.');
  if (!category || !scopedKey) {
    return null;
  }

  return { category, key: scopedKey };
}

function summarizeValue(value: JsonValue): string {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  return raw.length > 200 ? `${raw.slice(0, 200)}...` : raw;
}
