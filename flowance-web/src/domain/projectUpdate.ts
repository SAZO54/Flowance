import type {ProjectStatus} from './project'
import type {UploadFile} from './projectCreate'

export type UpdateProjectCommand = {
  projectId: string
  version: number
  clientId: string
  name: string
  description: string | null
  labelColor: string
  startDate: string | null
  endDate: string | null
  workloadRate: number | null
  status: ProjectStatus
  notes: string | null
  iconAction: 'KEEP' | 'DELETE'
  iconFile?: UploadFile
}
