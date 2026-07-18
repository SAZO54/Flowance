'use client'

import {listProjects} from '@/application/projects'
import {projectApi} from '@/infrastructure/api/projectApi'
import {
  ProjectsContainer,
  type ProjectUseCases,
} from '@/presentation/features/projects/ProjectsContainer'

const useCases: ProjectUseCases = {
  list: query => listProjects({projectGateway: projectApi}, query),
}

export function CaseComposition() {
  return <ProjectsContainer useCases={useCases}/>
}
