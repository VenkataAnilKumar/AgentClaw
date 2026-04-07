import { and, asc, eq } from 'drizzle-orm';

import { db, teamMemory, teamMemoryAudit } from '@agentclaw/db';
import type { JsonValue, MemoryUpdate, TeamMemoryRow } from '@agentclaw/shared';
import { ActivityFeedService } from '../activity/feed-service.js';

export class TeamMemory {
  constructor(private readonly companyId: string) {}

  async get(category: string, key: string): Promise<TeamMemoryRow | null> {
    const row = await db.query.teamMemory.findFirst({
      where: and(
        eq(teamMemory.companyId, this.companyId),
        eq(teamMemory.category, category),
        eq(teamMemory.key, key),
      ),
    });

    return row ? mapRow(row) : null;
  }

  async set(
    category: string,
    key: string,
    value: JsonValue,
    actorName: string,
    source: 'agent' | 'human' = 'agent',
  ): Promise<void> {
    await db
      .insert(teamMemory)
      .values({
        companyId: this.companyId,
        category,
        key,
        value,
        writtenByAgent: actorName,
      })
      .onConflictDoUpdate({
        target: [teamMemory.companyId, teamMemory.category, teamMemory.key],
        set: {
          value,
          writtenByAgent: actorName,
          updatedAt: new Date(),
        },
      });

    await db.insert(teamMemoryAudit).values({
      companyId: this.companyId,
      category,
      key,
      actor: actorName,
      source,
      action: 'set',
      summary: summarizeValue(value),
    });

    const activity = new ActivityFeedService();
    await activity.write({
      companyId: this.companyId,
      eventType: 'memory_update',
      actor: actorName,
      summary: `${source === 'agent' ? actorName : `@${actorName}`} updated ${category}.${key}`,
      metadata: {
        category,
        key,
        source,
      },
    });
  }

  async getAll(category?: string): Promise<TeamMemoryRow[]> {
    const rows = await db.query.teamMemory.findMany({
      where: category
        ? and(eq(teamMemory.companyId, this.companyId), eq(teamMemory.category, category))
        : eq(teamMemory.companyId, this.companyId),
      orderBy: [asc(teamMemory.category), asc(teamMemory.key)],
    });

    return rows.map(mapRow);
  }

  async applyUpdates(updates: MemoryUpdate[], agentName: string): Promise<void> {
    for (const update of updates) {
      const parsed = parseScopedMemoryKey(update.key);
      if (!parsed) {
        continue;
      }

      await this.set(parsed.category, parsed.key, update.value, agentName);
    }
  }
}

function summarizeValue(value: JsonValue): string {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  return raw.length > 200 ? `${raw.slice(0, 200)}...` : raw;
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

function mapRow(row: typeof teamMemory.$inferSelect): TeamMemoryRow {
  return {
    id: row.id,
    companyId: row.companyId,
    category: row.category,
    key: row.key,
    value: row.value as JsonValue,
    writtenByAgent: row.writtenByAgent,
    updatedAt: row.updatedAt.toISOString(),
  };
}
