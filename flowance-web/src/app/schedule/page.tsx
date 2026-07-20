import '@/dashboard-metrics.css'
import '@/schedule-interactions.css'
import '@/schedule-calendar-interactions.css'
import '@/schedule-month-create.css'
import '@/schedule-titlebar.css'
import {ScheduleComposition} from './ScheduleComposition'
import {AppShell} from '@/presentation/layout/AppShell'

export default function SchedulePage() {
  return <AppShell><ScheduleComposition/></AppShell>
}
