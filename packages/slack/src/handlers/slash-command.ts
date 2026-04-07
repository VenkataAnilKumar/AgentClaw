import type { App, SlackCommandMiddlewareArgs } from '@slack/bolt';
import type { AgentRunResult } from '@agentclaw/shared';
import type { MemberRole } from '@agentclaw/shared';
import type {
  ActivityFeedService,
  CostService,
  SkillRegistryService,
  TeamMemberService,
} from '@agentclaw/runtime';

import { formatArtifactsAsBlocks } from '../formatters/agent-response.js';
import { openInstallModal } from './install-modal.js';

type RunAgent = (params: {
  companyId: string;
  agentName: string;
  skillName: string | null;
  userMessage: string;
  slackContext: { channelId: string; userId: string; messageTs: string };
}) => Promise<AgentRunResult>;

type StreamAgent = (params: {
  companyId: string;
  agentName: string;
  skillName: string | null;
  userMessage: string;
}) => AsyncIterable<string>;

export function registerSlashCommandHandler(
  app: App,
  deps: {
    runAgent: RunAgent;
    streamAgent?: StreamAgent;
    registry?: SkillRegistryService;
    teamMembers?: TeamMemberService;
    costs?: CostService;
    activity?: ActivityFeedService;
    rateLimitCheck?: (companyId: string, type: 'slashCommand' | 'skillInstall') => boolean;
    acquireRunSlot?: (companyId: string) => (() => void) | null;
    resolveCompanyId?: (teamId: string) => Promise<string>;
  },
) {
  app.command('/claw', async (args) => {
    await handleSlashCommand(args, deps);
  });

  app.action('team_remove_confirm', async ({ ack, body, action, client }) => {
    await ack();
    if (!deps.teamMembers) return;

    const teamId = body.team?.id ?? '';
    const companyId = deps.resolveCompanyId
      ? await deps.resolveCompanyId(teamId)
      : teamId;

    try {
      await deps.teamMembers.assertPermission(companyId, body.user.id, 'remove');
      const targetUserId = (action as { value?: string }).value ?? '';
      if (!targetUserId) throw new Error('Missing target user');
      await deps.teamMembers.remove(companyId, targetUserId);

      await client.chat.postEphemeral({
        channel: body.channel?.id ?? body.user.id,
        user: body.user.id,
        text: `✅ Removed <@${targetUserId}> from AgentClaw.`,
      });
    } catch (error) {
      await client.chat.postEphemeral({
        channel: body.channel?.id ?? body.user.id,
        user: body.user.id,
        text: `❌ ${String(error)}`,
      });
    }
  });
}

