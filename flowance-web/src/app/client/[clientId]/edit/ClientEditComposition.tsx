'use client'

import {getClient} from '@/application/clients/getClient'
import {updateClient} from '@/application/clients/updateClient'
import {clientApi} from '@/infrastructure/api/clientApi'
import {
  ClientEditContainer,
  type ClientEditUseCases,
} from '@/presentation/features/clients/ClientEditContainer'

const useCases: ClientEditUseCases = {
  get: clientId => getClient({clientGateway: clientApi}, clientId),
  update: command => updateClient({clientGateway: clientApi}, command),
}

export function ClientEditComposition({clientId}: {clientId: string}) {
  return <ClientEditContainer clientId={clientId} useCases={useCases}/>
}
