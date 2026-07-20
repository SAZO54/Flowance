import '@/presentation/features/contracts/styles/contract-management.css'
import '@/styles/shared/edit-form-hierarchy.css'
import '@/styles/shared/date-time-picker.css'
import '@/styles/shared/date-picker-extensions.css'
import {AppShell} from '@/presentation/layout/AppShell'
import {ContractCreateComposition} from './ContractCreateComposition'

export default async function ContractCreatePage({params}: {
  params: Promise<{projectId: string}>
}) {
  const {projectId} = await params
  return <AppShell><ContractCreateComposition projectId={projectId}/></AppShell>
}
