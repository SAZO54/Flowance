import type {SettingsData, SettingsPatch} from '@/domain/settings'
import type {SettingsGateway} from '@/application/settings'
import {apiClient, type ApiClient} from './apiClient'

export class SettingsApi implements SettingsGateway {
  constructor(private readonly client: ApiClient = apiClient) {}

  get(): Promise<SettingsData> {
    return this.client.request<SettingsData>('/api/v1/settings')
  }

  update(patch: SettingsPatch): Promise<SettingsData> {
    return this.client.request<SettingsData>('/api/v1/settings', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(patch),
    })
  }
}

export const settingsApi = new SettingsApi()
