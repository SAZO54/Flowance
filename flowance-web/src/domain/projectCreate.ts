import type {ProjectListItem, ProjectStatus} from './project'

export type UploadFile = {
  name: string
  type: string
  size: number
  arrayBuffer(): Promise<ArrayBuffer>
}

export type CreateProjectCommand = {
  clientId: string
  name: string
  description: string | null
  labelColor: string
  startDate: string | null
  endDate: string | null
  workloadRate: number | null
  status: ProjectStatus
  notes: string | null
  iconFile?: UploadFile
}

export type CreateProjectResult = ProjectListItem
