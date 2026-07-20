'use client'

import {settingsApi} from '@/infrastructure/api/settingsApi'
import {SettingsContainer} from '@/presentation/features/settings/SettingsContainer'

export function SettingsComposition() {
  return <SettingsContainer gateway={settingsApi}/>
}

