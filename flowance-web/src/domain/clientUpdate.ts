import type {ClientStatus} from './client'
import type {UploadFile} from './projectCreate'

export type UpdateClientCommand = {
  clientId: string
  version: number
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  postalCode: string | null
  address: string | null
  status: ClientStatus
  notes: string | null
  iconAction: 'KEEP' | 'DELETE'
  iconFile?: UploadFile
}
