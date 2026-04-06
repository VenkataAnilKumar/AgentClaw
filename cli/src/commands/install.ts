import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import type { Command } from 'commander';
import type { SkillPackageManifest } from '@agentclaw/shared';
import { api } from '../api-client.js';

export function registerInstallCommand(program: Command): void {
  program
    .command('install <skill>')
    .description('Install a skill and configure its credentials')
    .option('-c, --company <id>', 'Company ID (defaults to AGENTCLAW_COMPANY_ID env var)')
    .action(async (skillName: string, opts: { company?: string }) => {
      const companyId = opts.company ?? process.env.AGENTCLAW_COMPANY_ID ?? '';
      if (!companyId) {
        console.error('Error: company ID is required. Set AGENTCLAW_COMPANY_ID or pass --company.');
        process.exit(1);
      }

      // 1. Fetch manifest from server
      let manifest: SkillPackageManifest;
      try {
        const res = await api.getSkill(skillName);
        manifest = res.skill as SkillPackageManifest;
      } catch (err) {
        console.error(`❌ Skill "${skillName}" not found: ${String(err)}`);
        process.exit(1);
      }

      console.log(`\n📦 Installing: ${manifest.name} v${manifest.version}`);
      console.log(`   ${manifest.description}`);
      if (manifest.requiredIntegrations.length > 0) {
        console.log(`   Integrations: ${manifest.requiredIntegrations.join(', ')}`);
      }
      console.log('');

      // 2. Prompt for each required secret
      const secrets: Record<string, string> = {};
      if (manifest.requiredSecrets.length > 0) {
        const rl = readline.createInterface({ input, output });
        for (const secretKey of manifest.requiredSecrets) {
          const value = await rl.question(`  Enter ${secretKey}: `);
          secrets[secretKey] = value.trim();
        }
        rl.close();
      }

      // 3. Call install API
      try {
        await api.installSkill(companyId, skillName, secrets);
        console.log(`\n✅ "${skillName}" installed successfully.`);
      } catch (err) {
        console.error(`\n❌ Install failed: ${String(err)}`);
        process.exit(1);
      }
    });
}