async function handleSlashCommand(
  args: SlackCommandMiddlewareArgs & { client: any },
  deps: {
    runAgent: RunAgent;
    streamAgent?: StreamAgent;
    registry?: SkillRegistryService;
    teamMembers?: TeamMemberService;
    costs?: CostService;
    activity?: ActivityFeedService;
    rateLimitCheck?: (companyId: string, type: 'slashCommand' | 'skillInstall') => boolean;
    acquireRunSlot?: (companyId: string) => (() => void) | null;
    resolveCompanyId?: (teamId: string) => Promise<string>;
  },
): Promise<void> {
  const { ack, command, client } = args;
  await ack();

  const raw = (command.text ?? '').trim();

  const parsed = parseSlashText(raw);
  if (!parsed && !raw.startsWith('team')) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: 'Usage: /claw @agent /skill your request',
    });
    return;
  }

  const companyId = deps.resolveCompanyId
    ? await deps.resolveCompanyId(command.team_id)
    : command.team_id;

  // ── /claw install <skillName> ─────────────────────────────────────────────
  if (raw.startsWith('install ') && deps.registry) {
    if (deps.rateLimitCheck && !deps.rateLimitCheck(companyId, 'skillInstall')) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: '⏱️ Skill install rate limit reached for your workspace. Please retry later.',
      });
      return;
    }

    const skillName = raw.slice('install '.length).trim();
    try {
      await openInstallModal(client, (args as any).payload?.trigger_id ?? '', skillName);
    } catch (err) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: `❌ Could not open install modal: ${String(err)}`,
      });
    }
    return;
  }

  if (raw === 'help') {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: HELP_TEXT,
    });
    return;
  }

  if (deps.rateLimitCheck && !deps.rateLimitCheck(companyId, 'slashCommand')) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: '⏱️ Too many commands for your workspace right now. Please retry in about a minute.',
    });
    return;
  }

  if (deps.teamMembers) {
    const handled = await handleTeamCommand({
      raw,
      companyId,
      command,
      client,
      teamMembers: deps.teamMembers,
    });
    if (handled) return;
  }

  if (!parsed) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: 'Usage: /claw @agent /skill your request',
    });
    return;
  }

  if (deps.costs) {
    const budget = await deps.costs.checkBudget(companyId, false);
    if (budget.shouldAlert80) {
      await client.chat.postMessage({
        channel: '#founders',
        text: `⚠️ Budget alert: ${Math.round(budget.usagePct * 100)}% of monthly LLM budget used (${budget.spentUsd.toFixed(2)} / ${budget.budgetUsd.toFixed(2)} USD).`,
      });
    }
    if (budget.blocked) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: '🚫 Monthly LLM budget exceeded. Non-HEARTBEAT runs are currently blocked.',
      });
      return;
    }
  }

  const releaseRunSlot = deps.acquireRunSlot ? deps.acquireRunSlot(companyId) : () => {};
  if (!releaseRunSlot) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: '⏱️ Too many concurrent agent runs. Please retry shortly.',
    });
    return;
  }

  const thinking = await client.chat.postMessage({
    channel: command.channel_id,
    text: `Thinking with ${parsed.agentName}${parsed.skillName ? `/${parsed.skillName}` : ''}...`,
  });

  const messageTs = thinking.ts;
  if (!messageTs) {
    throw new Error('Unable to create working Slack message');
  }

  try {
    if (deps.streamAgent) {
      await streamToSlack({
        client,
        channelId: command.channel_id,
        messageTs,
        stream: deps.streamAgent({
          companyId,
          agentName: parsed.agentName,
          skillName: parsed.skillName,
          userMessage: parsed.userMessage,
        }),
      });
    }

    const result = await deps.runAgent({
      companyId,
      agentName: parsed.agentName,
      skillName: parsed.skillName,
      userMessage: parsed.userMessage,
      slackContext: {
        channelId: command.channel_id,
        userId: command.user_id,
        messageTs,
      },
    });

    const blocks = formatArtifactsAsBlocks(result.artifacts);
    await client.chat.update({
      channel: command.channel_id,
      ts: messageTs,
      text: result.rawOutput || 'Done',
      blocks: blocks.length > 0 ? (blocks as never) : undefined,
    });
  } catch (error) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: '⚠️ Something went wrong while running that request. Please try again in a moment.',
    });
  } finally {
    releaseRunSlot();
  }
}

type SlashParseResult = {
  agentName: string;
  skillName: string | null;
  userMessage: string;
};

function parseSlashText(text: string): SlashParseResult | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const tokens = trimmed.split(/\s+/);
  const agentToken = tokens.shift();
  if (!agentToken) {
    return null;
  }

  const agentName = agentToken.replace(/^@/, '').trim();
  if (!agentName) {
    return null;
  }

  let skillName: string | null = null;
  if (tokens[0]?.startsWith('/')) {
    skillName = tokens.shift()?.replace(/^\//, '') ?? null;
  }

  const userMessage = tokens.join(' ').trim();
  return { agentName, skillName, userMessage };
}

async function streamToSlack(params: {
  client: any;
  channelId: string;
  messageTs: string;
  stream: AsyncIterable<string>;
}): Promise<void> {
  let buffer = '';
  let fullText = '';
  let lastFlushAt = 0;

  for await (const chunk of params.stream) {
    buffer += chunk;
    fullText += chunk;

    const now = Date.now();
    if (now - lastFlushAt < 1000) {
      continue;
    }

    await params.client.chat.update({
      channel: params.channelId,
      ts: params.messageTs,
      text: fullText,
    });

    buffer = '';
    lastFlushAt = now;
  }

  if (buffer.length > 0) {
    await params.client.chat.update({
      channel: params.channelId,
      ts: params.messageTs,
      text: fullText,
    });
  }
}

