import type {
  SaveWorkRecordCommand,
  UpdateWorkRecordCommand,
  WorkRecord,
  WorkRecordListQuery,
  WorkRecordListResult,
} from '@/domain/workRecord'

export interface WorkRecordGateway {
  listWorkRecords(query: WorkRecordListQuery): Promise<WorkRecordListResult>
  createWorkRecord(command: SaveWorkRecordCommand): Promise<WorkRecord>
  updateWorkRecord(command: UpdateWorkRecordCommand): Promise<WorkRecord>
  deleteWorkRecord(recordId: string, version: number): Promise<void>
}
