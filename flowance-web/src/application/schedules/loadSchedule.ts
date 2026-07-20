import type {CalendarEvent, ScheduleProject} from '../../domain/schedule'
import {getCalendarRange, type SchedulePeriod} from './calendarRange'
import type {ScheduleGateway, ScheduleProjectGateway} from './ports'

export type LoadScheduleDependencies = {
  scheduleGateway: Pick<ScheduleGateway, 'listCalendarEvents'>
  projectGateway: ScheduleProjectGateway
}

export type LoadScheduleInput = {
  anchorDate: string
  period: SchedulePeriod
  filterProjectId?: string | null
  utcOffset?: string
}

export type LoadScheduleResult = {
  events: CalendarEvent[]
  projects: ScheduleProject[]
}

/** Loads the project filter options and calendar events as one screen use case. */
export async function loadSchedule(
  {scheduleGateway, projectGateway}: LoadScheduleDependencies,
  {anchorDate, period, filterProjectId, utcOffset}: LoadScheduleInput,
): Promise<LoadScheduleResult> {
  const range = getCalendarRange({anchorDate, period, utcOffset})
  const projectIds = filterProjectId && filterProjectId !== 'all'
    ? [filterProjectId]
    : undefined

  const [projects, events] = await Promise.all([
    projectGateway.listScheduleProjects(),
    scheduleGateway.listCalendarEvents({
      ...range,
      mode: 'both',
      projectIds,
    }),
  ])

  return {events, projects}
}

