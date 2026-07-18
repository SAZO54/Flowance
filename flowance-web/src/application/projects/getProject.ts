import type {ProjectListItem} from '@/domain/project'

export interface ProjectDetailGateway {
  getProject(projectId: string): Promise<ProjectListItem>
}

export function getProject(
  {projectGateway}: {projectGateway: ProjectDetailGateway},
  projectId: string,
): Promise<ProjectListItem> {
  return projectGateway.getProject(projectId)
}
