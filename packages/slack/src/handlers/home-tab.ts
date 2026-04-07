import type { App } from '@slack/bolt';
import {
  MemoryAdminService,
  ROLE_PERMISSIONS,
  type SkillRegistryService,
  type TeamMemberService,
} from '@agentclaw/runtime';
import type { JsonValue } from '@agentclaw/shared';

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
  resolveCompanyId?: (teamId: string) => Promise<string>,
  teamMembers?: TeamMemberService,
): void {
  app.event('app_home_opened', async ({ event, body, client }) => {
    const summary = await getHomeSummary(event.user);

    const baseBlocks = [
      section('*Team Memory*', summary.memoryItems),
      section('*Active Agents*', summary.activeAgents),
      section('*Recent Runs*', summary.recentRuns),
      section('*Pending Gates*', summary.pendingGates),
    ].flat();

    let skillsBlocks: object[] = [];
    let memoryBlocks: object[] = [];
    let auditBlocks: object[] = [];
    if (registry) {
      const teamId = (body as any).team_id ?? (body as any).team?.id ?? '';
      const companyId = resolveCompanyId ? await resolveCompanyId(teamId) : teamId;
      const installed = companyId ? await registry.listForCompany(companyId) : [];
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

      const role = teamMembers ? await teamMembers.getMemberRole(companyId, event.user) : null;
      const canEdit = role ? ROLE_PERMISSIONS[role].includes('memory:edit') : false;
      const canView = role
        ? ROLE_PERMISSIONS[role].includes('memory:view') || canEdit
        : false;

      if (canView) {
        const memoryService = new MemoryAdminService(companyId);
        const allMemory = await memoryService.listAll();
        const audit = await memoryService.listAudit(50);

        memoryBlocks = buildMemoryBlocks(allMemory, canEdit);
        auditBlocks = buildAuditBlocks(audit);
      } else {
        memoryBlocks = [
          { type: 'divider' },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*🧠 Company Memory*\nYou do not currently have permission to view memory.',
            },
          },
        ];
      }
    }

    await client.views.publish({
      user_id: event.user,
      view: {
        type: 'home',
        blocks: [...baseBlocks, ...memoryBlocks, ...auditBlocks, ...skillsBlocks] as never,
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

  app.action('memory_edit_open', async ({ ack, action, body, client }) => {
    await ack();
    const scopedKey = (action as { value?: string }).value ?? '';
    const teamId = (body as any).team?.id ?? (body as any).team_id ?? '';
    const companyId = resolveCompanyId ? await resolveCompanyId(teamId) : teamId;

    const memoryService = new MemoryAdminService(companyId);
    const row = await memoryService.get(scopedKey);
    const initial = stringifyJsonValue(row?.value ?? '');

    await client.views.open({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal',
        callback_id: 'memory_edit_modal',
        private_metadata: JSON.stringify({ scopedKey, teamId }),
        title: { type: 'plain_text', text: 'Edit Memory' },
        submit: { type: 'plain_text', text: 'Save' },
        close: { type: 'plain_text', text: 'Cancel' },
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*${scopedKey}*` },
          },
          {
            type: 'input',
            block_id: 'memory_value',
            label: { type: 'plain_text', text: 'Value' },
            element: {
              type: 'plain_text_input',
              action_id: 'value_input',
              multiline: true,
              initial_value: initial,
            },
          },
        ],
      },
    });
  });

  app.action('memory_add_open', async ({ ack, body, client }) => {
    await ack();
    const teamId = (body as any).team?.id ?? (body as any).team_id ?? '';
    await client.views.open({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal',
        callback_id: 'memory_add_modal',
        private_metadata: JSON.stringify({ teamId }),
        title: { type: 'plain_text', text: 'Add Memory Key' },
        submit: { type: 'plain_text', text: 'Create' },
        close: { type: 'plain_text', text: 'Cancel' },
        blocks: [
          {
            type: 'input',
            block_id: 'memory_category',
            label: { type: 'plain_text', text: 'Category' },
            element: {
              type: 'plain_text_input',
              action_id: 'category_input',
              placeholder: { type: 'plain_text', text: 'gtm, hiring, finance, product, ...' },
            },
          },
          {
            type: 'input',
            block_id: 'memory_key',
            label: { type: 'plain_text', text: 'Key' },
            element: {
              type: 'plain_text_input',
              action_id: 'key_input',
              placeholder: { type: 'plain_text', text: 'icp, positioning, pipeline, ...' },
            },
          },
          {
            type: 'input',
            block_id: 'memory_value',
            label: { type: 'plain_text', text: 'Value' },
            element: {
              type: 'plain_text_input',
              action_id: 'value_input',
              multiline: true,
            },
          },
        ],
      },
    });
  });

  app.view('memory_edit_modal', async ({ ack, body, view, client }) => {
    await ack();
    if (!teamMembers) return;

    const metadata = safeParseMetadata(view.private_metadata);
    const teamId = metadata.teamId ?? body.team?.id ?? '';
    const scopedKey = metadata.scopedKey ?? '';
    const companyId = resolveCompanyId ? await resolveCompanyId(teamId) : teamId;

    try {
      await teamMembers.assertPermission(companyId, body.user.id, 'memory:edit');

      const rawValue = view.state.values.memory_value?.value_input?.value ?? '';
      const value = parseValue(rawValue);
      const memoryService = new MemoryAdminService(companyId);
      await memoryService.upsert(scopedKey, value, body.user.id, 'human');

      await client.chat.postMessage({
        channel: body.user.id,
        text: `✅ Updated memory key *${scopedKey}*`,
      });
    } catch (error) {
      await client.chat.postMessage({
        channel: body.user.id,
        text: `❌ Could not update memory key: ${String(error)}`,
      });
    }
  });

  app.view('memory_add_modal', async ({ ack, body, view, client }) => {
    await ack();
    if (!teamMembers) return;

    const metadata = safeParseMetadata(view.private_metadata);
    const teamId = metadata.teamId ?? body.team?.id ?? '';
    const companyId = resolveCompanyId ? await resolveCompanyId(teamId) : teamId;

    try {
      await teamMembers.assertPermission(companyId, body.user.id, 'memory:edit');

      const category =
        view.state.values.memory_category?.category_input?.value?.trim() ?? '';
      const key = view.state.values.memory_key?.key_input?.value?.trim() ?? '';
      const rawValue = view.state.values.memory_value?.value_input?.value ?? '';

      if (!category || !key) {
        throw new Error('Category and key are required.');
      }

      const memoryService = new MemoryAdminService(companyId);
      await memoryService.upsert(`${category}.${key}`, parseValue(rawValue), body.user.id, 'human');

      await client.chat.postMessage({
        channel: body.user.id,
        text: `✅ Added memory key *${category}.${key}*`,
      });
    } catch (error) {
      await client.chat.postMessage({
        channel: body.user.id,
        text: `❌ Could not add memory key: ${String(error)}`,
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

function buildMemoryBlocks(
  rows: Array<{
    category: string;
    key: string;
    value: JsonValue;
  }>,
  canEdit: boolean,
): object[] {
  const blocks: object[] = [
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: '*🧠 Company Memory*' },
    },
  ];

  const categories = new Map<string, Array<{ key: string; value: JsonValue }>>();
  for (const row of rows) {
    const arr = categories.get(row.category) ?? [];
    arr.push({ key: row.key, value: row.value });
    categories.set(row.category, arr);
  }

  for (const [category, items] of categories.entries()) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*${titleCase(category)}*` },
    });

    for (const item of items) {
      const scopedKey = `${category}.${item.key}`;
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`${scopedKey}\`  "${truncateValue(item.value)}"`,
        },
        accessory: canEdit
          ? {
              type: 'button',
              text: { type: 'plain_text', text: 'Edit' },
              action_id: 'memory_edit_open',
              value: scopedKey,
            }
          : undefined,
      });
    }
  }

  if (canEdit) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '+ Add Memory Key' },
          action_id: 'memory_add_open',
          style: 'primary',
          value: 'open',
        },
      ],
    });
  }

  return blocks;
}

