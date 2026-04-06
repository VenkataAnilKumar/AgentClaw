/**
 * Thin fetch wrapper for the AgentClaw REST server.
 * Reads AGENTCLAW_API_URL and AGENTCLAW_API_KEY from env.
 */

const BASE_URL = (process.env.AGENTCLAW_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const API_KEY = process.env.AGENTCLAW_API_KEY ?? '';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text).error ?? text; } catch { /* raw text */ }
    throw new Error(`${res.status} ${res.statusText}: ${msg}`);
  }

  return JSON.parse(text) as T;
}

export const api = {
  getSkill: (skillName: string) =>
    request<{ skill: unknown }>('GET', `/api/skills/${encodeURIComponent(skillName)}`),

  listSkills: (companyId: string) =>
    request<{ skills: unknown[] }>('GET', `/api/skills?companyId=${encodeURIComponent(companyId)}`),

  installSkill: (companyId: string, skillName: string, secrets: Record<string, string>) =>
    request<{ installed: unknown }>('POST', '/api/skills/install', { companyId, skillName, secrets }),

  uninstallSkill: (companyId: string, skillName: string) =>
    request<{ ok: boolean }>('DELETE', `/api/skills/${encodeURIComponent(skillName)}?companyId=${encodeURIComponent(companyId)}`),
};
