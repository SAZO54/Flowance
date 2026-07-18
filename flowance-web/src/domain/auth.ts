export type CurrentAuthContext = {
  user: {
    id: string
    email: string
    displayName: string
    timezone: string
  }
  organization: {
    id: string
    name: string
    role: 'OWNER' | 'ADMIN' | 'MEMBER'
  }
  permissions: string[]
}
