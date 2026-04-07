import { and, desc, eq } from 'drizzle-orm';

import { activityFeed, db } from '@agentclaw/db';
import type { JsonValue } from '@agentclaw/shared';

export type ActivityEventType =
  | 'skill_run'
  | 'gate_created'
  | 'gate_approved'
  | 'gate_rejected'
  | 'run_error'
  | 'memory_update'
  | 'skill_installed'
  | 'member_invited'
  | 'heartbeat_run';

export type ActivityFeedItem = {
  id: string;
  companyId: string;
  eventType: ActivityEventType;
  agentName: string | null;
  skillName: string | null;
  actor: string;
  summary: string;
  metadata: JsonValue;
  createdAt: string;
};

export class ActivityFeedService {
  async write(params: {
    companyId: string;
    eventType: ActivityEventType;
    actor: string;
    summary: string;
    agentName?: string | null;
    skillName?: string | null;
    metadata?: JsonValue;
  }): Promise<void> {
    await db.insert(activityFeed).values({
      companyId: params.companyId,
      eventType: params.eventType,
      actor: params.actor,
      summary: params.summary,
      agentName: params.agentName ?? null,
      skillName: params.skillName ?? null,
      metadata: params.metadata ?? {},
    });
  }

  async list(params: {
    companyId: string;
    limit?: number;
    offset?: number;
    agentName?: string;
    eventType?: ActivityEventType;
  }): Promise<ActivityFeedItem[]> {
    const whereParts = [eq(activityFeed.companyId, params.companyId)];
    if (params.agentName) {
      whereParts.push(eq(activityFeed.agentName, params.agentName));
    }
    if (params.eventType) {
      whereParts.push(eq(activityFeed.eventType, params.eventType));
    }

    const rows = await db.query.activityFeed.findMany({
      where: and(...whereParts),
      orderBy: [desc(activityFeed.createdAt)],
      limit: Math.max(1, Math.min(params.limit ?? 50, 200)),
      offset: Math.max(0, params.offset ?? 0),
    });

    return rows.map((row) => ({
      id: row.id,
      companyId: row.companyId,
      eventType: row.eventType,
      agentName: row.agentName,
      skillName: row.skillName,
      actor: row.actor,
      summary: row.summary,
      metadata: row.metadata as JsonValue,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
