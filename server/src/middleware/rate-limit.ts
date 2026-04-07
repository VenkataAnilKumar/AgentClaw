type RateLimitType = 'slashCommand' | 'skillInstall';

const RATE_LIMITS = {
  slashCommand: 10, // per company per minute
  agentRun: 5, // concurrent runs per company
  skillInstall: 3, // per company per hour
} as const;

type Bucket = {
  windowStartMs: number;
  count: number;
};

export class CompanyRateLimiter {
  private readonly slashBuckets = new Map<string, Bucket>();
  private readonly installBuckets = new Map<string, Bucket>();
  private readonly inFlightRuns = new Map<string, number>();

  checkAndConsume(companyId: string, type: RateLimitType): boolean {
    if (type === 'slashCommand') {
      return this.consume(this.slashBuckets, companyId, 60_000, RATE_LIMITS.slashCommand);
    }
    return this.consume(this.installBuckets, companyId, 60 * 60_000, RATE_LIMITS.skillInstall);
  }

  acquireAgentRunSlot(companyId: string): (() => void) | null {
    const current = this.inFlightRuns.get(companyId) ?? 0;
    if (current >= RATE_LIMITS.agentRun) {
      return null;
    }

    this.inFlightRuns.set(companyId, current + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const now = this.inFlightRuns.get(companyId) ?? 0;
      if (now <= 1) {
        this.inFlightRuns.delete(companyId);
      } else {
        this.inFlightRuns.set(companyId, now - 1);
      }
    };
  }

  private consume(
    map: Map<string, Bucket>,
    companyId: string,
    windowMs: number,
    max: number,
  ): boolean {
    const now = Date.now();
    const existing = map.get(companyId);

    if (!existing || now - existing.windowStartMs >= windowMs) {
      map.set(companyId, { windowStartMs: now, count: 1 });
      return true;
    }

    if (existing.count >= max) {
      return false;
    }

    existing.count += 1;
    return true;
  }
}

export { RATE_LIMITS };
