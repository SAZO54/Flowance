import type {CreateProjectCommand, CreateProjectResult} from '@/domain/projectCreate'

export interface ProjectCommandGateway {
  createProject(command: CreateProjectCommand): Promise<CreateProjectResult>
}

export type CreateProjectDependencies = {
  projectGateway: ProjectCommandGateway
}

export function createProject(
  {projectGateway}: CreateProjectDependencies,
  command: CreateProjectCommand,
): Promise<CreateProjectResult> {
  return projectGateway.createProject(command)
}
