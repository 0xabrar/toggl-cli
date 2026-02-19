import { readFileSync, writeFileSync, unlinkSync } from "fs";

const BASE_URL = "https://api.track.toggl.com/api/v9";
const REPORTS_URL = "https://api.track.toggl.com/reports/api/v3";

function getAuthHeader(): string {
  const token = process.env.TOGGL_API_TOKEN;
  if (!token) {
    console.error("TOGGL_API_TOKEN not set");
    process.exit(1);
  }
  return "Basic " + Buffer.from(`${token}:api_token`).toString("base64");
}

function headers(): Record<string, string> {
  return { Authorization: getAuthHeader(), "Content-Type": "application/json" };
}

export async function togglGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function togglPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function togglPut<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function reportsPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${REPORTS_URL}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`REPORTS POST ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

const CACHE_PATH = `${process.env.HOME}/.toggl-cache.json`;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface Cache {
  workspaceId: number;
  projects: Project[];
  fetchedAt: number;
}

function readCache(): Cache | null {
  try {
    const data = JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
    if (Date.now() - data.fetchedAt < CACHE_TTL_MS) return data;
  } catch {}
  return null;
}

function writeCache(cache: Cache) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

export async function getWorkspaceId(): Promise<number> {
  const cached = readCache();
  if (cached) return cached.workspaceId;
  const workspaces = await togglGet<{ id: number }[]>("/me/workspaces");
  const wid = workspaces[0]!.id;
  const projects = await togglGet<Project[]>("/me/projects");
  writeCache({ workspaceId: wid, projects, fetchedAt: Date.now() });
  return wid;
}

export async function getProjects(): Promise<Project[]> {
  const cached = readCache();
  if (cached) return cached.projects;
  // Fetching workspace will also cache projects
  await getWorkspaceId();
  return readCache()!.projects;
}

export async function refreshCache(): Promise<void> {
  try {
    unlinkSync(CACHE_PATH);
  } catch {}
  await getWorkspaceId();
  console.log("Cache refreshed.");
}

export interface Project {
  id: number;
  name: string;
  color: string;
  active: boolean;
  actual_hours: number | null;
  actual_seconds: number | null;
}

export interface TimeEntry {
  id: number;
  description: string;
  project_id: number | null;
  start: string;
  stop: string | null;
  duration: number;
  tags: string[];
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function parseDate(input: string): string {
  const now = new Date();
  if (input === "today") return now.toISOString().slice(0, 10);
  if (input === "yesterday") {
    now.setDate(now.getDate() - 1);
    return now.toISOString().slice(0, 10);
  }
  // "this week" = Monday of this week
  if (input === "this-week") {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    now.setDate(now.getDate() - diff);
    return now.toISOString().slice(0, 10);
  }
  // "this month"
  if (input === "this-month") {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }
  // "this quarter"
  if (input === "this-quarter") {
    const q = Math.floor(now.getMonth() / 3) * 3;
    return `${now.getFullYear()}-${String(q + 1).padStart(2, "0")}-01`;
  }
  // "this year"
  if (input === "this-year") {
    return `${now.getFullYear()}-01-01`;
  }
  // assume YYYY-MM-DD
  return input;
}
