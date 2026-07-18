import type {CreateClientCommand, CreateClientResult} from '@/domain/clientCreate'

export interface ClientCommandGateway {
  createClient(command: CreateClientCommand): Promise<CreateClientResult>
}

export type CreateClientDependencies = {
  clientGateway: ClientCommandGateway
}

export function createClient(
  {clientGateway}: CreateClientDependencies,
  command: CreateClientCommand,
): Promise<CreateClientResult> {
  return clientGateway.createClient(command)
}
