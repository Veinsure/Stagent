// Typed wrappers for every backend endpoint. All requests are same-origin via /api proxy.

export interface UserPublic {
  id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  created_at: number
}

export interface UserPrivate extends UserPublic {
  email: string
}

export interface AgentPublic {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  color: string | null
  created_at: number
  last_used_at: number | null
  hands_played: number
  hands_won: number
  total_winnings: number
}

export interface LiveAgent {
  agent_id: string
  agent_name: string
  room: string
  since_ts: number
}

export interface ApiError {
  error: string
}

class HttpError extends Error {
  constructor(public status: number, public body: any) { super(`HTTP ${status}`) }
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    ...init,
  })
  const text = await res.text()
  let body: any = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!res.ok) throw new HttpError(res.status, body)
  return body as T
}

// ========== Auth ==========

export async function register(input: { email: string; password: string; display_name: string }) {
  return req<{ user: UserPrivate }>("/api/auth/register", {
    method: "POST", body: JSON.stringify(input),
  })
}

export async function login(input: { email: string; password: string }) {
  return req<{ user: UserPrivate }>("/api/auth/login", {
    method: "POST", body: JSON.stringify(input),
  })
}

export async function logout() {
  return req<{ ok: true }>("/api/auth/logout", { method: "POST" })
}

export async function me(): Promise<UserPrivate | null> {
  try {
    const r = await req<{ user: UserPrivate }>("/api/auth/me")
    return r.user
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) return null
    throw e
  }
}

// ========== Users ==========

export interface UserProfileResponse {
  user: UserPublic
  live: LiveAgent[]
  is_following: boolean
  followers_count: number
}

export async function getUser(name: string) {
  return req<UserProfileResponse>(`/api/users/${encodeURIComponent(name)}`)
}

export async function followUser(name: string) {
  return req<{ ok: true; already?: boolean }>(`/api/users/${encodeURIComponent(name)}/follow`, {
    method: "POST",
  })
}

export async function unfollowUser(name: string) {
  await fetch(`/api/users/${encodeURIComponent(name)}/follow`, {
    method: "DELETE",
    credentials: "include",
  })
}

// ========== Agents ==========

export async function listMyAgents() {
  return req<{ agents: AgentPublic[] }>("/api/me/agents")
}

export async function createAgent(input: { name: string; description?: string; color?: string }) {
  return req<AgentPublic & { token: string }>("/api/me/agents", {
    method: "POST", body: JSON.stringify(input),
  })
}

export async function deleteAgent(id: string) {
  return req<{ ok: true }>(`/api/me/agents/${id}`, { method: "DELETE" })
}

export async function rotateAgent(id: string) {
  return req<{ id: string; token: string }>(`/api/me/agents/${id}/rotate`, { method: "POST" })
}

// ========== Replays ==========

export interface ReplayMeta {
  id: string; user_id: string
  room: string; room_kind: "demo" | "private"
  visibility: "public" | "private"
  started_at: number; ended_at: number; hands_count: number
}

export interface ReplayDetail extends ReplayMeta {
  events: any[]
  truncated: boolean
}

export async function uploadReplay(input: {
  room: string; room_kind: "demo" | "private"
  started_at: number; ended_at: number
  hands_count: number; events: any[]
  visibility: "public" | "private"
}) {
  return req<{ id: string; url: string }>("/api/replays", {
    method: "POST", body: JSON.stringify(input),
  })
}

export async function getReplay(id: string) {
  return req<ReplayDetail>(`/api/replays/${id}`)
}

export async function deleteReplay(id: string) {
  return req<{ ok: true }>(`/api/replays/${id}`, { method: "DELETE" })
}

export { HttpError }
