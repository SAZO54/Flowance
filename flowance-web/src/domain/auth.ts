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

export type LoginCredentials = {
  email: string
  password: string
}

export type RegistrationInput = {
  email: string
  password: string
  displayName: string
  organizationName: string
  timezone: string
}
