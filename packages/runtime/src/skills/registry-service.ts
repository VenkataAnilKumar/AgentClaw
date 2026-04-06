import { db, companies, installedSkills, companySecrets } from '@agentclaw/db';
import { eq, and } from 'drizzle-orm';
import type {
  InstalledSkillRecord,
  SkillHealth,
  SkillHealthStatus,
  SkillIntegrationType,
  SkillPackageManifest,
} from '@agentclaw/shared';
import { SKILL_CATALOG, findSkill } from '@agentclaw/skills-registry';

export class SkillRegistryService {
  // ── Queries ───────────────────────────────────────────────────────────────

  async listForCompany(companyId: string): Promise<InstalledSkillRecord[]> {
    const rows = await db.query.installedSkills.findMany({
      where: eq(installedSkills.companyId, companyId),
    });
    return rows.map(rowToRecord);
  }

  async getHealth(companyId: string): Promise<SkillHealth[]> {
    const installed = await this.listForCompany(companyId);
    const configuredSecrets = await this.listSecretKeys(companyId);

    // Always include built-in skills
    const builtInHealth: SkillHealth[] = SKILL_CATALOG.filter((s: SkillPackageManifest) => s.builtIn).map((s: SkillPackageManifest) => ({
      skillName: s.name,
      status: 'healthy' as SkillHealthStatus,
      version: s.version,
      builtIn: true,
      missingSecrets: [],
      connectedIntegrations: [],
    }));

    const installedHealth: SkillHealth[] = installed.map((record) => {
      const manifest = findSkill(record.skillName);
      const required = manifest?.requiredSecrets ?? record.secretsConfigured;
      const missing = required.filter((s: string) => !configuredSecrets.includes(s));
      const status: SkillHealthStatus =
        missing.length === 0 ? 'healthy' : 'missing_secrets';
      return {
        skillName: record.skillName,
        status,
        version: record.version,
        builtIn: false,
        missingSecrets: missing,
        connectedIntegrations: record.requiredIntegrations,
      };
    });

    return [...builtInHealth, ...installedHealth];
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async install(
    companyId: string,
    skillName: string,
    secrets: Record<string, string>,
  ): Promise<InstalledSkillRecord> {
    const manifest = findSkill(skillName);
    if (!manifest) throw new Error(`Unknown skill: ${skillName}`);
    if (manifest.builtIn) throw new Error(`${skillName} is built-in and does not need installation.`);

    // Ensure company exists
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });
    if (!company) throw new Error(`Company not found: ${companyId}`);

    // Upsert installed_skills row
    const [row] = await db
      .insert(installedSkills)
      .values({
        companyId,
        skillName,
        version: manifest.version,
        category: manifest.category,
        agentAffinity: manifest.agentAffinity,
        requiredIntegrations: manifest.requiredIntegrations as string[],
        secretsConfigured: Object.keys(secrets),
        enabled: true,
      })
      .onConflictDoUpdate({
        target: [installedSkills.companyId, installedSkills.skillName],
        set: {
          version: manifest.version,
          secretsConfigured: Object.keys(secrets),
          enabled: true,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!row) throw new Error('Failed to insert installed skill');

    // Store secrets
    await this.saveSecrets(companyId, secrets);

    return rowToRecord(row);
  }

  async uninstall(companyId: string, skillName: string): Promise<void> {
    await db
      .delete(installedSkills)
      .where(
        and(
          eq(installedSkills.companyId, companyId),
          eq(installedSkills.skillName, skillName),
        ),
      );
  }

  /** Resolves secret values for a set of integration providers. */
  async resolveSecrets(
    companyId: string,
    providers: SkillIntegrationType[],
  ): Promise<Partial<Record<SkillIntegrationType, Record<string, string>>>> {
    if (providers.length === 0) return {};

    const rows = await db.query.companySecrets.findMany({
      where: eq(companySecrets.companyId, companyId),
    });

    const map: Record<string, string> = {};
    for (const row of rows) {
      // Secrets are stored as plaintext in this implementation.
      // A production system would decrypt row.encryptedValue here.
      map[row.key] = row.encryptedValue;
    }

    const out: Partial<Record<SkillIntegrationType, Record<string, string>>> = {};
    for (const provider of providers) {
      const manifest = SKILL_CATALOG.find(
        (s: SkillPackageManifest) => !s.builtIn && s.requiredIntegrations.includes(provider),
      );
      if (!manifest) continue;
      const resolved: Record<string, string> = {};
      for (const key of manifest.requiredSecrets) {
        if (map[key]) resolved[key] = map[key];
      }
      if (Object.keys(resolved).length > 0) {
        out[provider] = resolved;
      }
    }
    return out;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async listSecretKeys(companyId: string): Promise<string[]> {
    const rows = await db.query.companySecrets.findMany({
      where: eq(companySecrets.companyId, companyId),
    });
    return rows.map((r) => r.key);
  }

  private async saveSecrets(
    companyId: string,
    secrets: Record<string, string>,
  ): Promise<void> {
    for (const [key, value] of Object.entries(secrets)) {
      await db
        .insert(companySecrets)
        .values({ companyId, key, encryptedValue: value })
        .onConflictDoUpdate({
          target: [companySecrets.companyId, companySecrets.key],
          set: { encryptedValue: value },
        });
    }
  }
}

function rowToRecord(row: typeof installedSkills.$inferSelect): InstalledSkillRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    skillName: row.skillName,
    version: row.version,
    category: row.category,
    agentAffinity: row.agentAffinity ?? [],
    requiredIntegrations: row.requiredIntegrations ?? [],
    secretsConfigured: row.secretsConfigured ?? [],
    enabled: row.enabled,
    installedAt: row.installedAt,
    updatedAt: row.updatedAt,
  };
}
