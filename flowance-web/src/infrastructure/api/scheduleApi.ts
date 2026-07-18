import type {
  CalendarEvent,
  CalendarMode,
  CreateWorkScheduleCommand,
  CreateWorkScheduleResult,
} from '../../domain/schedule'
import {apiClient, type ApiClient} from './apiClient'

export type ListCalendarEventsQuery = {
  from: string
  to: string
  mode?: CalendarMode
  projectIds?: string[]
  userIds?: string[]
  status?: string[]
}

type CalendarEventsResponse = {
  items: CalendarEvent[]
}

export class ScheduleApi {
  constructor(private readonly client: ApiClient = apiClient) {}

  async listCalendarEvents(query: ListCalendarEventsQuery): Promise<CalendarEvent[]> {
    const parameters = new URLSearchParams({
      from: query.from,
      to: query.to,
      mode: query.mode ?? 'both',
    })

    if (query.projectIds?.length) parameters.set('projectIds', query.projectIds.join(','))
    if (query.userIds?.length) parameters.set('userIds', query.userIds.join(','))
    if (query.status?.length) parameters.set('status', query.status.join(','))

    const response = await this.client.request<CalendarEventsResponse>(
      `/api/v1/calendar/events?${parameters.toString()}`,
    )
    return response.items
  }

  createWorkSchedule(command: CreateWorkScheduleCommand): Promise<CreateWorkScheduleResult> {
    return this.client.request<CreateWorkScheduleResult>('/api/v1/work-schedules', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(command),
    })
  }
}

export const scheduleApi = new ScheduleApi()
