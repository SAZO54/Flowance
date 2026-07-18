'use client'

import {useRouter} from 'next/navigation'
import {loadDashboard} from '@/application/dashboard'
import {authApi} from '@/infrastructure/api/authApi'
import {projectApi} from '@/infrastructure/api/projectApi'
import {scheduleApi} from '@/infrastructure/api/scheduleApi'
import {workRecordApi} from '@/infrastructure/api/workRecordApi'
import {
  DashboardContainer,
  type DashboardUseCases,
} from '@/presentation/features/dashboard/DashboardContainer'
import {AppShell} from '@/presentation/layout/AppShell'

const useCases: DashboardUseCases = {
  load: range => loadDashboard({
    authGateway: authApi,
    projectGateway: projectApi,
    scheduleGateway: scheduleApi,
    workRecordGateway: workRecordApi,
  }, range),
}

export function DashboardComposition() {
  const router = useRouter()
  return <AppShell onAddWork={() => router.push('/timelog?action=create')}>
    <DashboardContainer useCases={useCases}/>
  </AppShell>
}
