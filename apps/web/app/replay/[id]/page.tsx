import { ReplayClient } from "./ReplayClient"

interface Props { params: { id: string } }

export default function ReplayPage({ params }: Props) {
  return <ReplayClient id={params.id} />
}

export function generateMetadata({ params }: Props) {
  return { title: `Stagent · Replay ${params.id.slice(0, 8)}` }
}
