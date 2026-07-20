import type {ProjectListQuery, ProjectListResult} from '@/domain/project'

export interface ProjectQueryGateway {
  listProjects(query: ProjectListQuery): Promise<ProjectListResult>
}
