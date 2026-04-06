import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { sql as dbSql } from '@agentclaw/db';
import type {
  AgentConfig,
  AgentRegistry,
  BootstrapContext,
  CompanyContext,
  HeartbeatEntry,
  HeartbeatSchedule,
  OKRSet,
  Objective,
  RunwaySnapshot,
  SkillDefinition,
  SkillManifest,
  TeamContext,
  TeamMember,
} from '@agentclaw/shared';

const COMPANY_FILE = 'COMPANY.md';
const TEAM_FILE = 'TEAM.md';
const OKR_FILE = 'OKR.md';
const RUNWAY_FILE = 'RUNWAY.md';
const AGENTS_FILE = 'AGENTS.md';
const SKILLS_FILE = 'SKILLS.md';
const HEARTBEAT_FILE = 'HEARTBEAT.md';

type SectionMap = Record<string, string[]>;

export interface BootstrapSource {
  loadCompany(): Promise<CompanyContext>;
  loadTeam(): Promise<TeamContext>;
  loadOKRs(): Promise<OKRSet>;
  loadRunway(): Promise<RunwaySnapshot>;
  loadAgents(): Promise<AgentRegistry>;
  loadSkills(): Promise<SkillManifest>;
  loadHeartbeat(): Promise<HeartbeatSchedule>;
}

export async function loadBootstrap(source: BootstrapSource): Promise<BootstrapContext> {
  const [company, team, okrs, runway, agents, skills, heartbeat] = await Promise.all([
    source.loadCompany(),
    source.loadTeam(),
    source.loadOKRs(),
    source.loadRunway(),
    source.loadAgents(),
    source.loadSkills(),
    source.loadHeartbeat(),
  ]);

  return { company, team, okrs, runway, agents, skills, heartbeat };
}

export class FileSystemBootstrapSource implements BootstrapSource {
  private readonly rootPath: string;

  constructor(params: { companySlug: string; rootPath?: string }) {
    this.rootPath = params.rootPath ?? path.join(os.homedir(), '.agentclaw', params.companySlug);
  }

  async loadCompany(): Promise<CompanyContext> {
    const raw = await this.readRequiredFile(COMPANY_FILE);
    return parseCompanyContext(raw, this.rootPath);
  }

  async loadTeam(): Promise<TeamContext> {
    const raw = await this.readRequiredFile(TEAM_FILE);
    return parseTeamContext(raw);
  }

  async loadOKRs(): Promise<OKRSet> {
    const raw = await this.readRequiredFile(OKR_FILE);
    return parseOKRs(raw);
  }

  async loadRunway(): Promise<RunwaySnapshot> {
    const raw = await this.readRequiredFile(RUNWAY_FILE);
    return parseRunway(raw);
  }

  async loadAgents(): Promise<AgentRegistry> {
    const raw = await this.readRequiredFile(AGENTS_FILE);
    return parseAgents(raw);
  }

  async loadSkills(): Promise<SkillManifest> {
    const raw = await this.readRequiredFile(SKILLS_FILE);
    return parseSkills(raw);
  }

  async loadHeartbeat(): Promise<HeartbeatSchedule> {
    const raw = await this.readRequiredFile(HEARTBEAT_FILE);
    return parseHeartbeat(raw);
  }

  private async readRequiredFile(fileName: string): Promise<string> {
    const filePath = path.join(this.rootPath, fileName);
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      throw new Error(`Missing bootstrap file ${fileName} at ${this.rootPath}: ${String(error)}`);
    }
  }
}

export class DatabaseBootstrapSource implements BootstrapSource {
  constructor(private readonly companyId: string) {}

  async loadCompany(): Promise<CompanyContext> {
    const raw = await this.readRequiredFile(COMPANY_FILE);
    return parseCompanyContext(raw);
  }

  async loadTeam(): Promise<TeamContext> {
    const raw = await this.readRequiredFile(TEAM_FILE);
    return parseTeamContext(raw);
  }

  async loadOKRs(): Promise<OKRSet> {
    const raw = await this.readRequiredFile(OKR_FILE);
    return parseOKRs(raw);
  }

  async loadRunway(): Promise<RunwaySnapshot> {
    const raw = await this.readRequiredFile(RUNWAY_FILE);
    return parseRunway(raw);
  }

  async loadAgents(): Promise<AgentRegistry> {
    const raw = await this.readRequiredFile(AGENTS_FILE);
    return parseAgents(raw);
  }

  async loadSkills(): Promise<SkillManifest> {
    const raw = await this.readRequiredFile(SKILLS_FILE);
    return parseSkills(raw);
  }

  async loadHeartbeat(): Promise<HeartbeatSchedule> {
    const raw = await this.readRequiredFile(HEARTBEAT_FILE);
    return parseHeartbeat(raw);
  }

