export { SKILL_CATALOG } from './catalog.js';
export type {
  SkillPackageManifest,
  InstalledSkillRecord,
  SkillHealth,
  SkillHealthStatus,
  SkillCategory,
  SkillIntegrationType,
} from '@agentclaw/shared';

import type { SkillPackageManifest } from '@agentclaw/shared';
import { SKILL_CATALOG } from './catalog.js';

export function findSkill(name: string): SkillPackageManifest | undefined {
  return SKILL_CATALOG.find((s) => s.name === name);
}

export function listByCategory(category: string): SkillPackageManifest[] {
  return SKILL_CATALOG.filter((s) => s.category === category);
}

export function listInstallable(): SkillPackageManifest[] {
  return SKILL_CATALOG.filter((s) => !s.builtIn);
}

export function listBuiltIn(): SkillPackageManifest[] {
  return SKILL_CATALOG.filter((s) => s.builtIn);
}
