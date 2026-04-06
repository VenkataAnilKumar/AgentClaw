import type {
  Artifact,
  AgentConfig,
  HumanGateRequest,
  JsonValue,
  MemoryUpdate,
  OKRUpdate,
  RunwayUpdate,
} from '@agentclaw/shared';

type ParsedOutput = {
  artifacts: Artifact[];
  memoryUpdates: MemoryUpdate[];
  personalMemoryUpdates: MemoryUpdate[];
  humanGates: HumanGateRequest[];
  okrUpdates: OKRUpdate[];
  runwayUpdates: RunwayUpdate[];
  cleanText: string;
};

export function parseModelOutput(raw: string, agent: Pick<AgentConfig, 'memoryCategory' | 'name'>): ParsedOutput {
  const artifacts = parseArtifacts(raw);
  const memoryUpdates = enforceMemoryCategory(parseMemoryUpdates(raw, 'MEMORY_UPDATE', 'END_MEMORY_UPDATE'), agent);
  const personalMemoryUpdates = parseMemoryUpdates(raw, 'PERSONAL_MEMORY', 'END_PERSONAL_MEMORY');
  const humanGates = parseHumanGates(raw);
  const okrUpdates = parseOKRUpdates(raw);
  const runwayUpdates = parseRunwayUpdates(raw);

  const cleanText = stripBlock(raw, 'ARTIFACT_START', 'ARTIFACT_END')
    .replace(stripBlock(raw, 'MEMORY_UPDATE', 'END_MEMORY_UPDATE'), '')
    .replace(stripBlock(raw, 'PERSONAL_MEMORY', 'END_PERSONAL_MEMORY'), '')
    .replace(stripBlock(raw, 'HUMAN_GATE', 'END_HUMAN_GATE'), '')
    .replace(stripBlock(raw, 'OKR_UPDATE', 'END_OKR_UPDATE'), '')
    .replace(stripBlock(raw, 'RUNWAY_UPDATE', 'END_RUNWAY_UPDATE'), '')
    .trim();

  return {
    artifacts,
    memoryUpdates,
    personalMemoryUpdates,
    humanGates,
    okrUpdates,
    runwayUpdates,
    cleanText,
  };
}

function parseArtifacts(raw: string): Artifact[] {
  const blocks = extractBlocks(raw, 'ARTIFACT_START', 'ARTIFACT_END');
  return blocks
    .map((block) => {
      const parsed = tryParseJson(block);
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>;
        return {
          title: asString(record.title) ?? 'Artifact',
          type: asString(record.type) ?? 'document',
          content: asString(record.content) ?? block.trim(),
          format: normalizeFormat(asString(record.format)),
        } satisfies Artifact;
      }

      return {
        title: 'Artifact',
        type: 'document',
        content: block.trim(),
        format: 'markdown',
      } satisfies Artifact;
    })
    .filter((artifact) => artifact.content.length > 0);
}

function parseMemoryUpdates(raw: string, start: string, end: string): MemoryUpdate[] {
  const blocks = extractBlocks(raw, start, end);
  const updates: MemoryUpdate[] = [];

  for (const block of blocks) {
    const parsed = tryParseJson(block);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [key, value] of Object.entries(parsed)) {
        updates.push({ key, value });
      }
      continue;
    }

    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.includes(':'));

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (!key) {
        continue;
      }
      const valueRaw = valueParts.join(':').trim();
      updates.push({ key: key.trim(), value: toJsonValue(tryParseJson(valueRaw) ?? valueRaw) });
    }
  }

  return updates;
}

