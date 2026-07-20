import type {WorkSchedule} from '../../domain/schedule'
import type {ScheduleGateway} from './ports'

export function getSchedule(
  {scheduleGateway}: {scheduleGateway: Pick<ScheduleGateway, 'getWorkSchedule'>},
  workScheduleId: string,
): Promise<WorkSchedule> {
  return scheduleGateway.getWorkSchedule(workScheduleId)
}
