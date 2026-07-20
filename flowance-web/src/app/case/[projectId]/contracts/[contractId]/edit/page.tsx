import '@/presentation/features/contracts/styles/contract-management.css'
import '@/styles/shared/edit-form-hierarchy.css'
import '@/styles/shared/date-time-picker.css'
import '@/styles/shared/date-picker-extensions.css'
import {AppShell} from '@/presentation/layout/AppShell'
import {ContractEditComposition} from './ContractEditComposition'

export default async function ContractEditPage({params}: {
  params: Promise<{projectId: string; contractId: string}>
}) {
  const {projectId, contractId} = await params
  return <AppShell><ContractEditComposition projectId={projectId} contractId={contractId}/></AppShell>
}
