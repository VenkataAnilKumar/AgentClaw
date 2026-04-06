import type { App } from '@slack/bolt';

import type { GateManager } from '@agentclaw/runtime';

export function registerGateActions(app: App, gateManager: GateManager) {
  app.action('gate_approve', async ({ ack, body, client, action }) => {
    await ack();
    const gateId = (action as { value?: string }).value;
    if (!gateId || !body.user?.id) {
      return;
    }

    try {
      await gateManager.resolveGate(gateId, body.user.id, 'approved');
      await client.chat.postEphemeral({
        channel: body.channel?.id ?? '',
        user: body.user.id,
        text: 'Gate approved.',
      });
    } catch (error) {
      await client.chat.postEphemeral({
        channel: body.channel?.id ?? '',
        user: body.user.id,
        text: `Unable to approve gate: ${String(error)}`,
      });
    }
  });

  app.action('gate_reject', async ({ ack, body, client, action }) => {
    await ack();
    const gateId = (action as { value?: string }).value;
    if (!gateId || !body.user?.id) {
      return;
    }

    try {
      await gateManager.resolveGate(gateId, body.user.id, 'rejected');
      await client.chat.postEphemeral({
        channel: body.channel?.id ?? '',
        user: body.user.id,
        text: 'Gate rejected.',
      });
    } catch (error) {
      await client.chat.postEphemeral({
        channel: body.channel?.id ?? '',
        user: body.user.id,
        text: `Unable to reject gate: ${String(error)}`,
      });
    }
  });
}
