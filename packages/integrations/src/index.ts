import type { LiveIntegrationData, SkillIntegrationType } from '@agentclaw/shared';

export type IntegrationProvider =
  | 'stripe'
  | 'brex'
  | 'linear'
  | 'github'
  | 'hubspot'
  | 'notion'
  | 'calendly'
  | 'slack-ops';

export interface IntegrationClientHealth {
  provider: IntegrationProvider;
  connected: boolean;
  message?: string;
}

export { NotionClient } from './notion.js';
export { BrexClient } from './brex.js';
export { CalendlyClient } from './calendly.js';
export { SlackOpsClient } from './slack-ops.js';

/**
 * Secrets map: provider → Record<envVarName, value>.
 * The caller resolves env-var values from company_secrets before passing here.
 */
export type IntegrationSecretsMap = Partial<
  Record<SkillIntegrationType, Record<string, string>>
>;

/**
 * Fetch live data snapshots from all configured integrations.
 * Failures are swallowed and reported as degraded summaries so they never
 * block an agent run.
 */
export async function fetchLiveIntegrationData(
  providers: SkillIntegrationType[],
  secrets: IntegrationSecretsMap,
): Promise<LiveIntegrationData[]> {
  const results = await Promise.allSettled(
    providers.map((provider) => fetchOne(provider, secrets)),
  );

  return results.map((r, i) => {
    const provider = providers[i] as SkillIntegrationType;
    if (r.status === 'fulfilled') return r.value;
    return {
      provider,
      summary: `⚠️ ${provider} integration unavailable: ${String(r.reason)}`,
      fetchedAt: new Date().toISOString(),
    } satisfies LiveIntegrationData;
  });
}

async function fetchOne(
  provider: SkillIntegrationType,
  secrets: IntegrationSecretsMap,
): Promise<LiveIntegrationData> {
  const { NotionClient } = await import('./notion.js');
  const { BrexClient } = await import('./brex.js');
  const { CalendlyClient } = await import('./calendly.js');
  const { SlackOpsClient } = await import('./slack-ops.js');

  let summary: string;

  switch (provider) {
    case 'notion': {
      const s = secrets.notion;
      if (!s?.['NOTION_API_KEY']) throw new Error('NOTION_API_KEY not configured');
      const client = new NotionClient(s['NOTION_API_KEY']);
      const dbId = s['NOTION_OKR_DATABASE_ID'] ?? s['NOTION_HIRING_DATABASE_ID'];
      summary = dbId
        ? await client.fetchLiveSummary(dbId)
        : 'Notion connected (no database ID configured).';
      break;
    }
    case 'brex': {
      const s = secrets.brex;
      if (!s?.['BREX_API_TOKEN']) throw new Error('BREX_API_TOKEN not configured');
      summary = await new BrexClient(s['BREX_API_TOKEN']).fetchLiveSummary();
      break;
    }
    case 'calendly': {
      const s = secrets.calendly;
      if (!s?.['CALENDLY_API_TOKEN']) throw new Error('CALENDLY_API_TOKEN not configured');
      summary = await new CalendlyClient(s['CALENDLY_API_TOKEN']).fetchLiveSummary();
      break;
    }
    case 'slack-ops': {
      const s = secrets['slack-ops'];
      if (!s?.['SLACK_USER_TOKEN']) throw new Error('SLACK_USER_TOKEN not configured');
      summary = await new SlackOpsClient(s['SLACK_USER_TOKEN']).fetchLiveSummary();
      break;
    }
    default:
      summary = `${provider} live data not implemented.`;
  }

  return { provider, summary, fetchedAt: new Date().toISOString() };
}
