import '@/edit-form-hierarchy.css'
import {ClientEditComposition} from './ClientEditComposition'
import {AppShell} from '@/presentation/layout/AppShell'

export default async function ClientEditPage({params}: {
  params: Promise<{clientId: string}>
}) {
  const {clientId} = await params
  return <AppShell><ClientEditComposition clientId={clientId}/></AppShell>
}
