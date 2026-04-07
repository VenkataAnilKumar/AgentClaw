import type express from 'express';
import { randomUUID } from 'node:crypto';

import {
  companyMembers,
  companies,
  db,
  memberRoleEnum,
  slackInstallations,
  slackOauthStates,
} from '@agentclaw/db';
import { and, eq, gt } from 'drizzle-orm';
import { WebClient } from '@slack/web-api';

const REQUIRED_SCOPES = [
  'channels:read',
  'channels:manage',
  'chat:write',
  'commands',
  'users:read',
  'users:read.email',
  'team:read',
  'app_mentions:read',
  'im:read',
  'im:write',
];

const DEFAULT_CHANNELS = [
  'gtm-agent',
  'hiring-agent',
  'dev-agent',
  'finance-agent',
  'founders',
  'team-updates',
];

export function registerOAuthRoutes(app: express.Express): void {
  app.get('/oauth/start', async (_req, res) => {
    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.SLACK_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      res.status(500).send('Missing SLACK_CLIENT_ID or SLACK_REDIRECT_URI');
      return;
    }

    const state = randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(slackOauthStates).values({
      state,
      redirectUri,
      expiresAt,
    });

    const authUrl = new URL('https://slack.com/oauth/v2/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', REQUIRED_SCOPES.join(','));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('redirect_uri', redirectUri);

    res.redirect(authUrl.toString());
  });

  app.get('/oauth/callback', async (req, res) => {
    const code = String(req.query.code ?? '');
    const state = String(req.query.state ?? '');
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = process.env.SLACK_REDIRECT_URI;

    if (!code || !state || !clientId || !clientSecret || !redirectUri) {
      res.status(400).send('Missing OAuth callback parameters');
      return;
    }

    const stateRow = await db.query.slackOauthStates.findFirst({
      where: and(
        eq(slackOauthStates.state, state),
        gt(slackOauthStates.expiresAt, new Date()),
      ),
    });

    if (!stateRow) {
      res.status(400).send('Invalid or expired OAuth state');
      return;
    }

    await db.delete(slackOauthStates).where(eq(slackOauthStates.state, state));

    const oauth = new WebClient();
    const tokenResult = await oauth.oauth.v2.access({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    const teamId = tokenResult.team?.id;
    const teamName = tokenResult.team?.name;
    const botToken = tokenResult.access_token;
    const botUserId = tokenResult.bot_user_id;
    const appId = tokenResult.app_id;
    const authedUserId = tokenResult.authed_user?.id;

    if (!teamId || !teamName || !botToken || !authedUserId) {
      res.status(400).send('Incomplete OAuth response from Slack');
      return;
    }

    let companyId: string;
    const existingInstall = await db.query.slackInstallations.findFirst({
      where: eq(slackInstallations.teamId, teamId),
    });

    if (existingInstall) {
      companyId = existingInstall.companyId;
    } else {
      companyId = await createCompanyFromTeam(teamName, teamId);
    }

    await db
      .insert(slackInstallations)
      .values({
        companyId,
        teamId,
        teamName,
        botToken,
        botUserId,
        appId,
        authedUserId,
      })
      .onConflictDoUpdate({
        target: slackInstallations.teamId,
        set: {
          companyId,
          teamName,
          botToken,
          botUserId,
          appId,
          authedUserId,
          updatedAt: new Date(),
        },
      });

    if (!existingInstall) {
      await db
        .insert(companyMembers)
        .values({
          companyId,
          slackUserId: authedUserId,
          role: 'owner' as (typeof memberRoleEnum.enumValues)[number],
        })
        .onConflictDoNothing();
    }

    const teamClient = new WebClient(botToken);
    await createDefaultChannels(teamClient);
    await sendWelcomeMessage(teamClient, authedUserId);

    res.redirect('/oauth/success');
  });

  app.get('/oauth/success', (_req, res) => {
    res
      .status(200)
      .type('html')
      .send(
        '<html><body style="font-family: sans-serif; padding: 2rem;"><h2>AgentClaw installed successfully.</h2><p>You can now return to Slack and run <strong>/claw init</strong>.</p></body></html>',
      );
  });
}

export async function resolveCompanyIdByTeamId(teamId: string): Promise<string> {
  const install = await db.query.slackInstallations.findFirst({
    where: eq(slackInstallations.teamId, teamId),
  });
  return install?.companyId ?? teamId;
}

async function createCompanyFromTeam(teamName: string, teamId: string): Promise<string> {
  const baseSlug = slugify(teamName) || `company-${teamId.toLowerCase()}`;
  let candidate = baseSlug;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await db.query.companies.findFirst({
      where: eq(companies.slug, candidate),
    });
    if (!existing) {
      const [created] = await db
        .insert(companies)
        .values({
          slug: candidate,
          name: teamName,
          plan: 'starter',
        })
        .returning({ id: companies.id });
      if (!created?.id) {
        throw new Error('Unable to create company');
      }
      return created.id;
    }
    candidate = `${baseSlug}-${attempt + 2}`;
  }

  throw new Error('Unable to allocate unique company slug');
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function createDefaultChannels(client: WebClient): Promise<void> {
  for (const name of DEFAULT_CHANNELS) {
    try {
      await client.conversations.create({ name, is_private: false });
    } catch {
      // Ignore already_exists and permission differences across workspaces.
    }
  }
}

async function sendWelcomeMessage(client: WebClient, userId: string): Promise<void> {
  try {
    const open = await client.conversations.open({ users: userId });
    const channelId = open.channel?.id;
    if (!channelId) return;

    await client.chat.postMessage({
      channel: channelId,
      text: [
        'Welcome to AgentClaw! :lobster:',
        'Run /claw init to set up your company profile.',
        'Run /claw invite @teammate to add your team.',
      ].join('\n'),
    });
  } catch {
    // DM may fail due to workspace restrictions; continue silently.
  }
}
