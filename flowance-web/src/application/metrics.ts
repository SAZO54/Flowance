import type { EventItem, WorkRecord } from '../domain/models'

export const filterEventsByProject = (events: EventItem[], projectId: string) =>
  events.filter(event => projectId === 'all' || event.project === projectId)

export const sumEventHours = (events: EventItem[]) =>
  events.reduce((sum, event) => sum + event.end - event.start, 0)

export const scheduledHoursForProject = (events: EventItem[], projectId: string) =>
  sumEventHours(events.filter(event => event.project === projectId))

export const sumWorkHours = (records: WorkRecord[]) =>
  records.reduce((sum, record) => sum + record.hours, 0)

export const percentageOf = (value: number, target: number) =>
  target > 0 ? Math.round(value / target * 100) : 0
