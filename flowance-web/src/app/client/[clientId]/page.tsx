import '@/presentation/features/clients/styles/client-detail-api.css'
import '@/presentation/features/clients/styles/client-edit-actions.css'
import '@/styles/shared/detail-field-hierarchy.css'
import '@/styles/shared/detail-hero-actions.css'
import '@/styles/shared/detail-hero-metrics.css'
import '@/styles/shared/detail-navigation-actions.css'
import {ClientDetailComposition} from './ClientDetailComposition'
import {AppShell} from '@/presentation/layout/AppShell'

export default async function ClientDetailPage({params}: {params: Promise<{clientId: string}>}) {
  const {clientId} = await params
  return <AppShell><ClientDetailComposition clientId={clientId}/></AppShell>
}
