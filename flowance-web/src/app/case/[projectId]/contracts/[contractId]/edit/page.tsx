import '@/contract-management.css'
import '@/edit-form-hierarchy.css'
import '@/date-time-picker.css'
import '@/date-picker-extensions.css'
import {AppShell} from '@/presentation/layout/AppShell'
import {ContractEditComposition} from './ContractEditComposition'

export default async function ContractEditPage({params}: {
  params: Promise<{projectId: string; contractId: string}>
}) {
  const {projectId, contractId} = await params
  return <AppShell><ContractEditComposition projectId={projectId} contractId={contractId}/></AppShell>
}