  private async readRequiredFile(fileName: string): Promise<string> {
    const rows = await dbSql<{ content: string }[]>`
      select content
      from bootstrap_files
      where company_id = ${this.companyId}
        and file_name = ${fileName}
      order by updated_at desc
      limit 1
    `;

    if (!rows[0]?.content) {
      throw new Error(
        `Missing bootstrap file ${fileName} in bootstrap_files for company_id=${this.companyId}`,
      );
    }

    return rows[0].content;
  }
}

function parseCompanyContext(raw: string, rootPath?: string): CompanyContext {
  const lines = raw.split(/\r?\n/);
  const name =
    lines
      .find((line) => line.toLowerCase().startsWith('# company:'))
      ?.split(':')
      .slice(1)
      .join(':')
      .trim() ?? 'Unknown Company';

  const oneLiner = extractLabeledBullet(raw, 'One-liner');
  const stage = extractLabeledBullet(raw, 'Stage');
  const businessModel = extractHeadingBlock(raw, 'Business Model')?.join(' ').trim();
  const targetMarket = extractHeadingBlock(raw, 'Target Market')?.join(' ').trim();
  const topPriorities = extractNumberedList(raw, 'Top 3 Strategic Priorities') ?? [];
  const slug = path.basename(rootPath ?? '').trim().toLowerCase() || slugify(name);

  return {
    slug,
    name,
    oneLiner,
    stage,
    businessModel,
    targetMarket,
    topPriorities,
    raw,
  };
}

function parseTeamContext(raw: string): TeamContext {
  const members = parseTeamTable(raw);
  return { members, raw };
}

function parseOKRs(raw: string): OKRSet {
  const firstLine = raw.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
  const quarterMatch = firstLine.match(/Q[1-4]\s+\d{4}/i);
  const quarter = quarterMatch?.[0] ?? 'Unknown Quarter';

  const objectives: Objective[] = [];
  const sectionRegex = /^##\s+(.+)$/gm;
  const matches = [...raw.matchAll(sectionRegex)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (!match) {
      continue;
    }

    const start = (match.index ?? 0) + match[0].length;
    const nextMatch = i + 1 < matches.length ? matches[i + 1] : undefined;
    const end = nextMatch?.index ?? raw.length;
    const block = raw.slice(start, end).trim();

    const titlePart = match[1];
    if (!titlePart) {
      continue;
    }
    const title = titlePart.trim();
    const objectiveId = title.split(':')[0]?.trim().toLowerCase() ?? `o${i + 1}`;
    const keyResults = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^-\s*KR\d+:/i.test(line))
      .map((line, idx) => parseKeyResult(line, `${objectiveId}.kr${idx + 1}`));

    objectives.push({ id: objectiveId, title, keyResults });
  }

  return { quarter, objectives, raw };
}

function parseRunway(raw: string): RunwaySnapshot {
  const cashBalance = parseCurrency(extractLabeledBullet(raw, 'Cash balance'));
  const monthlyBurn = parseCurrency(extractLabeledBullet(raw, 'Monthly burn rate'));
  const runwayMonths = parseFloatSafe(extractLabeledBullet(raw, 'Runway'));
  const mrr = parseCurrency(extractLabeledBullet(raw, 'MRR'));
  const nextRaiseTarget = parseCurrency(extractLabeledBullet(raw, 'Target'));
  const nextRaiseTimeline = extractLabeledBullet(raw, 'Expected timeline');
  const asOf = raw.match(/as of\s+([0-9]{4}-[0-9]{2}-[0-9]{2})/i)?.[1];

  return {
    cashBalance,
    monthlyBurn,
    runwayMonths,
    mrr,
    nextRaiseTarget,
    nextRaiseTimeline,
    asOf,
    raw,
  };
}

function parseAgents(raw: string): AgentRegistry {
  const sections = parseH2Sections(raw);
  const registry: AgentRegistry = {};

  for (const [agentName, lines] of Object.entries(sections)) {
    const map = parseKeyValueBullets(lines);
    const skills = splitCsv(map['skills']);
    const fallback = splitCsv(map['fallback']);
    const routeKeywords = splitCsv(map['route when']);
    const gateTypes = map['gates']
      ? [...map['gates'].matchAll(/\b(strategy|spend|hire|legal)\b/gi)]
          .map((m) => m[1]?.toLowerCase())
          .filter((value): value is string => Boolean(value))
      : [];

    const config: AgentConfig = {
      name: agentName,
      model: map['model'],
      fallback,
      channel: map['channel'],
      skills,
      routeKeywords,
      gateTypes: gateTypes as AgentConfig['gateTypes'],
      memoryCategory: map['memory category'] ?? 'company',
      enabled: (map['status'] ?? 'active').toLowerCase() !== 'inactive',
      raw: `## ${agentName}\n${lines.join('\n')}`,
    };

    registry[agentName] = config;
  }

  return registry;
}