async function handleTeamCommand(params: {
  raw: string;
  companyId: string;
  command: SlackCommandMiddlewareArgs['command'];
  client: any;
  teamMembers: TeamMemberService;
}): Promise<boolean> {
  const { raw, companyId, command, client, teamMembers } = params;
  const inviteMatch = raw.match(/^invite\s+(.+?)\s+as\s+(owner|admin|member|read_only)$/i);
  if (inviteMatch) {
    await teamMembers.assertPermission(companyId, command.user_id, 'invite');

    const mention = inviteMatch[1]?.trim() ?? '';
    const role = normalizeRole(inviteMatch[2] ?? 'member');
    const slackUserId = extractMentionUserId(mention);
    if (!slackUserId) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: 'Usage: /claw invite @user as owner|admin|member|read_only',
      });
      return true;
    }

    await teamMembers.invite(companyId, slackUserId, role);

    await client.chat.postMessage({
      channel: command.channel_id,
      text: `✅ <@${slackUserId}> added as *${role}*.`,
    });

    await client.chat.postMessage({
      channel: slackUserId,
      text: `<@${command.user_id}> has added you to AgentClaw as ${role}.\nYou can now use /claw in this workspace.\nRun /claw help to get started.`,
    });

    return true;
  }

  if (raw.trim() === 'team') {
    const members = await teamMembers.listMembers(companyId);
    const lines = members.map((member) => {
      const joined = member.joinedAt.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return `<@${member.slackUserId}>   ${member.role}   joined ${joined}`;
    });

    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: [
        'Team',
        '',
        ...lines,
        '',
        'Use /claw invite @user as <role> to add teammates.',
        'Use /claw role @user <new-role> to change a role.',
      ].join('\n'),
    });
    return true;
  }

  const roleMatch = raw.match(/^role\s+(.+?)\s+(owner|admin|member|read_only)$/i);
  if (roleMatch) {
    await teamMembers.assertPermission(companyId, command.user_id, 'role');

    const mention = roleMatch[1]?.trim() ?? '';
    const role = normalizeRole(roleMatch[2] ?? 'member');
    const slackUserId = extractMentionUserId(mention);
    if (!slackUserId) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: 'Usage: /claw role @user owner|admin|member|read_only',
      });
      return true;
    }

    await teamMembers.updateRole(companyId, slackUserId, role);
    await client.chat.postMessage({
      channel: command.channel_id,
      text: `✅ Updated <@${slackUserId}> to *${role}*.`,
    });
    return true;
  }

  const removeMatch = raw.match(/^remove\s+(.+)$/i);
  if (removeMatch) {
    await teamMembers.assertPermission(companyId, command.user_id, 'remove');

    const mention = removeMatch[1]?.trim() ?? '';
    const slackUserId = extractMentionUserId(mention);
    if (!slackUserId) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: 'Usage: /claw remove @user',
      });
      return true;
    }

    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: `Are you sure you want to remove <@${slackUserId}>?`,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `Remove <@${slackUserId}> from AgentClaw?` },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              action_id: 'team_remove_confirm',
              style: 'danger',
              text: { type: 'plain_text', text: 'Confirm Remove' },
              value: slackUserId,
            },
          ],
        },
      ],
    });
    return true;
  }

  return false;
}

const HELP_TEXT = `AgentClaw 🦞 — Your startup's AI teammates

AGENTS
  /claw @gtm /icp /cold-email /positioning /battlecard /launch-plan /weekly-digest
  /claw @hiring /jd /interview-plan /scorecard /offer-letter /pipeline-review
  /claw @dev /spec /adr /sprint-plan /postmortem /tech-debt
  /claw @finance /runway-check /investor-update /burn-scenario /spend-review
  /claw @legal /nda /contractor-agreement /saas-terms /privacy-policy

TEAM
  /claw invite @user as owner|admin|member|read_only
  /claw team
  /claw role @user owner|admin|member|read_only
  /claw remove @user

SKILLS
  /claw install <skill>
  /claw skills list

SYSTEM
  /claw status
  /claw help`;

function extractMentionUserId(value: string): string | null {
  const match = value.match(/^<@([A-Z0-9]+)(?:\|[^>]+)?>$/i);
  return match?.[1] ?? null;
}

function normalizeRole(value: string): MemberRole {
  const role = value.toLowerCase();
  if (role === 'owner' || role === 'admin' || role === 'member' || role === 'read_only') {
    return role;
  }
  return 'member';
}
