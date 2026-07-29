'use client'

import {useCallback, useEffect, useState} from 'react'
import Link from 'next/link'
import {ArrowLeft, RefreshCw} from 'lucide-react'
import {useRouter} from 'next/navigation'
import type {ClientListItem} from '@/domain/client'
import type {UpdateClientCommand} from '@/domain/clientUpdate'
import {useAuthSession} from '@/presentation/providers/AuthSessionProvider'
import {ClientEditForm} from './ClientEditForm'

export type ClientEditUseCases = {
  get: (clientId: string) => Promise<ClientListItem>
  update: (command: UpdateClientCommand) => Promise<ClientListItem>
}

export function ClientEditContainer({clientId, useCases}: {
  clientId: string
  useCases: ClientEditUseCases
}) {
  const router = useRouter()
  const {context} = useAuthSession()
  const canEdit = Boolean(context?.permissions.includes('clients:update'))
  const [client, setClient] = useState<ClientListItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
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
    if (!canEdit) {
      router.replace(`/client/${clientId}`)
      return
    }
    void load()
  }, [canEdit, clientId, load, router])

  const save = async (command: UpdateClientCommand) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const updated = await useCases.update(command)
      router.push(`/client/${updated.id}`)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'クライアントを更新できませんでした。')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canEdit) return null

  if (isLoading) return <div className="client-detail-state" role="status"><RefreshCw/><p>クライアントを読み込んでいます</p></div>
  if (!client) return <div className="client-detail-state" role="alert"><h1>クライアントを編集できません</h1><p>{error}</p><button type="button" onClick={() => void load()}><RefreshCw size="0.875rem"/>再読み込み</button><Link href="/client"><ArrowLeft size="0.875rem"/>一覧へ戻る</Link></div>

  return <ClientEditForm
    client={client}
    isSubmitting={isSubmitting}
    error={error}
    onCancel={() => router.push(`/client/${client.id}`)}
    onSave={command => void save(command)}
  />
}
