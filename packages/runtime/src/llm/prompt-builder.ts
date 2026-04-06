import type {
  AgentConfig,
  AgentMemoryRow,
  BootstrapContext,
  LiveIntegrationData,
  SkillDefinition,
  TeamMemoryRow,
} from '@agentclaw/shared';

type BuildPromptParams = {
  agent: AgentConfig;
  bootstrap: BootstrapContext;
  teamMemory: TeamMemoryRow[];
  agentMemory: AgentMemoryRow[];
  runHistory: string[];
  skill?: SkillDefinition;
  userMessage: string;
  liveIntegrationData?: LiveIntegrationData[];
};

export function buildPrompt(params: BuildPromptParams): { system: string; user: string } {
  const layers: string[] = [
    `[1] SYSTEM IDENTITY\n${params.agent.raw}`,
    `[2] COMPANY CONTEXT\n${params.bootstrap.company.raw}`,
    `[3] OKR CONTEXT\n${params.bootstrap.okrs.raw}`,
    `[4] RUNWAY CONTEXT\n${params.bootstrap.runway.raw}`,
    `[5] TEAM CONTEXT\n${params.bootstrap.team.raw}`,
    `[6] AVAILABLE SKILLS\n${formatSkillList(params.bootstrap.skills)}`,
    `[7] TEAM MEMORY\n${formatTeamMemory(params.teamMemory)}`,
    `[8] PERSONAL MEMORY\n${formatAgentMemory(params.agentMemory)}`,
    `[9] RUN HISTORY\n${formatRunHistory(params.runHistory)}`,
    `[10] TASK\n${params.userMessage}`,
  ];

  if (params.liveIntegrationData && params.liveIntegrationData.length > 0) {
    layers.push(`[11] LIVE INTEGRATION DATA\n${formatLiveData(params.liveIntegrationData)}`);
  }

  const system = layers.join('\n\n---\n\n');

  const user = params.skill
    ? `${params.skill.raw}\n\nUser request: ${params.userMessage}`
    : `User request: ${params.userMessage}`;

  return { system, user };
}

function formatLiveData(data: LiveIntegrationData[]): string {
  return data
    .map((d) => `[${d.provider} @ ${d.fetchedAt}]\n${d.summary}`)
    .join('\n\n');
}

function formatSkillList(skills: BootstrapContext['skills']): string {
  const values = Object.values(skills);
  if (values.length === 0) {
    return 'No skills loaded.';
  }

  return values
    .map((skill) => `- ${skill.name}: ${skill.description}`)
    .join('\n');
}

function formatTeamMemory(rows: TeamMemoryRow[]): string {
  if (rows.length === 0) {
    return 'No team memory entries yet.';
  }

  return rows
    .map((row) => `- ${row.category}.${row.key}: ${stringifyValue(row.value)}`)
    .join('\n');
}

function formatAgentMemory(rows: AgentMemoryRow[]): string {
  if (rows.length === 0) {
    return 'No personal memory entries yet.';
  }

  return rows
    .map((row) => `- ${row.key}: ${stringifyValue(row.value)}`)
    .join('\n');
}

function formatRunHistory(history: string[]): string {
  const lastFive = history.slice(-5).map((item) => truncate(item, 400));
  if (lastFive.length === 0) {
    return 'No recent run summaries.';
  }
  return lastFive.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function truncate(value: string, maxChars: number): string {
  return value.length > maxChars ? `${value.slice(0, maxChars)}...` : value;
}
