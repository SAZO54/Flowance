import type {
  CreateWorkScheduleResult,
  UpdateWorkScheduleCommand,
} from '../../domain/schedule'
import type {ScheduleGateway} from './ports'

export function updateSchedule(
  {scheduleGateway}: {scheduleGateway: Pick<ScheduleGateway, 'updateWorkSchedule'>},
  command: UpdateWorkScheduleCommand,
): Promise<CreateWorkScheduleResult> {
  return scheduleGateway.updateWorkSchedule(command)
}
