'use client'

import {
  createSchedule,
  deleteSchedule,
  getSchedule,
  loadSchedule,
  updateSchedule,
} from '@/application/schedules'
import {projectApi} from '@/infrastructure/api/projectApi'
import {scheduleApi} from '@/infrastructure/api/scheduleApi'
import {ScheduleContainer, type ScheduleUseCases} from '@/presentation/features/schedules/ScheduleContainer'

const useCases: ScheduleUseCases = {
  load: query => loadSchedule(
    {scheduleGateway: scheduleApi, projectGateway: projectApi},
    query,
  ),
  create: command => createSchedule({scheduleGateway: scheduleApi}, command),
  get: workScheduleId => getSchedule({scheduleGateway: scheduleApi}, workScheduleId),
  update: command => updateSchedule({scheduleGateway: scheduleApi}, command),
  delete: (workScheduleId, version) => deleteSchedule(
    {scheduleGateway: scheduleApi},
    workScheduleId,
    version,
  ),
}

/** Client-side composition root for the interactive schedule feature. */
export function ScheduleComposition() {
  return <ScheduleContainer useCases={useCases}/>
}
