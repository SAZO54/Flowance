import type {ClientListItem} from '@/domain/client'
import type {UpdateClientCommand} from '@/domain/clientUpdate'

export interface ClientUpdateGateway {
  updateClient(command: UpdateClientCommand): Promise<ClientListItem>
}

export function updateClient(
  {clientGateway}: {clientGateway: ClientUpdateGateway},
  command: UpdateClientCommand,
): Promise<ClientListItem> {
  return clientGateway.updateClient(command)
}
