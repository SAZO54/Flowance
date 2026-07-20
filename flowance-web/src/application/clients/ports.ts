import type {ClientListQuery, ClientListResult} from '@/domain/client'

export interface ClientQueryGateway {
  listClients(query: ClientListQuery): Promise<ClientListResult>
}
