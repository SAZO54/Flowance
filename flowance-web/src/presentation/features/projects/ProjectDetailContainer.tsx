'use client'

import {useCallback, useEffect, useState} from 'react'
import type {CurrentAuthContext} from '@/domain/auth'
import type {ContractListResult, ProjectContract} from '@/domain/contract'
import type {ProjectListItem} from '@/domain/project'
import {ProjectDetailView} from './ProjectDetailView'

export type ProjectDetailUseCases = {
  get: (projectId: string) => Promise<ProjectListItem>
  getAuth: () => Promise<CurrentAuthContext>
  listContracts: (projectId: string) => Promise<ContractListResult>
}

export function ProjectDetailContainer({projectId, useCases}: {
  projectId: string
  useCases: ProjectDetailUseCases
}) {
  const [project, setProject] = useState<ProjectListItem | null>(null)
  const [auth, setAuth] = useState<CurrentAuthContext | null>(null)
  const [contracts, setContracts] = useState<ProjectContract[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [contractsLoading, setContractsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contractsError, setContractsError] = useState<string | null>(null)

  const loadContracts = useCallback(async () => {
    setContractsLoading(true)
    setContractsError(null)
    try {
      setContracts((await useCases.listContracts(projectId)).items)
    } catch (cause) {
      setContracts([])
      setContractsError(cause instanceof Error ? cause.message : '契約を取得できませんでした。')
    } finally {
      setContractsLoading(false)
    }
  }, [projectId, useCases])

  const load = useCallback(async () => {
    setProject(null)
    setAuth(null)
    setIsLoading(true)
    setError(null)
    try {
      const [projectResult, authResult] = await Promise.all([
        useCases.get(projectId),
        useCases.getAuth(),
      ])
      setProject(projectResult)
      setAuth(authResult)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '案件を取得できませんでした。')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, useCases])

  useEffect(() => {
    void load()
    void loadContracts()
  }, [load, loadContracts])

  return <ProjectDetailView
    project={project}
    contracts={contracts}
    canEditContracts={Boolean(auth?.permissions.includes('contracts:update'))}
    isLoading={isLoading}
    contractsLoading={contractsLoading}
    error={error}
    contractsError={contractsError}
    onRetry={() => void load()}
    onRetryContracts={() => void loadContracts()}
  />
}
