export type ClientStatus = 'ACTIVE' | 'INACTIVE'

export type ClientIcon = {
  type: 'DEFAULT' | 'UPLOADED'
  status: 'READY' | 'PENDING' | 'PROCESSING' | 'FAILED'
  url: string | null
  defaultText: string
  backgroundColor: string
  textColor: string
}

export type ClientListItem = {
  id: string
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  postalCode: string | null
  address: string | null
  status: ClientStatus
  notes: string | null
  icon: ClientIcon
  version: number
  createdAt: string
  updatedAt: string
}

export type ClientSort = 'name' | '-name' | 'updatedAt' | '-updatedAt'

export type ClientListQuery = {
  query?: string
  status?: ClientStatus
  page: number
  pageSize: number
  sort: ClientSort
}

export type ClientPagination = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export type ClientListResult = {
  items: ClientListItem[]
  pagination: ClientPagination
}
