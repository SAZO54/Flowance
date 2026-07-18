'use client'

import {useCallback, useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import type {ClientListItem, ClientListResult} from '@/domain/client'
import type {CreateProjectCommand, CreateProjectResult} from '@/domain/projectCreate'
import {ProjectCreate} from './ProjectCreate'

export type ProjectCreateUseCases = {
  loadClients: () => Promise<ClientListResult>
  create: (command: CreateProjectCommand) => Promise<CreateProjectResult>
}

export function ProjectCreateContainer({useCases}: {useCases: ProjectCreateUseCases}) {
  const router = useRouter()
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadClients = useCallback(async () => {
    setClients([])
    setIsLoadingClients(true)
    setError(null)
    try {
      const result = await useCases.loadClients()
      setClients(result.items)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'クライアントを取得できませんでした。')
    } finally {
      setIsLoadingClients(false)
    }
  }, [useCases])

  useEffect(() => {
    void loadClients()
  }, [loadClients])

  const submit = async (command: CreateProjectCommand) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await useCases.create(command)
      router.push('/case')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '案件を登録できませんでした。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <ProjectCreate
    clients={clients}
    isLoadingClients={isLoadingClients}
    isSubmitting={isSubmitting}
    error={error}
    onCancel={() => router.push('/case')}
    onAddClient={() => router.push('/client/new')}
    onCreate={command => void submit(command)}
  />
}
