'use client'

import {getProject} from '@/application/projects/getProject'
import {projectApi} from '@/infrastructure/api/projectApi'
import {
  ProjectDetailContainer,
  type ProjectDetailUseCases,
} from '@/presentation/features/projects/ProjectDetailContainer'

const useCases: ProjectDetailUseCases = {
  get: projectId => getProject({projectGateway: projectApi}, projectId),
}

export function ProjectDetailComposition({projectId}: {projectId: string}) {
  return <ProjectDetailContainer projectId={projectId} useCases={useCases}/>
}
