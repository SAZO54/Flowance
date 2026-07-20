import '@/styles/shared/metric-cards.css'
import '@/presentation/features/schedules/styles/schedule-interactions.css'
import '@/presentation/features/schedules/styles/schedule-calendar-interactions.css'
import '@/presentation/features/schedules/styles/schedule-month-create.css'
import '@/presentation/features/schedules/styles/schedule-titlebar.css'
import {ScheduleComposition} from './ScheduleComposition'
import {AppShell} from '@/presentation/layout/AppShell'

export default function SchedulePage() {
  return <AppShell><ScheduleComposition/></AppShell>
}
