'use client'

import {createProject} from '@/application/projects/createProject'
import {listClients} from '@/application/clients'
import {clientApi} from '@/infrastructure/api/clientApi'
import {projectApi} from '@/infrastructure/api/projectApi'
import {
  ProjectCreateContainer,
  type ProjectCreateUseCases,
} from '@/presentation/features/projects/ProjectCreateContainer'

const useCases: ProjectCreateUseCases = {
  loadClients: () => listClients({clientGateway: clientApi}, {
    status: 'ACTIVE',
    page: 1,
    pageSize: 100,
    sort: 'name',
  }),
  create: command => createProject({projectGateway: projectApi}, command),
}

export function ProjectCreateComposition() {
  return <ProjectCreateContainer useCases={useCases}/>
}
