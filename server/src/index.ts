import express from 'express';
import { App as SlackApp, ExpressReceiver } from '@slack/bolt';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { db } from '@agentclaw/db';
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
} from '@agentclaw/runtime';
import { findSkill } from '@agentclaw/skills-registry';
import {
  registerGateActions,
  registerHomeTabHandler,
  registerInstallModalHandler,
  registerSlashCommandHandler,
} from '@agentclaw/slack';

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);
const migrationsFolder = process.env.DB_MIGRATIONS_PATH ?? 'packages/db/migrations';

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
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: Boolean(process.env.SLACK_APP_TOKEN),
    receiver,
  });

  registerSlashCommandHandler(slack, {
    runAgent,
    streamAgent: (params) => streamAgent(params),
    registry,
  });

  registerGateActions(slack, gateManager);
  registerInstallModalHandler(slack, registry);
  registerHomeTabHandler(slack, async () => ({
    memoryItems: ['Memory panel wiring in progress'],
    activeAgents: ['gtm-agent', 'hiring-agent', 'dev-agent'],
    recentRuns: ['No runs yet'],
    pendingGates: ['None'],
  }), registry);

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
  app.use('/slack/events', receiver.router);
  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
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
    console.log(`AgentClaw server listening on ${PORT}`);
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
  console.error('Server startup failed', error);
  process.exit(1);
});
