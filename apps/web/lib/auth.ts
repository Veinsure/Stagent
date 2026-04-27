import { cookies } from "next/headers"
import type { UserPrivate } from "./api.js"

const EDGE_URL = process.env.NEXT_PUBLIC_EDGE_URL ?? "http://localhost:8787"

/**
 * Read the current session on the server side. Use in Server Components.
 * Returns null when no valid session.
 */
export async function getCurrentUser(): Promise<UserPrivate | null> {
  const cookieStore = cookies()
  const sid = cookieStore.get("stg_sid")?.value
  if (!sid) return null
  const res = await fetch(`${EDGE_URL}/api/auth/me`, {
    headers: { Cookie: `stg_sid=${sid}` },
    cache: "no-store",
  })
  if (!res.ok) return null
  const body = await res.json() as { user: UserPrivate }
  return body.user
}
