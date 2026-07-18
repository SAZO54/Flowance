import type {ClientListItem} from '@/domain/client'

export interface ClientDetailGateway {
  getClient(clientId: string): Promise<ClientListItem>
}

export type GetClientDependencies = {
  clientGateway: ClientDetailGateway
}

export function getClient(
  {clientGateway}: GetClientDependencies,
  clientId: string,
): Promise<ClientListItem> {
  return clientGateway.getClient(clientId)
}
