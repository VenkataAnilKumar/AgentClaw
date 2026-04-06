import { and, asc, eq } from 'drizzle-orm';

import { agentMemory, db } from '@agentclaw/db';
import type { AgentMemoryRow, JsonValue, MemoryUpdate } from '@agentclaw/shared';

export class AgentMemory {
  constructor(
    private readonly companyId: string,
    private readonly agentName: string,
  ) {}

  async get(key: string): Promise<AgentMemoryRow | null> {
    const row = await db.query.agentMemory.findFirst({
      where: and(
        eq(agentMemory.companyId, this.companyId),
        eq(agentMemory.agentName, this.agentName),
        eq(agentMemory.key, key),
      ),
    });

    return row ? mapRow(row) : null;
  }

  async set(key: string, value: JsonValue): Promise<void> {
    await db
      .insert(agentMemory)
      .values({
        companyId: this.companyId,
        agentName: this.agentName,
        key,
        value,
      })
      .onConflictDoUpdate({
        target: [agentMemory.companyId, agentMemory.agentName, agentMemory.key],
        set: {
          value,
          updatedAt: new Date(),
        },
      });
  }

  async getAll(): Promise<AgentMemoryRow[]> {
    const rows = await db.query.agentMemory.findMany({
      where: and(
        eq(agentMemory.companyId, this.companyId),
        eq(agentMemory.agentName, this.agentName),
      ),
      orderBy: [asc(agentMemory.key)],
    });

    return rows.map(mapRow);
  }

  async applyUpdates(updates: MemoryUpdate[]): Promise<void> {
    for (const update of updates) {
      await this.set(update.key, update.value);
    }
  }
}

function mapRow(row: typeof agentMemory.$inferSelect): AgentMemoryRow {
  return {
    id: row.id,
    companyId: row.companyId,
    agentName: row.agentName,
    key: row.key,
    value: row.value as JsonValue,
    updatedAt: row.updatedAt.toISOString(),
  };
}
