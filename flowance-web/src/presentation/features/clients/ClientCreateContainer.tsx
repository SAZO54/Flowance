'use client'

import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import type {CreateClientCommand, CreateClientResult} from '@/domain/clientCreate'
import {useAuthSession} from '@/presentation/providers/AuthSessionProvider'
import {ClientCreate} from './ClientCreate'

export type ClientCreateUseCases = {
  create: (command: CreateClientCommand) => Promise<CreateClientResult>
}

export function ClientCreateContainer({useCases}: {useCases: ClientCreateUseCases}) {
  const router = useRouter()
  const {context} = useAuthSession()
  const canCreate = Boolean(context?.permissions.includes('clients:create'))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!canCreate) router.replace('/client')
  }, [canCreate, router])


  const submit = async (command: CreateClientCommand) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await useCases.create(command)
      router.push('/client')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'クライアントを登録できませんでした。')
    } finally {
      setIsSubmitting(false)
    }
  }
  if (!canCreate) return null


  return <ClientCreate
    isSubmitting={isSubmitting}
    error={error}
    onCancel={() => router.push('/client')}
    onCreate={command => void submit(command)}
  />
}
