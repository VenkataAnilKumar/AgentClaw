import { runWithFallback } from '@agentclaw/llm';
import {
  artifacts as artifactsTable,
  db,
  skillRunContext,
  skillRuns,
} from '@agentclaw/db';
import type {
  AgentConfig,
  AgentRunResult,
  LiveIntegrationData,
  MemoryUpdate,
  SkillDefinition,
  SkillIntegrationType,
} from '@agentclaw/shared';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import { loadBootstrap, type BootstrapSource } from './bootstrap/loader.js';
import { GateManager } from './gates/gate-manager.js';
import { buildPrompt } from './llm/prompt-builder.js';
import { parseModelOutput } from './llm/output-parser.js';
import { AgentMemory, TeamMemory } from './memory/index.js';
import { SkillRegistryService } from './skills/registry-service.js';

const DEFAULT_MODEL = process.env.DEFAULT_MODEL ?? 'anthropic/claude-sonnet-4-6';

export type AgentRunnerParams = {
  companyId: string;
  agentName: string;
  skillName: string | null;
  userMessage: string;
  slackContext: { channelId: string; userId: string; messageTs: string };
};

type AgentRunnerDeps = {
  bootstrapSourceForCompany: (companyId: string) => BootstrapSource;
  gateManager: GateManager;
};

let globalDeps: AgentRunnerDeps | null = null;

export function configureAgentRunner(deps: AgentRunnerDeps): void {
  globalDeps = deps;
}

export async function runAgent(params: AgentRunnerParams): Promise<AgentRunResult> {
  if (!globalDeps) {
    throw new Error('Agent runner is not configured. Call configureAgentRunner() first.');
  }

  const startedAt = Date.now();
  const source = globalDeps.bootstrapSourceForCompany(params.companyId);
  const bootstrap = await loadBootstrap(source);

  const agent = bootstrap.agents[params.agentName];
  if (!agent) {
    throw new Error(`Unknown agent: ${params.agentName}`);
  }

  const skill = resolveSkill(params.skillName, bootstrap.skills, agent);
  const teamMemoryStore = new TeamMemory(params.companyId);
  const agentMemoryStore = new AgentMemory(params.companyId, agent.name);

  const [teamMemoryRows, agentMemoryRows, runHistoryRows] = await Promise.all([
    teamMemoryStore.getAll(agent.memoryCategory),
    agentMemoryStore.getAll(),
    db.query.skillRunContext.findMany({
      where: and(
        eq(skillRunContext.companyId, params.companyId),
        eq(skillRunContext.agentName, agent.name),
      ),
      orderBy: [asc(skillRunContext.createdAt)],
    }),
  ]);

  const runHistory = runHistoryRows.map((row) => row.summary).slice(-5);

  // ── Layer 11: Live integration data ────────────────────────────────────────
  const liveIntegrationData = await resolveLiveData(params.companyId, agent.name);

  const prompt = buildPrompt({
    agent,
    bootstrap,
    teamMemory: teamMemoryRows,
    agentMemory: agentMemoryRows,
    runHistory,
    skill,
    userMessage: params.userMessage,
    liveIntegrationData,
  });

  const primaryModel = agent.model ?? DEFAULT_MODEL;
  const fallbacks = agent.fallback ?? [];
  const llmResult = await runWithFallback(primaryModel, fallbacks, prompt.system, prompt.user);

  const parsed = parseModelOutput(llmResult.text, {
    name: agent.name,
    memoryCategory: agent.memoryCategory,
  });

  await teamMemoryStore.applyUpdates(parsed.memoryUpdates, agent.name);
  await agentMemoryStore.applyUpdates(parsed.personalMemoryUpdates);

  const gateIds: string[] = [];
  for (const gate of parsed.humanGates) {
    const gateId = await globalDeps.gateManager.createGate(params.companyId, agent.name, gate);
    gateIds.push(gateId);
  }

  for (const artifact of parsed.artifacts) {
    await db.insert(artifactsTable).values({
      companyId: params.companyId,
      agentName: agent.name,
      skillName: skill.name,
      title: artifact.title,
      type: artifact.type,
      content: artifact.content,
      format: artifact.format,
      runId: null,
    });
  }

  const durationMs = Date.now() - startedAt;
  const skillRunInserted = await db
    .insert(skillRuns)
    .values({
      companyId: params.companyId,
      agentName: agent.name,
      skillName: skill.name,
      input: {
        userMessage: params.userMessage,
        slackContext: params.slackContext,
      },
      outputSummary: summarize(parsed.cleanText),
      gateId: gateIds[0] ?? null,
      modelUsed: llmResult.model,
      tokensUsed: llmResult.inputTokens + llmResult.outputTokens,
      costUsd: null,
      durationMs,
    })
    .returning({ id: skillRuns.id });

  const runId = skillRunInserted[0]?.id ?? null;

  if (runId) {
    await db
      .update(artifactsTable)
      .set({ runId })
      .where(
        and(
          eq(artifactsTable.companyId, params.companyId),
          eq(artifactsTable.agentName, agent.name),
          eq(artifactsTable.skillName, skill.name),
          isNull(artifactsTable.runId),
        ),
      );
  }

  await db.insert(skillRunContext).values({
    companyId: params.companyId,
    agentName: agent.name,
    summary: truncate(parsed.cleanText, 400),
  });

  await rotateSkillRunContext(params.companyId, agent.name);

  return {
    artifacts: parsed.artifacts,
    memoryUpdates: parsed.memoryUpdates,
    personalMemoryUpdates: parsed.personalMemoryUpdates,
    okrUpdates: parsed.okrUpdates,
    runwayUpdates: parsed.runwayUpdates,
    humanGates: parsed.humanGates,
    rawOutput: parsed.cleanText,
    llm: llmResult,
  };
}

