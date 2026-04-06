export type GateType = 'strategy' | 'spend' | 'hire' | 'legal';

export type MemberRole = 'owner' | 'admin' | 'member' | 'read_only';

export type MemoryCategory = 'company' | 'gtm' | 'hiring' | 'finance' | 'product' | string;

// ── Skills Marketplace (Phase 3) ─────────────────────────────────────────────

export type SkillCategory =
  | 'gtm'
  | 'hiring'
  | 'finance'
  | 'ops'
  | 'cs'
  | 'dev'
  | 'legal'
  | 'founder';

export type SkillIntegrationType =
  | 'notion'
  | 'brex'
  | 'calendly'
  | 'slack-ops'
  | 'stripe'
  | 'linear'
  | 'github'
  | 'hubspot';

/** Canonical contract for every skill in the registry catalog. */
export interface SkillPackageManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  agentAffinity: string[];
  requiredIntegrations: SkillIntegrationType[];
  requiredSecrets: string[];
  category: SkillCategory;
  builtIn: boolean;
}

/** Row shape returned from the installed_skills DB table. */
export interface InstalledSkillRecord {
  id: string;
  companyId: string;
  skillName: string;
  version: string;
  category: string;
  agentAffinity: string[];
  requiredIntegrations: string[];
  secretsConfigured: string[];
  enabled: boolean;
  installedAt: Date;
  updatedAt: Date;
}

export type SkillHealthStatus = 'healthy' | 'degraded' | 'missing_secrets';

export interface SkillHealth {
  skillName: string;
  status: SkillHealthStatus;
  version: string;
  builtIn: boolean;
  missingSecrets: string[];
  connectedIntegrations: string[];
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export interface CompanyContext {
  slug: string;
  name: string;
  plan?: string;
  oneLiner?: string;
  stage?: string;
  businessModel?: string;
  targetMarket?: string;
  topPriorities?: string[];
  raw: string;
}

export interface TeamMember {
  name: string;
  role: string;
  responsibilities?: string[];
}

export interface TeamContext {
  members: TeamMember[];
  currentSprintFocus?: string[];
  notes?: string[];
  raw: string;
}

export interface KeyResult {
  id: string;
  description: string;
  current: string;
  target: string;
}

export interface Objective {
  id: string;
  title: string;
  keyResults: KeyResult[];
}

export interface OKRSet {
  quarter: string;
  objectives: Objective[];
  raw: string;
}

export interface RunwaySnapshot {
  cashBalance?: number;
  monthlyBurn?: number;
  runwayMonths?: number;
  mrr?: number;
  nextRaiseTarget?: number;
  nextRaiseTimeline?: string;
  asOf?: string;
  raw: string;
}

export interface AgentConfig {
  name: string;
  model?: string;
  fallback?: string[];
  channel?: string;
  skills: string[];
  routeKeywords?: string[];
  gateTypes?: GateType[];
  memoryCategory?: MemoryCategory;
  enabled?: boolean;
  raw: string;
}

export type AgentRegistry = Record<string, AgentConfig>;

export interface SkillDefinition {
  name: string;
  description: string;
  args?: string;
  agents?: string[];
  raw: string;
}

export type SkillManifest = Record<string, SkillDefinition>;

export interface HeartbeatEntry {
  agentName: string;
  skillName: string;
  cron: string;
  channel?: string;
}

export interface HeartbeatSchedule {
  entries: HeartbeatEntry[];
  raw: string;
}

export interface BootstrapContext {
  company: CompanyContext;
  team: TeamContext;
  okrs: OKRSet;
  runway: RunwaySnapshot;
  agents: AgentRegistry;
  skills: SkillManifest;
  heartbeat: HeartbeatSchedule;
  installedSkills?: InstalledSkillRecord[];
}

/** Live data snapshot fetched from an active integration. */
export interface LiveIntegrationData {
  provider: SkillIntegrationType;
  summary: string;
  fetchedAt: string;
}

export interface Artifact {
  title: string;
  type: string;
  content: string;
  format: 'markdown' | 'json' | 'text';
  runId?: string;
}

export interface MemoryUpdate {
  key: string;
  value: JsonValue;
}

export interface HumanGateRequest {
  type: GateType;
  title: string;
  description: string;
  approvers?: MemberRole[];
}

export interface OKRUpdate {
  objectiveId?: string;
  keyResultId?: string;
  note: string;
}

export interface RunwayUpdate {
  field: string;
  value: JsonValue;
  note?: string;
}

export interface TeamMemoryRow {
  id: string;
  companyId: string;
  category: string;
  key: string;
  value: JsonValue;
  writtenByAgent: string;
  updatedAt: string;
}

export interface AgentMemoryRow {
  id: string;
  companyId: string;
  agentName: string;
  key: string;
  value: JsonValue;
  updatedAt: string;
}

export interface LLMResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
}

export interface AgentRunResult {
  artifacts: Artifact[];
  memoryUpdates: MemoryUpdate[];
  personalMemoryUpdates: MemoryUpdate[];
  okrUpdates: OKRUpdate[];
  runwayUpdates: RunwayUpdate[];
  humanGates: HumanGateRequest[];
  rawOutput: string;
  llm?: LLMResult;
}
