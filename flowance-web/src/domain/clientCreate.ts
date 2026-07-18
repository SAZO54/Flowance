import type {ClientListItem, ClientStatus} from './client'
import type {UploadFile} from './projectCreate'

export type CreateClientCommand = {
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  postalCode: string | null
  address: string | null
  status: ClientStatus
  notes: string | null
  iconFile?: UploadFile
}

export type CreateClientResult = ClientListItem
