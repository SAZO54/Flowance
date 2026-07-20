import type {
  CalendarEvent,
  CalendarMode,
  CreateWorkScheduleCommand,
  CreateWorkScheduleResult,
  ScheduleProject,
  UpdateWorkScheduleCommand,
  WorkSchedule,
} from '../../domain/schedule'

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
  getWorkSchedule(workScheduleId: string): Promise<WorkSchedule>
  updateWorkSchedule(command: UpdateWorkScheduleCommand): Promise<CreateWorkScheduleResult>
  deleteWorkSchedule(workScheduleId: string, version: number): Promise<void>
}

export interface ScheduleProjectGateway {
  listScheduleProjects(): Promise<ScheduleProject[]>
}
