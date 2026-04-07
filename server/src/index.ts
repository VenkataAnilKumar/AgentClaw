import express from 'express';
import { App as SlackApp, ExpressReceiver } from '@slack/bolt';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

import pino from 'pino';
import { companies, db } from '@agentclaw/db';
import { runWithFallback } from '@agentclaw/llm';
import {
  configureAgentRunner,
  DatabaseBootstrapSource,
  FileSystemBootstrapSource,
  GateManager,
  HeartbeatScheduler,
  loadBootstrap,
  runAgent,
  SkillRegistryService,
  TeamMemberService,
  CostService,
  ActivityFeedService,
} from '@agentclaw/runtime';
import { findSkill } from '@agentclaw/skills-registry';
import {
  registerGateActions,
  registerHomeTabHandler,
  registerInstallModalHandler,
  registerSlashCommandHandler,
} from '@agentclaw/slack';
import { eq } from 'drizzle-orm';
import { slackInstallations } from '@agentclaw/db';
import { registerOAuthRoutes, resolveCompanyIdByTeamId } from './routes/oauth.js';
import { registerMemoryRoutes } from './routes/memory.js';
import { registerActivityRoutes } from './routes/activity.js';
import { registerCostRoutes } from './routes/costs.js';
import { CompanyRateLimiter } from './middleware/rate-limit.js';

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);
const migrationsFolder = process.env.DB_MIGRATIONS_PATH ?? 'packages/db/migrations';
const startedAtMs = Date.now();
const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

