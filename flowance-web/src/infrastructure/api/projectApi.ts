import type {ProjectListQuery, ProjectListResult} from '@/domain/project'
import type {CreateProjectCommand, CreateProjectResult} from '@/domain/projectCreate'
import type {UpdateProjectCommand} from '@/domain/projectUpdate'
import type {ScheduleProject} from '@/domain/schedule'
import {apiClient, type ApiClient} from './apiClient'

type ProjectListResponse = ProjectListResult

function projectListPath(query: ProjectListQuery): string {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    sort: query.sort,
  })
  if (query.query) search.set('query', query.query)
  if (query.status) search.set('status', query.status)
  return `/api/v1/projects?${search.toString()}`
}

function appendNullable(form: FormData, key: string, value: string | number | null) {
  if (value !== null && value !== '') form.append(key, String(value))
}

async function projectForm(command: CreateProjectCommand): Promise<FormData> {
  const form = new FormData()
  form.append('clientId', command.clientId)
  form.append('name', command.name)
  form.append('labelColor', command.labelColor)
  form.append('status', command.status)
  appendNullable(form, 'description', command.description)
  appendNullable(form, 'startDate', command.startDate)
  appendNullable(form, 'endDate', command.endDate)
  appendNullable(form, 'workloadRate', command.workloadRate)
  appendNullable(form, 'notes', command.notes)
  if (command.iconFile) {
    const content = await command.iconFile.arrayBuffer()
    form.append(
      'iconFile',
      new Blob([content], {type: command.iconFile.type}),
      command.iconFile.name,
    )
  }
  return form
}

export class ProjectApi {
  constructor(private readonly client: ApiClient = apiClient) {}

  getProject(projectId: string): Promise<ProjectListResult['items'][number]> {
    return this.client.request<ProjectListResult['items'][number]>(`/api/v1/projects/${encodeURIComponent(projectId)}`)
  }

  listProjects(query: ProjectListQuery): Promise<ProjectListResult> {
    return this.client.request<ProjectListResponse>(projectListPath(query))
  }

  async createProject(command: CreateProjectCommand): Promise<CreateProjectResult> {
    return this.client.request<CreateProjectResult>('/api/v1/projects', {
      method: 'POST',
      body: await projectForm(command),
    })
  }

  async updateProject(command: UpdateProjectCommand): Promise<ProjectListResult['items'][number]> {
    const form = await projectForm(command)
    form.append('version', String(command.version))
    form.append('iconAction', command.iconAction)
    return this.client.request<ProjectListResult['items'][number]>(
      `/api/v1/projects/${encodeURIComponent(command.projectId)}`,
      {method: 'PATCH', body: form},
    )
  }

  async listScheduleProjects(): Promise<ScheduleProject[]> {
    const response = await this.listProjects({
      page: 1,
      pageSize: 100,
      sort: 'name',
    })
    return response.items.map(project => ({
      id: project.id,
      name: project.name,
      labelColor: project.labelColor,
      status: project.status,
      client: project.client,
    }))
  }
}

export const projectApi = new ProjectApi()
