import { and, eq } from 'drizzle-orm';

import { companyMembers, db, humanGates } from '@agentclaw/db';
import type { GateType, HumanGateRequest, MemberRole } from '@agentclaw/shared';

export class GateManager {
  async createGate(companyId: string, agentName: string, gate: HumanGateRequest): Promise<string> {
    const inserted = await db
      .insert(humanGates)
      .values({
        companyId,
        agentName,
        gateType: gate.type,
        title: gate.title,
        description: gate.description,
        status: 'pending',
      })
      .returning({ id: humanGates.id });

    const gateId = inserted[0]?.id;
    if (!gateId) {
      throw new Error('Failed to create human gate');
    }

    return gateId;
  }

  async resolveGate(
    gateId: string,
    slackUserId: string,
    decision: 'approved' | 'rejected',
    reason?: string,
  ): Promise<void> {
    const gate = await db.query.humanGates.findFirst({
      where: eq(humanGates.id, gateId),
    });

    if (!gate) {
      throw new Error(`Gate not found: ${gateId}`);
    }

    const member = await db.query.companyMembers.findFirst({
      where: and(
        eq(companyMembers.companyId, gate.companyId),
        eq(companyMembers.slackUserId, slackUserId),
      ),
    });

    if (!member) {
      throw new Error('User is not a member of this company');
    }

    assertCanResolveGate(gate.gateType, member.role);

    await db
      .update(humanGates)
      .set({
        status: decision,
        approvedBy: slackUserId,
        resolvedAt: new Date(),
        description: reason ? `${gate.description}\n\nResolution note: ${reason}` : gate.description,
      })
      .where(
        and(
          eq(humanGates.id, gateId),
          eq(humanGates.companyId, gate.companyId),
        ),
      );
  }

  async hasPendingGate(companyId: string, agentName: string): Promise<boolean> {
    const gate = await db.query.humanGates.findFirst({
      where: and(
        eq(humanGates.companyId, companyId),
        eq(humanGates.agentName, agentName),
        eq(humanGates.status, 'pending'),
      ),
    });

    return Boolean(gate);
  }
}

function assertCanResolveGate(gateType: GateType, role: MemberRole): void {
  if (gateType === 'strategy') {
    if (role === 'owner' || role === 'admin' || role === 'member') {
      return;
    }
    throw new Error('Insufficient permissions: strategy gates require at least member role');
  }

  if (role === 'owner' || role === 'admin') {
    return;
  }

  throw new Error(`Insufficient permissions: ${gateType} gates require owner or admin role`);
}
