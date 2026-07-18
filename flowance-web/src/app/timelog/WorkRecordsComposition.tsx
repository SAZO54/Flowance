'use client'

import {
  createWorkRecord,
  deleteWorkRecord,
  listWorkRecords,
  updateWorkRecord,
} from '@/application/workRecords'
import {listProjects} from '@/application/projects'
import {projectApi} from '@/infrastructure/api/projectApi'
import {workRecordApi} from '@/infrastructure/api/workRecordApi'
import {
  WorkRecordsContainer,
  type WorkRecordUseCases,
} from '@/presentation/features/workRecords/WorkRecordsContainer'

const useCases: WorkRecordUseCases = {
  loadProjects: () => listProjects({projectGateway: projectApi}, {
    page: 1,
    pageSize: 100,
    sort: 'name',
  }),
  list: query => listWorkRecords({workRecordGateway: workRecordApi}, query),
  create: command => createWorkRecord({workRecordGateway: workRecordApi}, command),
  update: command => updateWorkRecord({workRecordGateway: workRecordApi}, command),
  delete: (recordId, version) => deleteWorkRecord({workRecordGateway: workRecordApi}, recordId, version),
}

export function WorkRecordsComposition() {
  return <WorkRecordsContainer useCases={useCases}/>
}
