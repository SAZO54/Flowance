import type {SettingsData, SettingsPatch} from '@/domain/settings'
import type {SettingsGateway} from './ports'

export const loadSettings = (gateway: SettingsGateway): Promise<SettingsData> =>
  gateway.get()

export const updateSettings = (
  gateway: SettingsGateway,
  patch: SettingsPatch,
): Promise<SettingsData> => gateway.update(patch)
