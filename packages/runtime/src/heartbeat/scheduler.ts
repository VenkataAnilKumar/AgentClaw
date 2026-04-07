import cron, { type ScheduledTask } from 'node-cron';

import { db, heartbeatRuns } from '@agentclaw/db';
import type { HeartbeatEntry, HeartbeatSchedule } from '@agentclaw/shared';
import { ActivityFeedService } from '../activity/feed-service.js';

type RunHeartbeatAgent = (params: {
  companyId: string;
  agentName: string;
  skillName: string;
}) => Promise<{ summary?: string } | void>;

type HasPendingGate = (companyId: string, agentName: string) => Promise<boolean>;

type PostHeartbeatDigest = (params: {
  companyId: string;
  agentName: string;
  channel: string;
  summary: string;
}) => Promise<void>;

export class HeartbeatScheduler {
  private readonly tasks = new Map<string, ScheduledTask>();

  constructor(
    private readonly runHeartbeatAgent: RunHeartbeatAgent,
    private readonly hasPendingGate: HasPendingGate,
    private readonly postHeartbeatDigest: PostHeartbeatDigest,
  ) {}

  start(companyId: string, schedule: HeartbeatSchedule): void {
    this.stopAll();

    for (const entry of schedule.entries) {
      if (!cron.validate(entry.cron)) {
        void this.logRun(companyId, entry, 'invalid_schedule');
        continue;
      }

      const key = this.taskKey(companyId, entry);
      const task = cron.schedule(entry.cron, () => {
        void this.executeEntry(companyId, entry);
      });

      this.tasks.set(key, task);
    }
  }

  stopAll(): void {
    for (const task of this.tasks.values()) {
      task.stop();
    }
    this.tasks.clear();
  }

  private async executeEntry(companyId: string, entry: HeartbeatEntry): Promise<void> {
    const pendingGate = await this.hasPendingGate(companyId, entry.agentName);
    if (pendingGate) {
      await this.logRun(companyId, entry, 'skipped_pending_gate');
      return;
    }

    try {
      const result = await this.runHeartbeatAgent({
        companyId,
        agentName: entry.agentName,
        skillName: entry.skillName,
      });

      const summary = result?.summary?.trim() || `${entry.agentName}/${entry.skillName} completed`;
      const targetChannel = entry.channel ?? '#team-updates';

      await this.postHeartbeatDigest({
        companyId,
        agentName: entry.agentName,
        channel: targetChannel,
        summary,
      });

      await this.logRun(companyId, entry, 'ok');
    } catch (error) {
      await this.logRun(companyId, entry, `error:${toShortError(error)}`);
    }
  }

  private async logRun(companyId: string, entry: HeartbeatEntry, status: string): Promise<void> {
    await db.insert(heartbeatRuns).values({
      companyId,
      agentName: entry.agentName,
      skillName: entry.skillName,
      status,
      runAt: new Date(),
    });

    const activity = new ActivityFeedService();
    await activity.write({
      companyId,
      eventType: 'heartbeat_run',
      actor: 'heartbeat',
      agentName: entry.agentName,
      skillName: entry.skillName,
      summary: `HEARTBEAT ${entry.agentName}/${entry.skillName}: ${status}`,
      metadata: {
        cron: entry.cron,
      },
    });
  }

  private taskKey(companyId: string, entry: HeartbeatEntry): string {
    return `${companyId}:${entry.agentName}:${entry.skillName}:${entry.cron}`;
  }
}

function toShortError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, ' ').slice(0, 120);
}
