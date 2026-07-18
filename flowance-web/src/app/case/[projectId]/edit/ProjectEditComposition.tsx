'use client'

import {listClients} from '@/application/clients'
import {getProject} from '@/application/projects/getProject'
import {updateProject} from '@/application/projects/updateProject'
import {clientApi} from '@/infrastructure/api/clientApi'
import {projectApi} from '@/infrastructure/api/projectApi'
import {
  ProjectEditContainer,
  type ProjectEditUseCases,
} from '@/presentation/features/projects/ProjectEditContainer'

const useCases: ProjectEditUseCases = {
  get: projectId => getProject({projectGateway: projectApi}, projectId),
  loadClients: () => listClients({clientGateway: clientApi}, {
    page: 1,
    pageSize: 100,
    sort: 'name',
  }),
  update: command => updateProject({projectGateway: projectApi}, command),
}

export function ProjectEditComposition({projectId}: {projectId: string}) {
  return <ProjectEditContainer projectId={projectId} useCases={useCases}/>
}
