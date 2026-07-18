import type {ProjectListItem} from '@/domain/project'
import type {UpdateProjectCommand} from '@/domain/projectUpdate'

export interface ProjectUpdateGateway {
  updateProject(command: UpdateProjectCommand): Promise<ProjectListItem>
}

export function updateProject(
  {projectGateway}: {projectGateway: ProjectUpdateGateway},
  command: UpdateProjectCommand,
): Promise<ProjectListItem> {
  return projectGateway.updateProject(command)
}
