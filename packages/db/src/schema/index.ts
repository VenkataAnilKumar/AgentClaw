import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const memberRoleEnum = pgEnum('member_role', [
  'owner',
  'admin',
  'member',
  'read_only',
]);

export const gateTypeEnum = pgEnum('gate_type', [
  'strategy',
  'spend',
  'hire',
  'legal',
]);

export const gateStatusEnum = pgEnum('gate_status', [
  'pending',
  'approved',
  'rejected',
]);

export const activityEventTypeEnum = pgEnum('activity_event_type', [
  'skill_run',
  'gate_created',
  'gate_approved',
  'gate_rejected',
  'run_error',
  'memory_update',
  'skill_installed',
  'member_invited',
  'heartbeat_run',
]);

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  plan: text('plan').notNull().default('starter'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const companyMembers = pgTable(
  'company_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    slackUserId: text('slack_user_id').notNull(),
    role: memberRoleEnum('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('company_members_company_id_idx').on(table.companyId),
    companyUserUnique: unique('company_members_company_slack_user_unique').on(
      table.companyId,
      table.slackUserId,
    ),
  }),
);

export const agents = pgTable(
  'agents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    channelId: text('channel_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('agents_company_id_idx').on(table.companyId),
    companyNameUnique: unique('agents_company_name_unique').on(table.companyId, table.name),
  }),
);

export const teamMemory = pgTable(
  'team_memory',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    writtenByAgent: text('written_by_agent').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('team_memory_company_id_idx').on(table.companyId),
    companyCategoryKeyUnique: unique('team_memory_company_category_key_unique').on(
      table.companyId,
      table.category,
      table.key,
    ),
  }),
);

export const teamMemoryAudit = pgTable(
  'team_memory_audit',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    key: text('key').notNull(),
    actor: text('actor').notNull(),
    source: text('source').notNull(),
    action: text('action').notNull().default('set'),
    summary: text('summary').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('team_memory_audit_company_id_idx').on(table.companyId),
    companyCreatedIdx: index('team_memory_audit_company_created_at_idx').on(
      table.companyId,
      table.createdAt,
    ),
  }),
);

export const agentMemory = pgTable(
  'agent_memory',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    agentName: text('agent_name').notNull(),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('agent_memory_company_id_idx').on(table.companyId),
    companyAgentKeyUnique: unique('agent_memory_company_agent_key_unique').on(
      table.companyId,
      table.agentName,
      table.key,
    ),
  }),
);

export const skillRuns = pgTable(
  'skill_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    agentName: text('agent_name').notNull(),
    skillName: text('skill_name').notNull(),
    input: jsonb('input').notNull(),
    outputSummary: text('output_summary'),
    gateId: uuid('gate_id'),
    modelUsed: text('model_used'),
    tokensUsed: integer('tokens_used'),
    costUsd: numeric('cost_usd', { precision: 12, scale: 6 }),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('skill_runs_company_id_idx').on(table.companyId),
    companyAgentCreatedIdx: index('skill_runs_company_agent_created_idx').on(
      table.companyId,
      table.agentName,
      table.createdAt,
    ),
  }),
);

export const skillRunContext = pgTable(
  'skill_run_context',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    agentName: text('agent_name').notNull(),
    summary: text('summary').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('skill_run_context_company_id_idx').on(table.companyId),
    companyAgentCreatedIdx: index('skill_run_context_company_agent_created_idx').on(
      table.companyId,
      table.agentName,
      table.createdAt,
    ),
  }),
);

export const artifacts = pgTable(
  'artifacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    agentName: text('agent_name').notNull(),
    skillName: text('skill_name').notNull(),
    title: text('title').notNull(),
    type: text('type').notNull(),
    content: text('content').notNull(),
    format: text('format').notNull(),
    runId: uuid('run_id').references(() => skillRuns.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('artifacts_company_id_idx').on(table.companyId),
    companyAgentCreatedIdx: index('artifacts_company_agent_created_idx').on(
      table.companyId,
      table.agentName,
      table.createdAt,
    ),
  }),
);

