export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'

export type ProjectIcon = {
  type: 'DEFAULT' | 'UPLOADED'
  status: 'READY' | 'PENDING' | 'PROCESSING' | 'FAILED'
  url: string | null
  defaultText: string
  backgroundColor: string
  textColor: string
}

export type ProjectMember = {
  id: string
  userId: string
  displayName: string
  role: 'MANAGER' | 'MEMBER'
  canView: boolean
  canEditSchedule: boolean
  canEditWorkRecord: boolean
}

export type ProjectListItem = {
  id: string
  client: {id: string; name: string}
  name: string
  description: string | null
  labelColor: string
  startDate: string | null
  endDate: string | null
  workloadRate: number | null
  status: ProjectStatus
  notes: string | null
  icon: ProjectIcon
  members: ProjectMember[]
  version: number
  createdAt: string
  updatedAt: string
}

export type ProjectSort = 'name' | '-name' | 'updatedAt' | '-updatedAt'

export type ProjectListQuery = {
  query?: string
  status?: ProjectStatus
  page: number
  pageSize: number
  sort: ProjectSort
}

export type ProjectPagination = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export type ProjectListResult = {
  items: ProjectListItem[]
  pagination: ProjectPagination
}
