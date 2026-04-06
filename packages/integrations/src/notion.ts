/** Lightweight Notion REST API client. */
export interface NotionDatabase {
  id: string;
  title: string;
  url: string;
}

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  properties: Record<string, unknown>;
}

export class NotionClient {
  private readonly baseUrl = 'https://api.notion.com/v1';
  private readonly headers: Record<string, string>;

  constructor(apiKey: string) {
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    };
  }

  async listDatabases(): Promise<NotionDatabase[]> {
    const res = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ filter: { value: 'database', property: 'object' } }),
    });
    if (!res.ok) throw new Error(`Notion API error: ${res.status}`);
    const data = (await res.json()) as { results: Array<{ id: string; title: Array<{ plain_text: string }>; url: string }> };
    return data.results.map((db) => ({
      id: db.id,
      title: db.title[0]?.plain_text ?? 'Untitled',
      url: db.url,
    }));
  }

  async queryDatabase(databaseId: string, pageSize = 20): Promise<NotionPage[]> {
    const res = await fetch(`${this.baseUrl}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ page_size: pageSize }),
    });
    if (!res.ok) throw new Error(`Notion API error: ${res.status}`);
    const data = (await res.json()) as { results: Array<{ id: string; url: string; properties: Record<string, unknown> }> };
    return data.results.map((page) => {
      const titleProp = Object.values(page.properties).find(
        (p): p is { type: 'title'; title: Array<{ plain_text: string }> } =>
          (p as { type: string }).type === 'title',
      );
      return {
        id: page.id,
        title: titleProp?.title[0]?.plain_text ?? 'Untitled',
        url: page.url,
        properties: page.properties,
      };
    });
  }

  /** Create or update a page in a database. */
  async upsertPage(
    databaseId: string,
    properties: Record<string, unknown>,
  ): Promise<NotionPage> {
    const res = await fetch(`${this.baseUrl}/pages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
    });
    if (!res.ok) throw new Error(`Notion API error: ${res.status}`);
    const page = (await res.json()) as { id: string; url: string; properties: Record<string, unknown> };
    return { id: page.id, title: 'Created', url: page.url, properties: page.properties };
  }

  /** Fetch a summary suitable for prompt injection. */
  async fetchLiveSummary(databaseId: string): Promise<string> {
    const pages = await this.queryDatabase(databaseId, 5);
    if (pages.length === 0) return 'Notion database is empty.';
    const lines = pages.map((p) => `- ${p.title}`).join('\n');
    return `Notion (latest ${pages.length} rows):\n${lines}`;
  }
}