function parseHumanGates(raw: string): HumanGateRequest[] {
  const blocks = extractBlocks(raw, 'HUMAN_GATE', 'END_HUMAN_GATE');
  return blocks
    .map((block) => {
      const parsed = tryParseJson(block);
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>;
        return {
          type: normalizeGateType(asString(record.type) ?? asString(record.gate_type)),
          title: asString(record.title) ?? 'Approval Required',
          description: asString(record.description) ?? block.trim(),
        } satisfies HumanGateRequest;
      }
      return {
        type: 'strategy',
        title: 'Approval Required',
        description: block.trim(),
      } satisfies HumanGateRequest;
    })
    .filter((gate) => gate.description.length > 0);
}

function parseOKRUpdates(raw: string): OKRUpdate[] {
  const blocks = extractBlocks(raw, 'OKR_UPDATE', 'END_OKR_UPDATE');
  const updates: OKRUpdate[] = [];

  for (const block of blocks) {
    const parsed = tryParseJson(block);
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      updates.push({
        objectiveId: asString(record.objectiveId) ?? asString(record.objective_id),
        keyResultId: asString(record.keyResultId) ?? asString(record.key_result_id),
        note: asString(record.note) ?? block.trim(),
      });
      continue;
    }

    updates.push({ note: block.trim() });
  }

  return updates.filter((item) => item.note.length > 0);
}

function parseRunwayUpdates(raw: string): RunwayUpdate[] {
  const blocks = extractBlocks(raw, 'RUNWAY_UPDATE', 'END_RUNWAY_UPDATE');
  const updates: RunwayUpdate[] = [];

  for (const block of blocks) {
    const parsed = tryParseJson(block);
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      const field = asString(record.field) ?? 'runway.note';
      const value = toJsonValue(record.value ?? asString(record.note) ?? block.trim());
      updates.push({
        field,
        value,
        note: asString(record.note),
      });
      continue;
    }

    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.includes(':'));

    if (lines.length === 0) {
      updates.push({ field: 'runway.note', value: block.trim() });
      continue;
    }

    for (const line of lines) {
      const [field, ...rest] = line.split(':');
      if (!field) {
        continue;
      }
      updates.push({ field: field.trim(), value: rest.join(':').trim() });
    }
  }

  return updates.filter((item) => item.field.length > 0);
}

function enforceMemoryCategory(
  updates: MemoryUpdate[],
  agent: Pick<AgentConfig, 'memoryCategory' | 'name'>,
): MemoryUpdate[] {
  const category = (agent.memoryCategory ?? '').trim();
  if (!category) {
    return [];
  }

  return updates.filter((update) => {
    const allowed = update.key.startsWith(`${category}.`);
    if (!allowed) {
      console.warn(
        `Dropped cross-category memory write for ${agent.name}: key=${update.key}, allowed=${category}.*`,
      );
    }
    return allowed;
  });
}

function extractBlocks(raw: string, start: string, end: string): string[] {
  const regex = new RegExp(`---${start}---([\\s\\S]*?)---${end}---`, 'g');
  const matches = [...raw.matchAll(regex)];
  return matches.map((match) => match[1]?.trim() ?? '').filter((value) => value.length > 0);
}

function stripBlock(raw: string, start: string, end: string): string {
  return raw.replace(new RegExp(`---${start}---[\\s\\S]*?---${end}---`, 'g'), '');
}

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function normalizeFormat(value?: string): Artifact['format'] {
  if (value === 'json' || value === 'text' || value === 'markdown') {
    return value;
  }
  return 'markdown';
}

function normalizeGateType(value?: string): HumanGateRequest['type'] {
  const normalized = value?.toLowerCase();
  if (normalized === 'strategy' || normalized === 'spend' || normalized === 'hire' || normalized === 'legal') {
    return normalized;
  }
  return 'strategy';
}

function toJsonValue(input: unknown): JsonValue {
  if (
    input === null ||
    typeof input === 'string' ||
    typeof input === 'number' ||
    typeof input === 'boolean'
  ) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => toJsonValue(item));
  }

  if (typeof input === 'object') {
    const out: Record<string, JsonValue> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      out[key] = toJsonValue(value);
    }
    return out;
  }

  return String(input);
}
