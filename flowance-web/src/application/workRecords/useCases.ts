import type {
  SaveWorkRecordCommand,
  UpdateWorkRecordCommand,
  WorkRecord,
  WorkRecordListQuery,
  WorkRecordListResult,
} from '@/domain/workRecord'
import type {WorkRecordGateway} from './ports'

type Dependencies = {workRecordGateway: WorkRecordGateway}

export function listWorkRecords(
  {workRecordGateway}: Dependencies,
  query: WorkRecordListQuery,
): Promise<WorkRecordListResult> {
  return workRecordGateway.listWorkRecords(query)
}

export function createWorkRecord(
  {workRecordGateway}: Dependencies,
  command: SaveWorkRecordCommand,
): Promise<WorkRecord> {
  return workRecordGateway.createWorkRecord(command)
}

export function updateWorkRecord(
  {workRecordGateway}: Dependencies,
  command: UpdateWorkRecordCommand,
): Promise<WorkRecord> {
  return workRecordGateway.updateWorkRecord(command)
}

export function deleteWorkRecord(
  {workRecordGateway}: Dependencies,
  recordId: string,
  version: number,
): Promise<void> {
  return workRecordGateway.deleteWorkRecord(recordId, version)
}
