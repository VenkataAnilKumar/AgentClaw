/** Brex Budgets + Transactions API client. */
export interface BrexBudget {
  id: string;
  name: string;
  periodType: string;
  limit: number;
  spent: number;
  currency: string;
}

export interface BrexTransaction {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
}

export class BrexClient {
  private readonly baseUrl = 'https://platform.brexapis.com';
  private readonly headers: Record<string, string>;

  constructor(apiToken: string) {
    this.headers = {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  async listBudgets(): Promise<BrexBudget[]> {
    const res = await fetch(`${this.baseUrl}/v1/budgets`, { headers: this.headers });
    if (!res.ok) throw new Error(`Brex API error: ${res.status}`);
    const data = (await res.json()) as {
      items: Array<{
        budget_id: string;
        name: string;
        period_type: string;
        limit: { amount: number; currency: string };
        current_period_balance: { amount: number };
      }>;
    };
    return data.items.map((b) => ({
      id: b.budget_id,
      name: b.name,
      periodType: b.period_type,
      limit: b.limit.amount,
      spent: b.limit.amount - b.current_period_balance.amount,
      currency: b.limit.currency,
    }));
  }

  async listTransactions(limit = 20): Promise<BrexTransaction[]> {
    const res = await fetch(
      `${this.baseUrl}/v2/transactions/cash?limit=${limit}`,
      { headers: this.headers },
    );
    if (!res.ok) throw new Error(`Brex API error: ${res.status}`);
    const data = (await res.json()) as {
      items: Array<{
        id: string;
        description: string;
        amount: number;
        currency: string;
        date: string;
      }>;
    };
    return data.items.map((t) => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      currency: t.currency,
      date: t.date,
    }));
  }

  /** Returns a prompt-ready spend summary. */
  async fetchLiveSummary(): Promise<string> {
    const budgets = await this.listBudgets();
    if (budgets.length === 0) return 'No Brex budgets found.';
    const lines = budgets.map((b) => {
      const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
      const flag = pct >= 80 ? ' ⚠️' : '';
      return `- ${b.name}: ${b.spent} / ${b.limit} ${b.currency} (${pct}%)${flag}`;
    });
    return `Brex budgets (current period):\n${lines.join('\n')}`;
  }

  /** Returns true if any budget is >= thresholdPct of its limit. */
  async hasNearLimitBudget(thresholdPct = 80): Promise<boolean> {
    const budgets = await this.listBudgets();
    return budgets.some(
      (b) => b.limit > 0 && (b.spent / b.limit) * 100 >= thresholdPct,
    );
  }
}
