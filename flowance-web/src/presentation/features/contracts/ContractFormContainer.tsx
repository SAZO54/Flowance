'use client'

import {useCallback, useEffect, useState} from 'react'
import Link from 'next/link'
import {ArrowLeft, RefreshCw} from 'lucide-react'
import {useRouter} from 'next/navigation'
import type {
  ContractUpdateCommand,
  ContractWriteCommand,
  ProjectContract,
} from '@/domain/contract'
import type {ProjectListItem} from '@/domain/project'
import {useAuthSession} from '@/presentation/providers/AuthSessionProvider'
import {ContractForm} from './ContractForm'

export type ContractFormUseCases = {
  getProject: (projectId: string) => Promise<ProjectListItem>
  getContract?: (projectId: string, contractId: string) => Promise<ProjectContract>
  create?: (command: ContractWriteCommand) => Promise<ProjectContract>
  update?: (command: ContractUpdateCommand) => Promise<ProjectContract>
  delete?: (projectId: string, contractId: string, version: number) => Promise<void>
}

export function ContractFormContainer({
  projectId,
  contractId,
  useCases,
}: {
  projectId: string
  contractId?: string
  useCases: ContractFormUseCases
}) {
  const router = useRouter()
  const {context} = useAuthSession()
  const requiredPermission = contractId ? 'contracts:update' : 'contracts:create'
  const canEdit = Boolean(context?.permissions.includes(requiredPermission))
  const [project, setProject] = useState<ProjectListItem | null>(null)
  const [contract, setContract] = useState<ProjectContract | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [projectResult, contractResult] = await Promise.all([
        useCases.getProject(projectId),
        contractId && useCases.getContract
          ? useCases.getContract(projectId, contractId)
          : Promise.resolve(undefined),
      ])
      setProject(projectResult)
      setContract(contractResult)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '契約情報を取得できませんでした。')
    } finally {
      setIsLoading(false)
    }
  }, [contractId, projectId, useCases])

  useEffect(() => {
    if (!canEdit) {
      router.replace(`/case/${projectId}`)
      return
    }
    void load()
  }, [canEdit, load, projectId, router])
  const back = () => router.push(`/case/${projectId}`)

  const save = async (command: ContractWriteCommand | ContractUpdateCommand) => {
    setIsSubmitting(true)
    setError(null)
    try {
      if ('contractId' in command) {
        if (!useCases.update) throw new Error('契約更新を利用できません。')
        await useCases.update(command)
      } else {
        if (!useCases.create) throw new Error('契約登録を利用できません。')
        await useCases.create(command)
      }
      back()
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '契約を保存できませんでした。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const remove = async () => {
    if (!contract || !useCases.delete || !window.confirm('この契約を削除しますか？')) return
    setIsSubmitting(true)
    setError(null)
    try {
      await useCases.delete(projectId, contract.id, contract.version)
      back()
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '契約を削除できませんでした。最新情報を再取得してください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canEdit) return null

  if (isLoading) return <div className="project-detail-state" role="status"><RefreshCw/><p>契約情報を読み込んでいます</p></div>
  if (!project || (contractId && !contract)) return <div className="project-detail-state" role="alert"><h1>契約を編集できません</h1><p>{error}</p><button type="button" onClick={() => void load()}><RefreshCw size=".875rem"/>再読み込み</button><Link href={`/case/${projectId}`}><ArrowLeft size=".875rem"/>案件詳細へ戻る</Link></div>

  return <ContractForm
    project={project}
    contract={contract}
    isSubmitting={isSubmitting}
    error={error}
    onCancel={back}
    onSubmit={command => void save(command)}
    onDelete={contract ? () => void remove() : undefined}
    onReload={() => void load()}
  />
}
