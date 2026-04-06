import fs from 'node:fs';
import path from 'node:path';

import type { SkillDefinition, SkillManifest } from '@agentclaw/shared';

type SkillFrontmatter = {
  name?: string;
  description?: string;
  args?: string;
  agents?: string[];
};

export function loadSkillsFromDir(dir: string): SkillManifest {
  const rootDir = path.resolve(dir);
  const candidates = listCandidateSkillDirs(rootDir);
  const manifest: SkillManifest = {};

  for (const skillDir of candidates) {
    const definition = loadSingleSkillDirectory(skillDir);
    if (!definition) {
      continue;
    }
    manifest[definition.name] = definition;
  }

  return manifest;
}

function listCandidateSkillDirs(rootDir: string): string[] {
  const output: string[] = [];

  if (isSkillDirectory(rootDir)) {
    output.push(rootDir);
    return output;
  }

  for (const entry of safeReadDir(rootDir)) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }

    const candidate = path.join(rootDir, entry.name);
    if (isSkillDirectory(candidate)) {
      output.push(candidate);
    }
  }

  return output.sort((a, b) => a.localeCompare(b));
}

function isSkillDirectory(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'SKILL.md'));
}

function loadSingleSkillDirectory(skillDir: string): SkillDefinition | null {
  const skillFilePath = path.join(skillDir, 'SKILL.md');
  let raw: string;

  try {
    raw = fs.readFileSync(skillFilePath, 'utf8');
  } catch {
    return null;
  }

  const { frontmatter, body } = parseFrontmatter(raw);
  const fallbackName = path.basename(skillDir).trim();
  const name = (frontmatter.name ?? fallbackName).trim();
  const description = (frontmatter.description ?? '').trim();

  if (!name || !description) {
    return null;
  }

  return {
    name,
    description,
    args: frontmatter.args,
    agents: frontmatter.agents,
    raw: body.trim() || raw.trim(),
  };
}

function parseFrontmatter(content: string): { frontmatter: SkillFrontmatter; body: string } {
  if (!content.startsWith('---')) {
    return { frontmatter: {}, body: content };
  }

  const endMarkerIndex = content.indexOf('\n---', 3);
  if (endMarkerIndex < 0) {
    return { frontmatter: {}, body: content };
  }

  const yamlBlock = content.slice(3, endMarkerIndex).trim();
  const body = content.slice(endMarkerIndex + 4).trimStart();
  const lines = yamlBlock.split(/\r?\n/);

  const out: SkillFrontmatter = {};
  let currentArrayKey: 'agents' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    if (trimmed.startsWith('- ') && currentArrayKey === 'agents') {
      const item = trimmed.slice(2).trim();
      if (!item) {
        continue;
      }
      out.agents = [...(out.agents ?? []), stripQuotes(item)];
      continue;
    }

    const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (!match?.[1]) {
      continue;
    }

    const key = match[1].trim().toLowerCase();
    const value = (match[2] ?? '').trim();

    if (key === 'agents') {
      currentArrayKey = 'agents';
      if (value) {
        out.agents = splitCsv(value);
      }
      continue;
    }

    currentArrayKey = null;
    if (key === 'name') {
      out.name = stripQuotes(value);
      continue;
    }
    if (key === 'description') {
      out.description = stripQuotes(value);
      continue;
    }
    if (key === 'args') {
      out.args = stripQuotes(value);
    }
  }

  return { frontmatter: out, body };
}

function safeReadDir(dir: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function stripQuotes(value: string): string {
  return value.replace(/^['\"]|['\"]$/g, '').trim();
}

function splitCsv(value: string): string[] {
  const normalized = stripQuotes(value).replace(/^\[|\]$/g, '');
  return normalized
    .split(',')
    .map((item) => stripQuotes(item.trim()))
    .filter((item) => item.length > 0);
}
