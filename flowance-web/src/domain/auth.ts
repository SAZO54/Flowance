export type CurrentAuthContext = {
  user: {
    id: string
    email: string
    displayName: string
    timezone: string
  }
  appearance: {
    timezone: string
    weekStartsOn: 'MONDAY' | 'SUNDAY'
    timeFormat: 'H24' | 'H12'
    compactMode: boolean
  }
  organization: {
    id: string
    name: string
    role: 'OWNER' | 'ADMIN' | 'MEMBER'
  }
  permissions: string[]
}
