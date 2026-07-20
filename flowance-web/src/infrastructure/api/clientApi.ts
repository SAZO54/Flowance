import type {ClientListQuery, ClientListResult} from '@/domain/client'
import type {CreateClientCommand, CreateClientResult} from '@/domain/clientCreate'
import type {UpdateClientCommand} from '@/domain/clientUpdate'
import {apiClient, type ApiClient} from './apiClient'

function clientListPath(query: ClientListQuery): string {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    sort: query.sort,
  })
  if (query.query) search.set('query', query.query)
  if (query.status) search.set('status', query.status)
  return `/api/v1/clients?${search.toString()}`
}

function appendNullable(form: FormData, key: string, value: string | null) {
  if (value) form.append(key, value)
}

async function clientForm(command: CreateClientCommand): Promise<FormData> {
  const form = new FormData()
  form.append('name', command.name)
  form.append('status', command.status)
  appendNullable(form, 'contactName', command.contactName)
  appendNullable(form, 'email', command.email)
  appendNullable(form, 'phone', command.phone)
  appendNullable(form, 'postalCode', command.postalCode)
  appendNullable(form, 'address', command.address)
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

export class ClientApi {
  constructor(private readonly client: ApiClient = apiClient) {}

  getClient(clientId: string): Promise<ClientListResult['items'][number]> {
    return this.client.request<ClientListResult['items'][number]>(`/api/v1/clients/${encodeURIComponent(clientId)}`)
  }

  listClients(query: ClientListQuery): Promise<ClientListResult> {
    return this.client.request<ClientListResult>(clientListPath(query))
  }

  async createClient(command: CreateClientCommand): Promise<CreateClientResult> {
    return this.client.request<CreateClientResult>('/api/v1/clients', {
      method: 'POST',
      body: await clientForm(command),
    })
  }

  async updateClient(command: UpdateClientCommand): Promise<ClientListResult['items'][number]> {
    const form = await clientForm(command)
    form.append('version', String(command.version))
    form.append('iconAction', command.iconAction)
    return this.client.request<ClientListResult['items'][number]>(
      `/api/v1/clients/${encodeURIComponent(command.clientId)}`,
      {method: 'PATCH', body: form},
    )
  }
}

export const clientApi = new ClientApi()
