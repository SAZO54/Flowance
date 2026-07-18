import type {ClientListQuery, ClientListResult} from '@/domain/client'
import type {ClientQueryGateway} from './ports'

export type ListClientsDependencies = {
  clientGateway: ClientQueryGateway
}

export function listClients(
  {clientGateway}: ListClientsDependencies,
  query: ClientListQuery,
): Promise<ClientListResult> {
  return clientGateway.listClients(query)
}
