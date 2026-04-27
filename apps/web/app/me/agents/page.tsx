import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { AgentsManager } from "./AgentsManager"

export default async function AgentsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return <AgentsManager />
}
