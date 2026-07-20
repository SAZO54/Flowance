export type SettingsSection = 'profile' | 'organization' | 'business' | 'appearance'
export type WeekStartsOn = 'MONDAY' | 'SUNDAY'
export type TimeFormat = 'H24' | 'H12'

export type SettingsProfile = {
  id: string
  email: string
  displayName: string
  familyName: string
  givenName: string
  phoneNumber: string
  bio: string
  updatedAt: string
}

export type SettingsOrganization = {
  id: string
  name: string
  timezone: string
  currency: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  canEdit: boolean
  updatedAt: string
}

export type SettingsBusiness = {
  businessName: string
  postalCode: string
  prefecture: string
  address: string
  invoiceRegistrationNumber: string
  defaultTaxRate: string | null
  canEdit: boolean
  updatedAt: string
}

export type SettingsAppearance = {
  timezone: string
  weekStartsOn: WeekStartsOn
  timeFormat: TimeFormat
  compactMode: boolean
}

export type SettingsVersions = {
  user: number
  organization: number
  business: number
}

export type SettingsData = {
  profile: SettingsProfile
  organization: SettingsOrganization
  business: SettingsBusiness
  appearance: SettingsAppearance
  versions: SettingsVersions
  permissions: string[]
}

export type SettingsPatch = {
  profile?: Partial<Pick<
    SettingsProfile,
    'displayName' | 'familyName' | 'givenName' | 'phoneNumber' | 'bio'
  >>
  organization?: Partial<Pick<SettingsOrganization, 'name' | 'timezone'>>
  business?: Partial<Pick<
    SettingsBusiness,
    | 'businessName'
    | 'postalCode'
    | 'prefecture'
    | 'address'
    | 'invoiceRegistrationNumber'
    | 'defaultTaxRate'
  >>
  appearance?: Partial<SettingsAppearance>
  versions: Partial<SettingsVersions>
}
