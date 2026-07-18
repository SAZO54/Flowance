export type WorkRecordStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED'

export type WorkRecordBreak = {
  id: string
  startAt: string
  endAt: string
  breakMinutes: number
  sortOrder: number
}

export type WorkRecord = {
  id: string
  projectId: string
  userId: string
  workScheduleId: string | null
  actualStartAt: string
  actualEndAt: string
  actualMinutes: number
  breakMinutes: number
  billableMinutes: number
  isBillable: boolean
  status: WorkRecordStatus
  notes: string | null
  breaks: WorkRecordBreak[]
  version: number
  createdAt: string
  updatedAt: string
}

export type WorkRecordListQuery = {
  from?: string
  to?: string
  projectId?: string
  status?: WorkRecordStatus
  page: number
  pageSize: number
}

export type WorkRecordPagination = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export type WorkRecordListResult = {
  items: WorkRecord[]
  pagination: WorkRecordPagination
}

export type WorkRecordBreakInput = {
  startAt: string
  endAt: string
}

export type SaveWorkRecordCommand = {
  projectId: string
  workScheduleId: string | null
  actualStartAt: string
  actualEndAt: string
  breaks: WorkRecordBreakInput[]
  isBillable: boolean
  status: WorkRecordStatus
  notes: string | null
}

export type UpdateWorkRecordCommand = SaveWorkRecordCommand & {
  recordId: string
  version: number
}
