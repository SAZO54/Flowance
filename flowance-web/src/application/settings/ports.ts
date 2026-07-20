import type {SettingsData, SettingsPatch} from '@/domain/settings'

export interface SettingsGateway {
  get(): Promise<SettingsData>
  update(patch: SettingsPatch): Promise<SettingsData>
}
