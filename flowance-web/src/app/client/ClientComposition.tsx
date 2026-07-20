'use client'

import {listClients} from '@/application/clients'
import {clientApi} from '@/infrastructure/api/clientApi'
import {
  ClientsContainer,
  type ClientUseCases,
} from '@/presentation/features/clients/ClientsContainer'

const useCases: ClientUseCases = {
  list: query => listClients({clientGateway: clientApi}, query),
}

export function ClientComposition() {
  return <ClientsContainer useCases={useCases}/>
}
