import '@/presentation/features/workRecords/styles/work-records-api.css'
import '@/presentation/features/workRecords/styles/work-record-danger-action.css'
import '@/presentation/features/workRecords/styles/work-record-month-filter.css'
import '@/styles/shared/metric-cards.css'
import '@/styles/shared/list-title-and-detail-overrides.css'
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
