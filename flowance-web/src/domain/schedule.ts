export type CalendarEventType = 'SCHEDULE' | 'WORK_RECORD'

export type CalendarMode = 'planned' | 'actual' | 'both'

export type CalendarEvent = {
  id: string
  type: CalendarEventType
  projectId: string
  userId: string
  title: string
  startAt: string
  endAt: string
  status: string
  isGenerated?: boolean
  isManuallyOverridden?: boolean
  sourceId?: string | null
  version: number
}

export type ScheduleProject = {
  id: string
  name: string
  labelColor: string
  status: string
  client: {
    id: string
    name: string
  }
}

export type ScheduleWarning = {
  code: string
  message: string
  targetId: string | null
  conflictIds: string[]
  severity: 'WARNING'
}

export type CreateWorkScheduleCommand = {
  projectId: string
  title: string
  scheduledStartAt: string
  scheduledEndAt: string
  notes?: string | null
}

export type UpdateWorkScheduleCommand = CreateWorkScheduleCommand & {
  workScheduleId: string
  version: number
}

export type CreateWorkScheduleResult = {
  item: WorkSchedule
  warnings: ScheduleWarning[]
}

export type WorkSchedule = {
  id: string
  projectId: string
  userId: string
  weeklyScheduleId: string | null
  title: string
  scheduledStartAt: string
  scheduledEndAt: string
  breakMinutes: number
  status: 'PLANNED' | 'CANCELLED'
  isGenerated: boolean
  isManuallyOverridden: boolean
  notes: string | null
  version: number
  createdAt: string | null
  updatedAt: string | null
}
