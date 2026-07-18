import type {
  CalendarEvent,
  CalendarMode,
  CreateWorkScheduleCommand,
  CreateWorkScheduleResult,
  ScheduleProject,
} from '../../domain/schedule'

/**
 * Application-layer query contract for the calendar data source.
 *
 * Infrastructure adapters may serialize this query in any suitable way. The
 * application layer intentionally has no knowledge of HTTP or URLSearchParams.
 */
export type ListCalendarEventsQuery = {
  from: string
  to: string
  mode?: CalendarMode
  projectIds?: string[]
  userIds?: string[]
  status?: string[]
}

export interface ScheduleGateway {
  listCalendarEvents(query: ListCalendarEventsQuery): Promise<CalendarEvent[]>
  createWorkSchedule(command: CreateWorkScheduleCommand): Promise<CreateWorkScheduleResult>
}

export interface ScheduleProjectGateway {
  listScheduleProjects(): Promise<ScheduleProject[]>
}

