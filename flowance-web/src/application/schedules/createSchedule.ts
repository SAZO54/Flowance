import type {
  CreateWorkScheduleCommand,
  CreateWorkScheduleResult,
} from '../../domain/schedule'
import type {ScheduleGateway} from './ports'

export type CreateScheduleDependencies = {
  scheduleGateway: Pick<ScheduleGateway, 'createWorkSchedule'>
}

/** Registers a manually-created work schedule through the configured port. */
export function createSchedule(
  {scheduleGateway}: CreateScheduleDependencies,
  command: CreateWorkScheduleCommand,
): Promise<CreateWorkScheduleResult> {
  return scheduleGateway.createWorkSchedule(command)
}