export const humanGates = pgTable(
  'human_gates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    agentName: text('agent_name').notNull(),
    gateType: gateTypeEnum('gate_type').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    status: gateStatusEnum('status').notNull().default('pending'),
    approvedBy: text('approved_by'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    slackMessageTs: text('slack_message_ts'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('human_gates_company_id_idx').on(table.companyId),
    companyAgentStatusIdx: index('human_gates_company_agent_status_idx').on(
      table.companyId,
      table.agentName,
      table.status,
    ),
  }),
);

export const heartbeatRuns = pgTable(
  'heartbeat_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    agentName: text('agent_name').notNull(),
    skillName: text('skill_name').notNull(),
    status: text('status').notNull(),
    runAt: timestamp('run_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('heartbeat_runs_company_id_idx').on(table.companyId),
    companyAgentRunAtIdx: index('heartbeat_runs_company_agent_run_at_idx').on(
      table.companyId,
      table.agentName,
      table.runAt,
    ),
  }),
);

export const activityFeed = pgTable(
  'activity_feed',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    eventType: activityEventTypeEnum('event_type').notNull(),
    agentName: text('agent_name'),
    skillName: text('skill_name'),
    actor: text('actor').notNull(),
    summary: text('summary').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('activity_feed_company_id_idx').on(table.companyId),
    companyTypeIdx: index('activity_feed_company_event_type_idx').on(table.companyId, table.eventType),
    companyCreatedIdx: index('activity_feed_company_created_at_idx').on(table.companyId, table.createdAt),
  }),
);

export const companySecrets = pgTable(
  'company_secrets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    encryptedValue: text('encrypted_value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('company_secrets_company_id_idx').on(table.companyId),
    companyKeyUnique: unique('company_secrets_company_key_unique').on(table.companyId, table.key),
  }),
);

export const companyBudgets = pgTable(
  'company_budgets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' })
      .unique(),
    monthlyUsd: numeric('monthly_usd', { precision: 12, scale: 2 }).notNull().default('0'),
    currency: text('currency').notNull().default('USD'),
    alert80SentAt: timestamp('alert_80_sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('company_budgets_company_id_idx').on(table.companyId),
  }),
);

export const bootstrapFiles = pgTable(
  'bootstrap_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    content: text('content').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('bootstrap_files_company_id_idx').on(table.companyId),
    companyFileUnique: unique('bootstrap_files_company_file_unique').on(table.companyId, table.fileName),
  }),
);

// ── Phase 4: Slack OAuth Multi-Workspace ───────────────────────────────────

export const slackInstallations = pgTable(
  'slack_installations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    teamId: text('team_id').notNull().unique(),
    teamName: text('team_name').notNull(),
    botToken: text('bot_token').notNull(),
    botUserId: text('bot_user_id'),
    appId: text('app_id'),
    authedUserId: text('authed_user_id'),
    installedAt: timestamp('installed_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('slack_installations_company_id_idx').on(table.companyId),
  }),
);

export const slackOauthStates = pgTable(
  'slack_oauth_states',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    state: text('state').notNull().unique(),
    redirectUri: text('redirect_uri').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    expiresIdx: index('slack_oauth_states_expires_at_idx').on(table.expiresAt),
  }),
);

// ── Phase 3: Skills Marketplace ───────────────────────────────────────────────

export const installedSkills = pgTable(
  'installed_skills',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    skillName: text('skill_name').notNull(),
    version: text('version').notNull().default('1.0.0'),
    category: text('category').notNull(),
    agentAffinity: text('agent_affinity').array().notNull().default([]),
    requiredIntegrations: text('required_integrations').array().notNull().default([]),
    secretsConfigured: text('secrets_configured').array().notNull().default([]),
    enabled: boolean('enabled').notNull().default(true),
    installedAt: timestamp('installed_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('installed_skills_company_id_idx').on(table.companyId),
    companySkillUnique: unique('installed_skills_company_skill_unique').on(
      table.companyId,
      table.skillName,
    ),
  }),
);
