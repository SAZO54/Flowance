'use client'

import {useCallback, useEffect, useState} from 'react'
import {workRecordMonthRange} from '@/application/workRecords/monthRange'
import type {ProjectListItem, ProjectListResult} from '@/domain/project'
import type {
  SaveWorkRecordCommand,
  UpdateWorkRecordCommand,
  WorkRecord,
  WorkRecordListQuery,
  WorkRecordListResult,
  WorkRecordPagination,
} from '@/domain/workRecord'
import {
  WorkRecordsApiPage,
  type WorkRecordStatusFilter,
} from '@/presentation/pages/WorkRecordsApiPage'

export type WorkRecordUseCases = {
  loadProjects: () => Promise<ProjectListResult>
  list: (query: WorkRecordListQuery) => Promise<WorkRecordListResult>
  create: (command: SaveWorkRecordCommand) => Promise<WorkRecord>
  update: (command: UpdateWorkRecordCommand) => Promise<WorkRecord>
  delete: (recordId: string, version: number) => Promise<void>
}

const emptyPagination: WorkRecordPagination = {
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
}

type WorkRecordsContainerProps = {
  useCases: WorkRecordUseCases
  shouldOpenCreate?: boolean
}

export function WorkRecordsContainer({useCases, shouldOpenCreate = false}: WorkRecordsContainerProps) {
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [records, setRecords] = useState<WorkRecord[]>([])
  const [pagination, setPagination] = useState<WorkRecordPagination>(emptyPagination)
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<WorkRecordStatusFilter>('ALL')
  const [monthFilter, setMonthFilter] = useState('')
  const [page, setPage] = useState(1)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [editingRecord, setEditingRecord] = useState<WorkRecord | null | undefined>(
    shouldOpenCreate ? null : undefined,
  )

  const load = useCallback(async () => {
    setProjects([])
    setRecords([])
    setPagination({...emptyPagination, page})
    setHasLoaded(false)
    setIsLoading(true)
    setError(null)
    try {
      const [projectResult, recordResult] = await Promise.all([
        useCases.loadProjects(),
        useCases.list({
          ...workRecordMonthRange(monthFilter),
          projectId: projectFilter === 'ALL' ? undefined : projectFilter,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          page,
          pageSize: 20,
        }),
      ])
      setProjects(projectResult.items)
      setRecords(recordResult.items)
      setPagination(recordResult.pagination)
      setHasLoaded(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '稼働記録を取得できませんでした。')
    } finally {
      setIsLoading(false)
    }
  }, [monthFilter, page, projectFilter, statusFilter, useCases])

  useEffect(() => {
    void load()
  }, [load])

  const save = async (command: SaveWorkRecordCommand | UpdateWorkRecordCommand) => {
    setIsSubmitting(true)
    setFormError(null)
    try {
      if ('recordId' in command) await useCases.update(command)
      else await useCases.create(command)
      setEditingRecord(undefined)
      await load()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : '稼働記録を保存できませんでした。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const remove = async (record: WorkRecord) => {
    if (!window.confirm('この稼働記録を取り消しますか？')) return
    setIsSubmitting(true)
    setFormError(null)
    try {
      await useCases.delete(record.id, record.version)
      setEditingRecord(undefined)
      await load()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : '稼働記録を取り消せませんでした。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <WorkRecordsApiPage
    projects={projects}
    records={records}
    pagination={pagination}
    projectFilter={projectFilter}
    statusFilter={statusFilter}
    monthFilter={monthFilter}
    hasLoaded={hasLoaded}
    isLoading={isLoading}
    isSubmitting={isSubmitting}
    error={error}
    formError={formError}
    editingRecord={editingRecord}
    onProjectFilterChange={value => {setProjectFilter(value); setPage(1)}}
    onStatusFilterChange={value => {setStatusFilter(value); setPage(1)}}
    onMonthFilterChange={value => {setMonthFilter(value); setPage(1)}}
    onPageChange={setPage}
    onRetry={() => void load()}
    onOpenCreate={() => {setFormError(null); setEditingRecord(null)}}
    onOpenEdit={record => {setFormError(null); setEditingRecord(record)}}
    onCloseForm={() => setEditingRecord(undefined)}
    onSave={command => void save(command)}
    onDelete={record => void remove(record)}
  />
}
