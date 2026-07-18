'use client'

import {createSchedule, loadSchedule} from '@/application/schedules'
import {projectApi} from '@/infrastructure/api/projectApi'
import {scheduleApi} from '@/infrastructure/api/scheduleApi'
import {ScheduleContainer, type ScheduleUseCases} from '@/presentation/features/schedules/ScheduleContainer'

const useCases: ScheduleUseCases = {
  load: query => loadSchedule(
    {scheduleGateway: scheduleApi, projectGateway: projectApi},
    query,
  ),
  create: command => createSchedule({scheduleGateway: scheduleApi}, command),
}

/** Client-side composition root for the interactive schedule feature. */
export function ScheduleComposition() {
  return <ScheduleContainer useCases={useCases}/>
}