function requireApiKey(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const apiKey = process.env.AGENTCLAW_API_KEY;
  if (!apiKey) { next(); return; } // dev mode: no key configured
  const header = req.headers.authorization ?? '';
  if (header !== `Bearer ${apiKey}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

async function main(): Promise<void> {
  await migrate(db as never, { migrationsFolder });

  const gateManager = new GateManager();
  const registry = new SkillRegistryService();
  const teamMembers = new TeamMemberService();
  const costs = new CostService();
  const activity = new ActivityFeedService();
  const rateLimiter = new CompanyRateLimiter();

  configureAgentRunner({
    bootstrapSourceForCompany: (companyId: string) => {
      if ((process.env.BOOTSTRAP_SOURCE ?? 'filesystem') === 'database') {
        return new DatabaseBootstrapSource(companyId);
      }
      return new FileSystemBootstrapSource({ companySlug: companyId });
    },
    gateManager,
  });

  const receiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET ?? '',
  });

  const slack = new SlackApp({
    receiver,
    authorize: async ({ teamId }) => {
      if (!teamId) {
        throw new Error('Missing teamId in Slack authorize context');
      }
      const install = await db.query.slackInstallations.findFirst({
        where: eq(slackInstallations.teamId, teamId),
      });
      if (!install) {
        throw new Error(`No Slack installation found for team ${teamId}`);
      }
      return {
        botToken: install.botToken,
        botUserId: install.botUserId ?? undefined,
      };
    },
  });

  registerSlashCommandHandler(slack, {
    runAgent,
    streamAgent: (params) => streamAgent(params),
    registry,
    teamMembers,
    costs,
    activity,
    rateLimitCheck: (companyId, type) => rateLimiter.checkAndConsume(companyId, type),
    acquireRunSlot: (companyId) => rateLimiter.acquireAgentRunSlot(companyId),
    resolveCompanyId: resolveCompanyIdByTeamId,
  });

  registerGateActions(slack, gateManager);
  registerInstallModalHandler(slack, registry, resolveCompanyIdByTeamId);
  registerHomeTabHandler(slack, async () => ({
    memoryItems: ['Memory panel wiring in progress'],
    activeAgents: ['gtm-agent', 'hiring-agent', 'dev-agent'],
    recentRuns: ['No runs yet'],
    pendingGates: ['None'],
  }), registry, resolveCompanyIdByTeamId, teamMembers);

  const heartbeat = new HeartbeatScheduler(
    async ({ companyId, agentName, skillName }) => {
      const result = await runAgent({
        companyId,
        agentName,
        skillName,
        userMessage: '',
        slackContext: { channelId: '', userId: 'heartbeat', messageTs: '' },
      });
      return { summary: result.rawOutput };
    },
    (companyId, agentName) => gateManager.hasPendingGate(companyId, agentName),
    async ({ channel, summary }) => {
      if (!channel) {
        return;
      }
      await slack.client.chat.postMessage({ channel, text: summary });
    },
  );

  const heartbeatCompanies = (process.env.HEARTBEAT_COMPANY_IDS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  for (const companyId of heartbeatCompanies) {
    const source =
      (process.env.BOOTSTRAP_SOURCE ?? 'filesystem') === 'database'
        ? new DatabaseBootstrapSource(companyId)
        : new FileSystemBootstrapSource({ companySlug: companyId });
    const bootstrap = await loadBootstrap(source);
    heartbeat.start(companyId, bootstrap.heartbeat);
  }

  const app = express();
  app.use(express.json());
  app.use('/api/memory', requireApiKey);
  app.use('/api/activity', requireApiKey);
  app.use('/api/costs', requireApiKey);
  registerOAuthRoutes(app);
  registerMemoryRoutes(app, resolveCompanyIdByTeamId);
  registerActivityRoutes(app, resolveCompanyIdByTeamId);
  registerCostRoutes(app, resolveCompanyIdByTeamId);
  app.use('/slack/events', receiver.router);
  app.get('/health', (_req, res) => {
    void (async () => {
      const slackInstalled = await db.query.slackInstallations.findFirst();
      const companyCount = await db
        .select({ id: companies.id })
        .from(companies)
        .then((rows) => rows.length);

      res.status(200).json({
        ok: true,
        db: 'ok',
        slack: slackInstalled ? 'ok' : 'not_installed',
        providers: {
          anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
          openai: Boolean(process.env.OPENAI_API_KEY),
          ollama: true,
        },
        companyCount,
        uptimeSeconds: Math.floor((Date.now() - startedAtMs) / 1000),
      });
    })().catch((error) => {
      logger.error({ error }, 'health check failed');
      res.status(500).json({ ok: false, error: String(error) });
    });
  });

  // ── Skills Marketplace REST API ───────────────────────────────────────────

  /** GET /api/skills?companyId=<id>  — list all skills + health status */
  app.get('/api/skills', requireApiKey, async (req, res) => {
    const companyId = String(req.query.companyId ?? '');
    if (!companyId) { res.status(400).json({ error: 'companyId required' }); return; }
    const health = await registry.getHealth(companyId);
    res.json({ skills: health });
  });

  /** GET /api/skills/:skillName  — get manifest for a single skill */
  app.get('/api/skills/:skillName', requireApiKey, (req, res) => {
    const manifest = findSkill(String(req.params['skillName'] ?? ''));
    if (!manifest) { res.status(404).json({ error: 'Skill not found' }); return; }
    res.json({ skill: manifest });
  });

  /** POST /api/skills/install — install a skill with credentials */
  app.post('/api/skills/install', requireApiKey, async (req, res) => {
    const { companyId, skillName, secrets } = req.body as {
      companyId?: string;
      skillName?: string;
      secrets?: Record<string, string>;
    };
    if (!companyId || !skillName) {
      res.status(400).json({ error: 'companyId and skillName are required' });
      return;
    }
    if (!rateLimiter.checkAndConsume(companyId, 'skillInstall')) {
      res.status(429).json({ error: 'Skill install rate limit reached for this company' });
      return;
    }
    const record = await registry.install(companyId, skillName, secrets ?? {});
    res.json({ installed: record });
  });

  /** DELETE /api/skills/:skillName?companyId=<id> — uninstall a skill */
  app.delete('/api/skills/:skillName', requireApiKey, async (req, res) => {
    const companyId = String(req.query.companyId ?? '');
    if (!companyId) { res.status(400).json({ error: 'companyId required' }); return; }
    await registry.uninstall(companyId, String(req.params['skillName'] ?? ''));
    res.json({ ok: true });
  });

  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'AgentClaw server listening');
  });
}

async function* streamAgent(params: {
  companyId: string;
  agentName: string;
  skillName: string | null;
  userMessage: string;
}): AsyncIterable<string> {
  const modelRef = process.env.DEFAULT_MODEL ?? 'anthropic/claude-sonnet-4-6';
  const fallbacks = (process.env.FALLBACK_MODELS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const system = [
    'You are streaming an in-progress draft for AgentClaw.',
    `Agent: ${params.agentName}`,
    `Skill: ${params.skillName ?? 'none'}`,
  ].join('\n');

  const draft = await runWithFallback(modelRef, fallbacks, system, params.userMessage || '');
  if (draft.text) {
    yield draft.text;
  }
}

main().catch((error) => {
  logger.error({ error }, 'Server startup failed');
  process.exit(1);
});
