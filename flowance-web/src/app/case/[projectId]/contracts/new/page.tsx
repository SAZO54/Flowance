import '@/contract-management.css'
import '@/edit-form-hierarchy.css'
import '@/date-time-picker.css'
import '@/date-picker-extensions.css'
import {AppShell} from '@/presentation/layout/AppShell'
import {ContractCreateComposition} from './ContractCreateComposition'

export default async function ContractCreatePage({params}: {
  params: Promise<{projectId: string}>
}) {
  const {projectId} = await params
  return <AppShell><ContractCreateComposition projectId={projectId}/></AppShell>
}
