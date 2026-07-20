'use client'

import {useCallback, useEffect, useState} from 'react'
import Link from 'next/link'
import {ArrowLeft, RefreshCw} from 'lucide-react'
import {useRouter} from 'next/navigation'
import type {ClientListItem, ClientListResult} from '@/domain/client'
import type {ProjectListItem} from '@/domain/project'
import type {UpdateProjectCommand} from '@/domain/projectUpdate'
import {ProjectEditForm} from './ProjectEditForm'

export type ProjectEditUseCases = {
  get: (projectId: string) => Promise<ProjectListItem>
  loadClients: () => Promise<ClientListResult>
  update: (command: UpdateProjectCommand) => Promise<ProjectListItem>
}

export function ProjectEditContainer({projectId, useCases}: {
  projectId: string
  useCases: ProjectEditUseCases
}) {
  const router = useRouter()
  const [project, setProject] = useState<ProjectListItem | null>(null)
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setProject(null)
    setClients([])
    setIsLoading(true)
    setError(null)
    try {
      const [projectResult, clientResult] = await Promise.all([
        useCases.get(projectId),
        useCases.loadClients(),
      ])
      setProject(projectResult)
      setClients(clientResult.items)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '案件の編集情報を取得できませんでした。')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, useCases])

  useEffect(() => {
    void load()
  }, [load])

  const save = async (command: UpdateProjectCommand) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const updated = await useCases.update(command)
      router.push(`/case/${updated.id}`)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '案件を更新できませんでした。')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="project-detail-state" role="status"><RefreshCw/><p>案件を読み込んでいます</p></div>
  if (!project) return <div className="project-detail-state" role="alert"><h1>案件を編集できません</h1><p>{error}</p><button type="button" onClick={() => void load()}><RefreshCw size="0.875rem"/>再読み込み</button><Link href="/case"><ArrowLeft size="0.875rem"/>一覧へ戻る</Link></div>

  return <ProjectEditForm
    project={project}
    clients={clients}
    isSubmitting={isSubmitting}
    error={error}
    onCancel={() => router.push(`/case/${project.id}`)}
    onSave={command => void save(command)}
  />
}
