import type { App } from '@slack/bolt';
import type { SkillRegistryService } from '@agentclaw/runtime';
import { SKILL_CATALOG, findSkill } from '@agentclaw/skills-registry';

export function registerInstallModalHandler(
  app: App,
  registry: SkillRegistryService,
): void {
  // View submission: user clicked "Install" inside the modal
  app.view('skill_install_modal', async ({ ack, view, body, client }) => {
    await ack();

    const skillName = view.private_metadata;
    const manifest = findSkill(skillName);
    if (!manifest) return;

    const secrets: Record<string, string> = {};
    for (const secretKey of manifest.requiredSecrets) {
      const blockId = `secret_${secretKey}`;
      const value =
        view.state.values[blockId]?.[`input_${secretKey}`]?.value ?? '';
      secrets[secretKey] = value;
    }

    const companyId = body.team?.id ?? '';
    try {
      await registry.install(companyId, skillName, secrets);
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `✅ *${skillName}* installed successfully.`,
      });
    } catch (err) {
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `❌ Install failed: ${String(err)}`,
      });
    }
  });

  // Action: remove button on Home Tab
  app.action('skill_remove', async ({ ack, body, action, client }) => {
    await ack();
    const skillName = (action as { value?: string }).value ?? '';
    const companyId = body.team?.id ?? '';
    try {
      await registry.uninstall(companyId, skillName);
      await client.chat.postEphemeral({
        channel: body.user?.id ?? '',
        user: body.user?.id ?? '',
        text: `🗑️ *${skillName}* uninstalled.`,
      });
    } catch (err) {
      await client.chat.postEphemeral({
        channel: body.user?.id ?? '',
        user: body.user?.id ?? '',
        text: `❌ Uninstall failed: ${String(err)}`,
      });
    }
  });
}

/** Opens the install configuration modal for a skill. */
export async function openInstallModal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: { views: { open: (...args: any[]) => Promise<unknown> } },
  triggerId: string,
  skillName: string,
): Promise<void> {
  const manifest = findSkill(skillName);
  if (!manifest) throw new Error(`Unknown skill: ${skillName}`);

  const secretBlocks = manifest.requiredSecrets.map((secretKey) => ({
    type: 'input',
    block_id: `secret_${secretKey}`,
    label: { type: 'plain_text', text: secretKey },
    element: {
      type: 'plain_text_input',
      action_id: `input_${secretKey}`,
      placeholder: {
        type: 'plain_text',
        text: `Paste your ${secretKey} here`,
      },
    },
    hint: {
      type: 'plain_text',
      text: 'Stored encrypted. Never shared outside your workspace.',
    },
  }));

  const integrationList =
    manifest.requiredIntegrations.length > 0
      ? manifest.requiredIntegrations.join(', ')
      : 'None';

  await client.views.open({
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: 'skill_install_modal',
      private_metadata: skillName,
      title: { type: 'plain_text', text: 'Install Skill' },
      submit: { type: 'plain_text', text: 'Install' },
      close: { type: 'plain_text', text: 'Cancel' },
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${manifest.name}* v${manifest.version}\n${manifest.description}`,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Category:* ${manifest.category}` },
            { type: 'mrkdwn', text: `*Integrations:* ${integrationList}` },
          ],
        },
        ...(secretBlocks.length > 0
          ? [
              { type: 'divider' },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*Enter credentials to activate this skill:*',
                },
              },
              ...secretBlocks,
            ]
          : []),
      ],
    },
  });
}

/** Lists all available installable skills as Slack blocks. */
export function buildInstallableSkillBlocks(installedNames: Set<string>) {
  const installable = SKILL_CATALOG.filter((s) => !s.builtIn);
  return installable.flatMap((s) => {
    const isInstalled = installedNames.has(s.name);
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${s.name}* — ${s.description}\n_Requires: ${s.requiredIntegrations.join(', ') || 'nothing'}_`,
        },
        accessory: isInstalled
          ? {
              type: 'button',
              text: { type: 'plain_text', text: '🗑️ Remove' },
              style: 'danger',
              action_id: 'skill_remove',
              value: s.name,
            }
          : {
              type: 'button',
              text: { type: 'plain_text', text: '+ Install' },
              style: 'primary',
              action_id: 'skill_install_open',
              value: s.name,
            },
      },
    ];
  });
}
