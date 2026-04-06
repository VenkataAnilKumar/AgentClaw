import { and, asc, eq } from 'drizzle-orm';

import { db, teamMemory } from '@agentclaw/db';
import type { JsonValue, MemoryUpdate, TeamMemoryRow } from '@agentclaw/shared';

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

  async set(category: string, key: string, value: JsonValue, agentName: string): Promise<void> {
    await db
      .insert(teamMemory)
      .values({
        companyId: this.companyId,
        category,
        key,
        value,
        writtenByAgent: agentName,
      })
      .onConflictDoUpdate({
        target: [teamMemory.companyId, teamMemory.category, teamMemory.key],
        set: {
          value,
          writtenByAgent: agentName,
          updatedAt: new Date(),
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
