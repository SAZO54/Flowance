import type {ProjectListQuery, ProjectListResult} from '@/domain/project'
import type {ProjectQueryGateway} from './ports'

export type ListProjectsDependencies = {
  projectGateway: ProjectQueryGateway
}

export function listProjects(
  {projectGateway}: ListProjectsDependencies,
  query: ProjectListQuery,
): Promise<ProjectListResult> {
  return projectGateway.listProjects(query)
}
