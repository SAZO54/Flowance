'use client'

import {useCallback, useEffect, useState} from 'react'
import type {ProjectListItem} from '@/domain/project'
import {ProjectDetailView} from './ProjectDetailView'

export type ProjectDetailUseCases = {
  get: (projectId: string) => Promise<ProjectListItem>
}

export function ProjectDetailContainer({projectId, useCases}: {
  projectId: string
  useCases: ProjectDetailUseCases
}) {
  const [project, setProject] = useState<ProjectListItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setProject(null)
    setIsLoading(true)
    setError(null)
    try {
      setProject(await useCases.get(projectId))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '案件を取得できませんでした。')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, useCases])

  useEffect(() => {
    void load()
  }, [load])

  return <ProjectDetailView
    project={project}
    isLoading={isLoading}
    error={error}
    onRetry={() => void load()}
  />
}
