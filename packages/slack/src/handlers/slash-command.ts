import type { App, SlackCommandMiddlewareArgs } from '@slack/bolt';
import type { AgentRunResult } from '@agentclaw/shared';
import type { SkillRegistryService } from '@agentclaw/runtime';

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
  deps: { runAgent: RunAgent; streamAgent?: StreamAgent; registry?: SkillRegistryService },
) {
  app.command('/claw', async (args) => {
    await handleSlashCommand(args, deps);
  });
}

async function handleSlashCommand(
  args: SlackCommandMiddlewareArgs & { client: any },
  deps: { runAgent: RunAgent; streamAgent?: StreamAgent; registry?: SkillRegistryService },
): Promise<void> {
  const { ack, command, client } = args;
  await ack();

  const raw = (command.text ?? '').trim();

  // ── /claw install <skillName> ─────────────────────────────────────────────
  if (raw.startsWith('install ') && deps.registry) {
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

  const parsed = parseSlashText(raw);
  if (!parsed) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: 'Usage: /claw @agent /skill your request',
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

  if (deps.streamAgent) {
    await streamToSlack({
      client,
      channelId: command.channel_id,
      messageTs,
      stream: deps.streamAgent({
        companyId: command.team_id,
        agentName: parsed.agentName,
        skillName: parsed.skillName,
        userMessage: parsed.userMessage,
      }),
    });
  }

  const result = await deps.runAgent({
    companyId: command.team_id,
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
