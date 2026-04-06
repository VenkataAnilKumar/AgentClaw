/** Calendly v2 API client for meeting analytics. */
export interface CalendlyEvent {
  uuid: string;
  name: string;
  status: string;
  startTime: string;
  endTime: string;
  inviteeName?: string;
  inviteeEmail?: string;
}

export class CalendlyClient {
  private readonly baseUrl = 'https://api.calendly.com';
  private readonly headers: Record<string, string>;
  private userUri?: string;

  constructor(apiToken: string) {
    this.headers = {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async getCurrentUserUri(): Promise<string> {
    if (this.userUri) return this.userUri;
    const res = await fetch(`${this.baseUrl}/users/me`, { headers: this.headers });
    if (!res.ok) throw new Error(`Calendly API error: ${res.status}`);
    const data = (await res.json()) as { resource: { uri: string } };
    this.userUri = data.resource.uri;
    return this.userUri;
  }

  async listRecentEvents(count = 20): Promise<CalendlyEvent[]> {
    const userUri = await this.getCurrentUserUri();
    const params = new URLSearchParams({
      user: userUri,
      count: String(count),
      status: 'active',
      sort: 'start_time:desc',
    });
    const res = await fetch(`${this.baseUrl}/scheduled_events?${params}`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`Calendly API error: ${res.status}`);
    const data = (await res.json()) as {
      collection: Array<{
        uri: string;
        name: string;
        status: string;
        start_time: string;
        end_time: string;
        event_memberships?: Array<{ user: string }>;
      }>;
    };
    return data.collection.map((e) => ({
      uuid: e.uri.split('/').pop() ?? '',
      name: e.name,
      status: e.status,
      startTime: e.start_time,
      endTime: e.end_time,
    }));
  }

  /** Returns a prompt-ready summary of recent meetings. */
  async fetchLiveSummary(): Promise<string> {
    const events = await this.listRecentEvents(10);
    if (events.length === 0) return 'No recent Calendly meetings found.';
    const lines = events
      .slice(0, 5)
      .map((e) => `- ${e.name} on ${e.startTime.slice(0, 10)} [${e.status}]`);
    return `Calendly (last ${Math.min(events.length, 5)} meetings):\n${lines.join('\n')}`;
  }
}