function parseSkills(raw: string): SkillManifest {
  const sections = parseH2Sections(raw);
  const manifest: SkillManifest = {};

  for (const [skillName, lines] of Object.entries(sections)) {
    const map = parseKeyValueBullets(lines);
    const description = map['description'] ?? lines.find((line) => line.trim().length > 0) ?? '';
    const args = map['args'];
    const agents = splitCsv(map['agents']);

    const skill: SkillDefinition = {
      name: skillName,
      description,
      args,
      agents,
      raw: `## ${skillName}\n${lines.join('\n')}`,
    };

    manifest[skillName] = skill;
  }

  return manifest;
}

function parseHeartbeat(raw: string): HeartbeatSchedule {
  const sections = parseH2Sections(raw);
  const entries: HeartbeatEntry[] = [];

  for (const lines of Object.values(sections)) {
    const map = parseKeyValueBullets(lines);
    if (!map['agent'] || !map['skill'] || !map['schedule']) {
      continue;
    }

    const cron = stripQuotes(map['schedule']);
    if (!cron) {
      continue;
    }

    entries.push({
      agentName: map['agent'],
      skillName: map['skill'],
      cron,
      channel: stripQuotes(map['channel']),
    });
  }

  return { entries, raw };
}

function parseH2Sections(markdown: string): SectionMap {
  const matches = [...markdown.matchAll(/^##\s+(.+)$/gm)];
  const sections: SectionMap = {};

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (!match?.[1]) {
      continue;
    }

    const header = match[1].trim();
    const contentStart = (match.index ?? 0) + match[0].length;
    const nextMatch = i + 1 < matches.length ? matches[i + 1] : undefined;
    const contentEnd = nextMatch?.index ?? markdown.length;
    const block = markdown.slice(contentStart, contentEnd).trim();
    sections[header] = block.length > 0 ? block.split(/\r?\n/) : [];
  }

  return sections;
}

function parseKeyValueBullets(lines: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of lines) {
    const match = line.match(/^\s*-\s*([^:]+):\s*(.+)$/);
    if (!match?.[1] || !match[2]) {
      continue;
    }
    out[match[1].trim().toLowerCase()] = match[2].trim();
  }
  return out;
}

function splitCsv(value?: string): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseTeamTable(raw: string): TeamMember[] {
  const lines = raw.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => /^\|\s*Name\s*\|/i.test(line));
  if (headerIndex < 0 || headerIndex + 2 >= lines.length) {
    return [];
  }

  const members: TeamMember[] = [];
  for (let i = headerIndex + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      continue;
    }
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith('|')) {
      break;
    }

    const cols = trimmedLine
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);

    const name = cols[0];
    const role = cols[1];
    if (!name || !role) {
      continue;
    }

    members.push({
      name,
      role,
      responsibilities: cols[4] ? [cols[4]] : undefined,
    });
  }

  return members;
}

function parseKeyResult(line: string, fallbackId: string) {
  const idMatch = line.match(/KR\d+/i);
  const id = idMatch?.[0].toLowerCase() ?? fallbackId;
  const content = line.replace(/^[-\s]*/, '').replace(/^KR\d+\s*:\s*/i, '').trim();
  const current = content.match(/current:\s*([^,)]+)/i)?.[1]?.trim() ?? '';
  const target = content.match(/target:\s*([^,)]+)/i)?.[1]?.trim() ?? '';

  return {
    id,
    description: content,
    current,
    target,
  };
}

function extractLabeledBullet(raw: string, label: string): string | undefined {
  const regex = new RegExp(`^-\\s*\\*\\*?${escapeRegExp(label)}\\*\\*?\\s*:\\s*(.+)$`, 'im');
  const strong = raw.match(regex)?.[1];
  if (strong) {
    return strong.trim();
  }

  const plain = raw.match(new RegExp(`^-\\s*${escapeRegExp(label)}\\s*:\\s*(.+)$`, 'im'))?.[1];
  return plain?.trim();
}

function extractHeadingBlock(raw: string, heading: string): string[] | undefined {
  const sections = parseH2Sections(raw);
  const section = Object.entries(sections).find(([key]) => key.toLowerCase().startsWith(heading.toLowerCase()));
  return section?.[1];
}

function extractNumberedList(raw: string, heading: string): string[] | undefined {
  const block = extractHeadingBlock(raw, heading);
  if (!block) {
    return undefined;
  }

  return block
    .map((line) => line.trim())
    .filter((line) => /^\d+\./.test(line))
    .map((line) => line.replace(/^\d+\.\s*/, '').trim());
}

function parseCurrency(input?: string): number | undefined {
  if (!input) {
    return undefined;
  }
  const cleaned = input.replace(/[^0-9.-]/g, '');
  if (!cleaned) {
    return undefined;
  }
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFloatSafe(input?: string): number | undefined {
  if (!input) {
    return undefined;
  }
  const match = input.match(/-?\d+(\.\d+)?/);
  if (!match) {
    return undefined;
  }
  const value = Number.parseFloat(match[0]);
  return Number.isFinite(value) ? value : undefined;
}

function stripQuotes(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.replace(/^['"]|['"]$/g, '').trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'company';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
