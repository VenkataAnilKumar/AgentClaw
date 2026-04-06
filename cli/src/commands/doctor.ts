import type { Command } from 'commander';
import type { SkillHealth } from '@agentclaw/shared';
import { api } from '../api-client.js';

const STATUS_ICON: Record<string, string> = {
  healthy: '✅',
  degraded: '⚠️ ',
  missing_secrets: '❌',
};

export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Show health status for all installed skills')
    .option('-c, --company <id>', 'Company ID (defaults to AGENTCLAW_COMPANY_ID env var)')
    .action(async (opts: { company?: string }) => {
      const companyId = opts.company ?? process.env.AGENTCLAW_COMPANY_ID ?? '';
      if (!companyId) {
        console.error('Error: company ID is required. Set AGENTCLAW_COMPANY_ID or pass --company.');
        process.exit(1);
      }

      let skills: SkillHealth[];
      try {
        const res = await api.listSkills(companyId);
        skills = res.skills as SkillHealth[];
      } catch (err) {
        console.error(`❌ Could not fetch skills: ${String(err)}`);
        process.exit(1);
      }

      if (skills.length === 0) {
        console.log('No skills registered.');
        return;
      }

      // Column widths
      const nameW = Math.max(20, ...skills.map((s) => s.skillName.length));
      const verW = 7;
      const statusW = 16;

      const hr = `${'─'.repeat(nameW + verW + statusW + 14)}`;
      const row = (s: SkillHealth) => {
        const icon = STATUS_ICON[s.status] ?? '?';
        const name = s.skillName.padEnd(nameW);
        const ver = (s.version ?? '-').padEnd(verW);
        const status = `${icon} ${s.status}`.padEnd(statusW);
        const missing =
          s.missingSecrets.length > 0 ? `  missing: ${s.missingSecrets.join(', ')}` : '';
        return `  ${name}  ${ver}  ${status}${missing}`;
      };

      console.log(`\nAgentClaw Skill Health — ${companyId}\n${hr}`);
      console.log(
        `  ${'Skill'.padEnd(nameW)}  ${'Version'.padEnd(verW)}  ${'Status'.padEnd(statusW)}`,
      );
      console.log(hr);
      for (const s of skills) {
        console.log(row(s));
      }
      console.log(hr);

      const degraded = skills.filter((s) => s.status !== 'healthy').length;
      if (degraded === 0) {
        console.log('\n✅ All skills healthy.\n');
      } else {
        console.log(`\n⚠️  ${degraded} skill(s) need attention.\n`);
      }
    });
}
