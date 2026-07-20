import '@/client-edit-actions.css'
import '@/detail-field-hierarchy.css'
import '@/detail-hero-actions.css'
import '@/detail-hero-metrics.css'
import '@/detail-navigation-actions.css'
import {ClientDetailComposition} from './ClientDetailComposition'
import {AppShell} from '@/presentation/layout/AppShell'

export default async function ClientDetailPage({params}: {params: Promise<{clientId: string}>}) {
  const {clientId} = await params
  return <AppShell><ClientDetailComposition clientId={clientId}/></AppShell>
}
