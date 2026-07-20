import type {
  SaveWorkRecordCommand,
  UpdateWorkRecordCommand,
  WorkRecord,
  WorkRecordListQuery,
  WorkRecordListResult,
} from '@/domain/workRecord'
import {apiClient, type ApiClient} from './apiClient'

function listPath(query: WorkRecordListQuery): string {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  if (query.from) search.set('from', query.from)
  if (query.to) search.set('to', query.to)
  if (query.projectId) search.set('projectId', query.projectId)
  if (query.status) search.set('status', query.status)
  return `/api/v1/work-records?${search.toString()}`
}

function writePayload(command: SaveWorkRecordCommand) {
  return {
    projectId: command.projectId,
    workScheduleId: command.workScheduleId,
    actualStartAt: command.actualStartAt,
    actualEndAt: command.actualEndAt,
    breaks: command.breaks,
    isBillable: command.isBillable,
    status: command.status,
    notes: command.notes,
  }
}

export class WorkRecordApi {
  constructor(private readonly client: ApiClient = apiClient) {}

  listWorkRecords(query: WorkRecordListQuery): Promise<WorkRecordListResult> {
    return this.client.request<WorkRecordListResult>(listPath(query))
  }

  createWorkRecord(command: SaveWorkRecordCommand): Promise<WorkRecord> {
    return this.client.request<WorkRecord>('/api/v1/work-records', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(writePayload(command)),
    })
  }

  updateWorkRecord(command: UpdateWorkRecordCommand): Promise<WorkRecord> {
    return this.client.request<WorkRecord>(
      `/api/v1/work-records/${encodeURIComponent(command.recordId)}`,
      {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...writePayload(command), version: command.version}),
      },
    )
  }

  deleteWorkRecord(recordId: string, version: number): Promise<void> {
    return this.client.request<void>(
      `/api/v1/work-records/${encodeURIComponent(recordId)}?version=${version}`,
      {method: 'DELETE'},
    )
  }
}

export const workRecordApi = new WorkRecordApi()
