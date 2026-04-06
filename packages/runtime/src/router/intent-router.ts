import type { AgentRegistry } from '@agentclaw/shared';

export type RouteResult = {
  agent: string;
  skill: string | null;
  confidence: number;
};

export type RouterLLM = {
  run(system: string, user: string, modelRef: string): Promise<{ text: string }>;
};

export async function routeIntent(
  message: string,
  agentRegistry: AgentRegistry,
  llm: RouterLLM,
  routerModel: string = 'anthropic/claude-haiku-4-5-20251001',
): Promise<RouteResult> {
  const system = buildRouterSystemPrompt(agentRegistry);
  const user = `User message: ${message}`;

  const response = await llm.run(system, user, routerModel);
  const parsed = parseRouteResponse(response.text);

  if (!parsed || parsed.confidence < 0.7) {
    return {
      agent: 'clarify',
      skill: null,
      confidence: parsed?.confidence ?? 0,
    };
  }

  if (!agentRegistry[parsed.agent]) {
    return {
      agent: 'clarify',
      skill: null,
      confidence: parsed.confidence,
    };
  }

  return parsed;
}

function buildRouterSystemPrompt(agentRegistry: AgentRegistry): string {
  const compact = Object.values(agentRegistry)
    .map(
      (agent) =>
        `- ${agent.name} | skills: ${agent.skills.join(', ') || 'none'} | keywords: ${
          agent.routeKeywords?.join(', ') || 'none'
        }`,
    )
    .join('\n');

  return [
    'You are an intent router for AgentClaw.',
    'Given the user message, choose the most suitable agent and optional skill.',
    'Respond ONLY with JSON in this exact shape:',
    '{"agent":"<agent-name>","skill":"<skill-name-or-null>","confidence":0.0}',
    'Confidence must be between 0 and 1.',
    'If uncertain, lower confidence.',
    'Available agents:',
    compact || '- none',
  ].join('\n');
}

function parseRouteResponse(text: string): RouteResult | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      agent?: unknown;
      skill?: unknown;
      confidence?: unknown;
    };

    const agent = typeof parsed.agent === 'string' ? parsed.agent.trim() : '';
    const skill = typeof parsed.skill === 'string' ? parsed.skill.trim() : null;
    const confidenceRaw =
      typeof parsed.confidence === 'number'
        ? parsed.confidence
        : Number.parseFloat(String(parsed.confidence ?? '0'));
    const confidence = Number.isFinite(confidenceRaw)
      ? Math.min(1, Math.max(0, confidenceRaw))
      : 0;

    if (!agent) {
      return null;
    }

    return {
      agent,
      skill: skill && skill.toLowerCase() !== 'null' ? skill : null,
      confidence,
    };
  } catch {
    return null;
  }
}
