import type {ScheduleGateway} from './ports'

export function deleteSchedule(
  {scheduleGateway}: {scheduleGateway: Pick<ScheduleGateway, 'deleteWorkSchedule'>},
  workScheduleId: string,
  version: number,
): Promise<void> {
  return scheduleGateway.deleteWorkSchedule(workScheduleId, version)
}
