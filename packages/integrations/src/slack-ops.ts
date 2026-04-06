/** Slack-ops integration: reads channel activity and team pulse using a user token. */
export interface SlackChannelStat {
  channelId: string;
  name: string;
  memberCount: number;
  messageCountToday: number;
}

export interface SlackUserStatus {
  userId: string;
  displayName: string;
  statusText: string;
  statusEmoji: string;
}

export class SlackOpsClient {
  private readonly baseUrl = 'https://slack.com/api';
  private readonly headers: Record<string, string>;

  constructor(userToken: string) {
    this.headers = {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    };
  }

  async listChannels(limit = 20): Promise<SlackChannelStat[]> {
    const res = await fetch(
      `${this.baseUrl}/conversations.list?limit=${limit}&exclude_archived=true`,
      { headers: this.headers },
    );
    if (!res.ok) throw new Error(`Slack API error: ${res.status}`);
    const data = (await res.json()) as {
      ok: boolean;
      channels?: Array<{ id: string; name: string; num_members?: number }>;
    };
    if (!data.ok || !data.channels) throw new Error('Slack conversations.list failed');
    return data.channels.map((ch) => ({
      channelId: ch.id,
      name: ch.name,
      memberCount: ch.num_members ?? 0,
      messageCountToday: 0, // would require conversations.history per channel
    }));
  }

  async getTeamStatuses(userIds: string[]): Promise<SlackUserStatus[]> {
    const statuses = await Promise.allSettled(
      userIds.map(async (userId) => {
        const res = await fetch(`${this.baseUrl}/users.profile.get?user=${userId}`, {
          headers: this.headers,
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          ok: boolean;
          profile?: {
            display_name: string;
            status_text: string;
            status_emoji: string;
          };
        };
        if (!data.ok || !data.profile) return null;
        return {
          userId,
          displayName: data.profile.display_name,
          statusText: data.profile.status_text,
          statusEmoji: data.profile.status_emoji,
        } satisfies SlackUserStatus;
      }),
    );
    return statuses
      .filter(
        (r): r is PromiseFulfilledResult<SlackUserStatus> =>
          r.status === 'fulfilled' && r.value !== null,
      )
      .map((r) => r.value);
  }

  /** Returns a prompt-ready team activity summary. */
  async fetchLiveSummary(): Promise<string> {
    const channels = await this.listChannels(5);
    if (channels.length === 0) return 'No Slack channels found.';
    const lines = channels.map(
      (ch) => `- #${ch.name}: ${ch.memberCount} members`,
    );
    return `Slack workspace (top channels by membership):\n${lines.join('\n')}`;
  }
}
