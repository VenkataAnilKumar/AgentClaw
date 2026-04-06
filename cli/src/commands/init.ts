import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import type { Command } from 'commander';
import { SKILL_CATALOG } from '@agentclaw/skills-registry';
import type { SkillIntegrationType } from '@agentclaw/shared';
import { api } from '../api-client.js';

type IntegrationGroup = {
  provider: SkillIntegrationType;
  label: string;
  secrets: string[];
  skills: string[];
};

const INTEGRATION_GROUPS: IntegrationGroup[] = [
  {
    provider: 'notion',
    label: 'Notion (OKR sync, hiring tracker)',
    secrets: ['NOTION_API_KEY', 'NOTION_OKR_DATABASE_ID'],
    skills: ['notion-okr-sync', 'notion-hiring-tracker'],
  },
  {
    provider: 'brex',
    label: 'Brex (spend reports, budget alerts)',
    secrets: ['BREX_API_TOKEN'],
    skills: ['brex-spend-report', 'brex-budget-alert'],
  },
  {
    provider: 'calendly',
    label: 'Calendly (deal velocity)',
    secrets: ['CALENDLY_API_TOKEN'],
    skills: ['calendly-deal-velocity'],
  },
  {
    provider: 'slack-ops',
    label: 'Slack Ops (pulse reports)',
    secrets: ['SLACK_USER_TOKEN'],
    skills: ['slack-pulse'],
  },
];

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Guided first-time setup: select integrations and install skills')
    .option('-c, --company <id>', 'Company ID (defaults to AGENTCLAW_COMPANY_ID env var)')
    .action(async (opts: { company?: string }) => {
      const rl = readline.createInterface({ input, output });

      console.log('\n🚀 Welcome to AgentClaw!\n');

      let companyId = opts.company ?? process.env.AGENTCLAW_COMPANY_ID ?? '';
      if (!companyId) {
        companyId = (await rl.question('  Enter your Company ID: ')).trim();
        if (!companyId) { console.error('Aborted.'); process.exit(1); }
      }

      console.log('\nAvailable integrations:\n');
      for (let i = 0; i < INTEGRATION_GROUPS.length; i++) {
        const g = INTEGRATION_GROUPS[i];
        if (g) console.log(`  [${i + 1}] ${g.label}`);
      }
      console.log('  [0] Skip — install built-in skills only\n');

      const answer = (await rl.question('  Select integrations (e.g. 1,3): ')).trim();
      rl.close();

      const selected: IntegrationGroup[] = [];
      if (answer !== '0' && answer !== '') {
        for (const part of answer.split(',')) {
          const idx = Number.parseInt(part.trim(), 10) - 1;
          if (idx >= 0 && idx < INTEGRATION_GROUPS.length) {
          const group = INTEGRATION_GROUPS[idx];
          if (group) selected.push(group);
          }
        }
      }

      if (selected.length === 0) {
        console.log('\n✅ Skipping integrations. Built-in skills are always available.\n');
        return;
      }

      const rl2 = readline.createInterface({ input, output });
      const allSecrets: Record<string, string> = {};

      console.log('\nEnter credentials:\n');
      for (const group of selected) {
        console.log(`  ─── ${group.label} ───`);
        for (const secretKey of group.secrets) {
          const val = (await rl2.question(`  ${secretKey}: `)).trim();
          allSecrets[secretKey] = val;
        }
      }
      rl2.close();

      console.log('\nInstalling skills...\n');
      for (const group of selected) {
        for (const skillName of group.skills) {
          const manifest = SKILL_CATALOG.find((s) => s.name === skillName);
          if (!manifest) continue;
          const secrets: Record<string, string> = {};
          for (const key of manifest.requiredSecrets) {
            secrets[key] = allSecrets[key] ?? '';
          }
          try {
            await api.installSkill(companyId, skillName, secrets);
            console.log(`  ✅ ${skillName}`);
          } catch (err) {
            console.log(`  ❌ ${skillName}: ${String(err)}`);
          }
        }
      }

      console.log('\n🎉 AgentClaw is ready to use!\n');
      console.log('  Run `agentclaw doctor` to verify skill health.');
      console.log('  Use `/claw @agent /skill <message>` in Slack.\n');
    });
}
