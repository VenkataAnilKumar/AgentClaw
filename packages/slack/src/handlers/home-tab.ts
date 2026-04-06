import type { App } from '@slack/bolt';
import type { SkillRegistryService } from '@agentclaw/runtime';

import { buildInstallableSkillBlocks, openInstallModal } from './install-modal.js';

type HomeSummary = {
  memoryItems: string[];
  activeAgents: string[];
  recentRuns: string[];
  pendingGates: string[];
};

export function registerHomeTabHandler(
  app: App,
  getHomeSummary: (teamId: string) => Promise<HomeSummary>,
  registry?: SkillRegistryService,
): void {
  app.event('app_home_opened', async ({ event, client }) => {
    const summary = await getHomeSummary(event.user);

    const baseBlocks = [
      section('*Team Memory*', summary.memoryItems),
      section('*Active Agents*', summary.activeAgents),
      section('*Recent Runs*', summary.recentRuns),
      section('*Pending Gates*', summary.pendingGates),
    ].flat();

    let skillsBlocks: object[] = [];
    if (registry) {
      const teamId = (event as any).view?.team_id ?? '';
      const installed = teamId ? await registry.listForCompany(teamId) : [];
      const installedNames = new Set(installed.map((s) => s.skillName));
      const skillRows = buildInstallableSkillBlocks(installedNames);

      skillsBlocks = [
        { type: 'divider' },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: '*📦 Skills Marketplace*' },
        },
        ...skillRows,
      ];
    }

    await client.views.publish({
      user_id: event.user,
      view: {
        type: 'home',
        blocks: [...baseBlocks, ...skillsBlocks] as never,
      },
    });
  });

  // ── Install button on home tab opens the modal ───────────────────────────
  app.action('skill_install_open', async ({ ack, action, body, client }) => {
    await ack();
    const skillName = (action as { value?: string }).value ?? '';
    const triggerId = (body as any).trigger_id ?? '';
    try {
      await openInstallModal(client, triggerId, skillName);
    } catch (err) {
      await client.chat.postEphemeral({
        channel: body.user?.id ?? '',
        user: body.user?.id ?? '',
        text: `❌ Could not open install modal: ${String(err)}`,
      });
    }
  });
}

function section(title: string, lines: string[]) {
  const text = lines.length > 0 ? lines.map((line) => `• ${line}`).join('\n') : 'No data yet.';
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${title}\n${text}`,
      },
    },
    {
      type: 'divider',
    },
  ];
}
