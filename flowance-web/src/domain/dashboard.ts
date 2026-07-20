import type {CurrentAuthContext} from './auth'
import type {ProjectListItem} from './project'
import type {CalendarEvent} from './schedule'
import type {WorkRecord} from './workRecord'

export type DashboardData = {
  auth: CurrentAuthContext
  projects: ProjectListItem[]
  activeProjectTotal: number
  todaySchedules: CalendarEvent[]
  monthWorkRecords: WorkRecord[]
  monthWorkRecordTotal: number
}

export type DashboardRange = {
  todayFrom: string
  todayTo: string
  monthFrom: string
  monthTo: string
}
