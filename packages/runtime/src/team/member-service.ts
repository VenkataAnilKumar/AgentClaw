import { and, eq } from 'drizzle-orm';

import { companyMembers, db } from '@agentclaw/db';
import type { MemberRole } from '@agentclaw/shared';
import { ActivityFeedService } from '../activity/feed-service.js';

export type TeamPermission =
  | 'invite'
  | 'remove'
  | 'role'
  | 'approve:all'
  | 'approve:strategy'
  | 'approve:spend'
  | 'approve:hire'
  | 'install:skills'
  | 'memory:edit'
  | 'memory:view';

export const ROLE_PERMISSIONS: Record<MemberRole, TeamPermission[]> = {
  owner: ['invite', 'remove', 'role', 'approve:all', 'install:skills', 'memory:edit'],
  admin: ['invite', 'approve:strategy', 'approve:spend', 'approve:hire', 'install:skills', 'memory:edit'],
  member: ['approve:strategy', 'memory:view'],
  read_only: ['memory:view'],
};

export type TeamMemberRecord = {
  slackUserId: string;
  role: MemberRole;
  joinedAt: Date;
};

export class TeamMemberService {
  async listMembers(companyId: string): Promise<TeamMemberRecord[]> {
    const rows = await db.query.companyMembers.findMany({
      where: eq(companyMembers.companyId, companyId),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    });

    return rows.map((row) => ({
      slackUserId: row.slackUserId,
      role: row.role,
      joinedAt: row.createdAt,
    }));
  }

  async getMemberRole(companyId: string, slackUserId: string): Promise<MemberRole | null> {
    const row = await db.query.companyMembers.findFirst({
      where: and(
        eq(companyMembers.companyId, companyId),
        eq(companyMembers.slackUserId, slackUserId),
      ),
    });

    return row?.role ?? null;
  }

  async invite(companyId: string, slackUserId: string, role: MemberRole): Promise<void> {
    await db
      .insert(companyMembers)
      .values({
        companyId,
        slackUserId,
        role,
      })
      .onConflictDoUpdate({
        target: [companyMembers.companyId, companyMembers.slackUserId],
        set: { role },
      });

    const activity = new ActivityFeedService();
    await activity.write({
      companyId,
      eventType: 'member_invited',
      actor: slackUserId,
      summary: `${slackUserId} added to team as ${role}`,
      metadata: { role },
    });
  }

  async updateRole(companyId: string, slackUserId: string, role: MemberRole): Promise<void> {
    await db
      .update(companyMembers)
      .set({ role })
      .where(
        and(
          eq(companyMembers.companyId, companyId),
          eq(companyMembers.slackUserId, slackUserId),
        ),
      );
  }

  async remove(companyId: string, slackUserId: string): Promise<void> {
    const existing = await db.query.companyMembers.findFirst({
      where: and(
        eq(companyMembers.companyId, companyId),
        eq(companyMembers.slackUserId, slackUserId),
      ),
    });

    if (!existing) {
      return;
    }

    if (existing.role === 'owner') {
      const owners = await db.query.companyMembers.findMany({
        where: and(
          eq(companyMembers.companyId, companyId),
          eq(companyMembers.role, 'owner'),
        ),
      });
      if (owners.length <= 1) {
        throw new Error('Cannot remove the last owner. Assign another owner first.');
      }
    }

    await db
      .delete(companyMembers)
      .where(
        and(
          eq(companyMembers.companyId, companyId),
          eq(companyMembers.slackUserId, slackUserId),
        ),
      );
  }

  async assertPermission(
    companyId: string,
    slackUserId: string,
    permission: TeamPermission,
  ): Promise<MemberRole> {
    const role = await this.getMemberRole(companyId, slackUserId);
    if (!role) {
      throw new Error('You are not a member of this company.');
    }

    if (!ROLE_PERMISSIONS[role].includes(permission)) {
      throw new Error(`Insufficient permissions for ${permission}.`);
    }

    return role;
  }
}
