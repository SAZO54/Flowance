'use client'

import {useState} from 'react'
import {useRouter} from 'next/navigation'
import type {CreateClientCommand, CreateClientResult} from '@/domain/clientCreate'
import {ClientCreate} from './ClientCreate'

export type ClientCreateUseCases = {
  create: (command: CreateClientCommand) => Promise<CreateClientResult>
}

export function ClientCreateContainer({useCases}: {useCases: ClientCreateUseCases}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return <ClientCreate
    isSubmitting={isSubmitting}
    error={error}
    onCancel={() => router.push('/client')}
    onCreate={command => void submit(command)}
  />
}
