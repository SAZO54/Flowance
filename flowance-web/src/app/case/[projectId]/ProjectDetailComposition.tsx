'use client'

import {listContracts} from '@/application/contracts'
import {getProject} from '@/application/projects/getProject'
import {authApi} from '@/infrastructure/api/authApi'
import {contractApi} from '@/infrastructure/api/contractApi'
import {projectApi} from '@/infrastructure/api/projectApi'
import {
  ProjectDetailContainer,
  type ProjectDetailUseCases,
} from '@/presentation/features/projects/ProjectDetailContainer'

const useCases: ProjectDetailUseCases = {
  get: projectId => getProject({projectGateway: projectApi}, projectId),
  getAuth: () => authApi.getCurrentUser(),
  listContracts: projectId => listContracts(contractApi, projectId),
}

export function ProjectDetailComposition({projectId}: {projectId: string}) {
  return <ProjectDetailContainer projectId={projectId} useCases={useCases}/>
}