function buildAuditBlocks(
  rows: Array<{
    category: string;
    key: string;
    actor: string;
    createdAt: string;
  }>,
): object[] {
  const header: object[] = [
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: '*📋 Memory Audit Log*' },
    },
  ];

  if (rows.length === 0) {
    return [
      ...header,
      {
        type: 'section',
        text: { type: 'mrkdwn', text: 'No memory updates yet.' },
      },
    ];
  }

  const items = rows.slice(0, 8).map((row) => ({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `\`${row.category}.${row.key}\` updated by ${formatActor(row.actor)} ${relativeTime(row.createdAt)}`,
    },
  }));

  return [...header, ...items];
}

function truncateValue(value: JsonValue): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > 70 ? `${text.slice(0, 70)}...` : text;
}

function titleCase(value: string): string {
  if (!value) return value;
  return value[0]?.toUpperCase() + value.slice(1);
}

function parseValue(value: string): JsonValue {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    return JSON.parse(trimmed) as JsonValue;
  } catch {
    return trimmed;
  }
}

function stringifyJsonValue(value: JsonValue): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function safeParseMetadata(value: string): { teamId?: string; scopedKey?: string } {
  try {
    return JSON.parse(value) as { teamId?: string; scopedKey?: string };
  } catch {
    return {};
  }
}

function formatActor(actor: string): string {
  if (/^[A-Z0-9]+$/i.test(actor)) {
    return `<@${actor}>`;
  }
  return actor;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (ms < hour) {
    const n = Math.max(1, Math.floor(ms / minute));
    return `${n}m ago`;
  }
  if (ms < day) {
    const n = Math.max(1, Math.floor(ms / hour));
    return `${n}h ago`;
  }
  const n = Math.max(1, Math.floor(ms / day));
  return `${n}d ago`;
}
