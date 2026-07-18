'use client'

import {useCallback, useEffect, useState} from 'react'
import type {ClientListItem} from '@/domain/client'
import {ClientDetailView} from './ClientDetailView'

export type ClientDetailUseCases = {
  get: (clientId: string) => Promise<ClientListItem>
}

export function ClientDetailContainer({clientId, useCases}: {
  clientId: string
  useCases: ClientDetailUseCases
}) {
  const [client, setClient] = useState<ClientListItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setClient(null)
    setIsLoading(true)
    setError(null)
    try {
      setClient(await useCases.get(clientId))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'クライアントを取得できませんでした。')
    } finally {
      setIsLoading(false)
    }
  }, [clientId, useCases])

  useEffect(() => {
    void load()
  }, [load])

  return <ClientDetailView client={client} isLoading={isLoading} error={error} onRetry={() => void load()}/>
}
