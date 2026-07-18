'use client'

import {getClient} from '@/application/clients/getClient'
import {clientApi} from '@/infrastructure/api/clientApi'
import {
  ClientDetailContainer,
  type ClientDetailUseCases,
} from '@/presentation/features/clients/ClientDetailContainer'

const useCases: ClientDetailUseCases = {
  get: clientId => getClient({clientGateway: clientApi}, clientId),
}

export function ClientDetailComposition({clientId}: {clientId: string}) {
  return <ClientDetailContainer clientId={clientId} useCases={useCases}/>
}
