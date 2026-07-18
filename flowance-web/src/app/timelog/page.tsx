import '@/work-records-api.css'
import {AppShell} from '@/presentation/layout/AppShell'
import {WorkRecordsComposition} from './WorkRecordsComposition'

type TimelogPageProps = {
  searchParams: Promise<{action?: string | string[]}>
}

export default async function TimelogPage({searchParams}: TimelogPageProps) {
  const {action} = await searchParams
  const shouldOpenCreate = action === 'create'
  return <AppShell><WorkRecordsComposition shouldOpenCreate={shouldOpenCreate}/></AppShell>
}
