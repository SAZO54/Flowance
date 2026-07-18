import '@/client-edit-actions.css'
import {ClientDetailComposition} from './ClientDetailComposition'
import {AppShell} from '@/presentation/layout/AppShell'

export default async function ClientDetailPage({params}: {params: Promise<{clientId: string}>}) {
  const {clientId} = await params
  return <AppShell><ClientDetailComposition clientId={clientId}/></AppShell>
}
