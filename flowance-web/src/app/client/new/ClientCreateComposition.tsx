'use client'

import {createClient} from '@/application/clients/createClient'
import {clientApi} from '@/infrastructure/api/clientApi'
import {
  ClientCreateContainer,
  type ClientCreateUseCases,
} from '@/presentation/features/clients/ClientCreateContainer'

const useCases: ClientCreateUseCases = {
  create: command => createClient({clientGateway: clientApi}, command),
}

export function ClientCreateComposition() {
  return <ClientCreateContainer useCases={useCases}/>
}