function resolveSkill(
  skillName: string | null,
  manifest: Record<string, SkillDefinition>,
  agent: AgentConfig,
): SkillDefinition {
  const resolvedName =
    skillName ??
    agent.skills[0] ??
    Object.keys(manifest)[0] ??
    'default-task';

  return (
    manifest[resolvedName] ?? {
      name: resolvedName,
      description: `Ad-hoc task for ${agent.name}`,
      raw: `# ${resolvedName}`,
    }
  );
}

async function rotateSkillRunContext(companyId: string, agentName: string): Promise<void> {
  const rows = await db.query.skillRunContext.findMany({
    where: and(
      eq(skillRunContext.companyId, companyId),
      eq(skillRunContext.agentName, agentName),
    ),
    orderBy: [asc(skillRunContext.createdAt)],
  });

  if (rows.length <= 5) {
    return;
  }

  const toDelete = rows.slice(0, rows.length - 5).map((row) => row.id);
  if (toDelete.length === 0) {
    return;
  }

  await db
    .delete(skillRunContext)
    .where(
      and(
        eq(skillRunContext.companyId, companyId),
        eq(skillRunContext.agentName, agentName),
        inArray(skillRunContext.id, toDelete),
      ),
    );
}

function truncate(value: string, maxChars: number): string {
  return value.length > maxChars ? `${value.slice(0, maxChars)}...` : value;
}

function summarize(value: string): string {
  return truncate(value, 1000);
}

/**
 * Fetch live integration data for any installed skills that are active for
 * the given agent.  Failures are swallowed — live data is best-effort.
 */
async function resolveLiveData(
  companyId: string,
  agentName: string,
): Promise<LiveIntegrationData[]> {
  try {
    const registry = new SkillRegistryService();
    const installed = await registry.listForCompany(companyId);

    // Collect providers from skills targeting this agent (or any-agent skills)
    const activeProviders = new Set<SkillIntegrationType>();
    for (const skill of installed) {
      if (
        skill.enabled &&
        (skill.agentAffinity.length === 0 || skill.agentAffinity.includes(agentName))
      ) {
        for (const p of skill.requiredIntegrations) {
          activeProviders.add(p as SkillIntegrationType);
        }
      }
    }

    if (activeProviders.size === 0) return [];

    const providers = [...activeProviders];
    const secretsMap = await registry.resolveSecrets(companyId, providers);
    const { fetchLiveIntegrationData } = await import('@agentclaw/integrations');
    return await fetchLiveIntegrationData(providers, secretsMap);
  } catch {
    // Never block an agent run due to integration errors
    return [];
  }
}
