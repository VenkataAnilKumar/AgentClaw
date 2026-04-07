import { and, eq, gte, lt } from 'drizzle-orm';

import { companyBudgets, db, skillRuns } from '@agentclaw/db';

export class CostService {
  async getSummary(companyId: string): Promise<{
    month: string;
    totalUsd: number;
    byAgent: Array<{ agentName: string; usd: number }>;
    byModel: Array<{ model: string; usd: number }>;
  }> {
    const { start, end, month } = monthRange(new Date());
    const rows = await this.getRunsInRange(companyId, start, end);

    const byAgentMap = new Map<string, number>();
    const byModelMap = new Map<string, number>();
    let totalUsd = 0;

    for (const row of rows) {
      const cost = toNumber(row.costUsd);
      totalUsd += cost;

      byAgentMap.set(row.agentName, (byAgentMap.get(row.agentName) ?? 0) + cost);
      if (row.modelUsed) {
        byModelMap.set(row.modelUsed, (byModelMap.get(row.modelUsed) ?? 0) + cost);
      }
    }

    return {
      month,
      totalUsd: round6(totalUsd),
      byAgent: [...byAgentMap.entries()].map(([agentName, usd]) => ({ agentName, usd: round6(usd) })),
      byModel: [...byModelMap.entries()].map(([model, usd]) => ({ model, usd: round6(usd) })),
    };
  }

  async getMonthly(companyId: string, months: number): Promise<Array<{ month: string; totalUsd: number }>> {
    const safeMonths = Math.max(1, Math.min(months, 24));
    const out: Array<{ month: string; totalUsd: number }> = [];

    const now = new Date();
    for (let i = safeMonths - 1; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const { start, end, month } = monthRange(d);
      const rows = await this.getRunsInRange(companyId, start, end);
      const totalUsd = rows.reduce((sum, row) => sum + toNumber(row.costUsd), 0);
      out.push({ month, totalUsd: round6(totalUsd) });
    }

    return out;
  }

  async getBudget(companyId: string): Promise<{ monthlyUsd: number; currency: string } | null> {
    const row = await db.query.companyBudgets.findFirst({
      where: eq(companyBudgets.companyId, companyId),
    });

    if (!row) return null;
    return {
      monthlyUsd: toNumber(row.monthlyUsd),
      currency: row.currency,
    };
  }

  async setBudget(companyId: string, monthlyUsd: number): Promise<void> {
    if (monthlyUsd < 0) {
      throw new Error('monthlyUsd must be >= 0');
    }

    await db
      .insert(companyBudgets)
      .values({
        companyId,
        monthlyUsd: String(monthlyUsd),
        currency: 'USD',
      })
      .onConflictDoUpdate({
        target: companyBudgets.companyId,
        set: {
          monthlyUsd: String(monthlyUsd),
          updatedAt: new Date(),
        },
      });
  }

  async checkBudget(
    companyId: string,
    isHeartbeat: boolean,
  ): Promise<{
    hasBudget: boolean;
    spentUsd: number;
    budgetUsd: number;
    usagePct: number;
    shouldAlert80: boolean;
    blocked: boolean;
  }> {
    const budgetRow = await db.query.companyBudgets.findFirst({
      where: eq(companyBudgets.companyId, companyId),
    });

    if (!budgetRow) {
      return {
        hasBudget: false,
        spentUsd: 0,
        budgetUsd: 0,
        usagePct: 0,
        shouldAlert80: false,
        blocked: false,
      };
    }

    const { start, end } = monthRange(new Date());
    const rows = await this.getRunsInRange(companyId, start, end);
    const spentUsd = round6(rows.reduce((sum, row) => sum + toNumber(row.costUsd), 0));
    const budgetUsd = toNumber(budgetRow.monthlyUsd);
    const usagePct = budgetUsd > 0 ? spentUsd / budgetUsd : 0;

    let shouldAlert80 = false;
    if (budgetUsd > 0 && usagePct >= 0.8) {
      const alertAt = budgetRow.alert80SentAt;
      const alertSentThisMonth = alertAt && alertAt >= start;
      if (!alertSentThisMonth) {
        shouldAlert80 = true;
        await db
          .update(companyBudgets)
          .set({
            alert80SentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(companyBudgets.companyId, companyId));
      }
    }

    const blocked = !isHeartbeat && budgetUsd > 0 && usagePct >= 1;

    return {
      hasBudget: true,
      spentUsd,
      budgetUsd,
      usagePct,
      shouldAlert80,
      blocked,
    };
  }

  private async getRunsInRange(companyId: string, start: Date, end: Date) {
    return db.query.skillRuns.findMany({
      where: and(
        eq(skillRuns.companyId, companyId),
        gte(skillRuns.createdAt, start),
        lt(skillRuns.createdAt, end),
      ),
    });
  }
}

function monthRange(date: Date): { start: Date; end: Date; month: string } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0));
  const month = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
  return { start, end, month };
}

function toNumber(value: string | number | null): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.parseFloat(value) || 0;
  return 0;
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
