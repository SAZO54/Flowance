'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'
import type {
  ClientListItem,
  ClientListQuery,
  ClientListResult,
  ClientPagination,
  ClientStatus,
} from '@/domain/client'
import {ClientsPage, type ClientStatusFilter} from '@/presentation/pages/ClientsPage'
import {useAuthSession} from '@/presentation/providers/AuthSessionProvider'

export type ClientUseCases = {
  list: (query: ClientListQuery) => Promise<ClientListResult>
}

type ClientsContainerProps = {
  useCases: ClientUseCases
}

const emptyPagination: ClientPagination = {
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
}

function readPositiveInteger(value: string | null): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function readStatus(value: string | null): ClientStatusFilter {
  return value === 'ACTIVE' || value === 'INACTIVE' ? value : 'ALL'
}

function clientErrorMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : 'クライアントを取得できませんでした。時間をおいて再度お試しください。'
}

export function ClientsContainer({useCases}: ClientsContainerProps) {
  const {context} = useAuthSession()
  const canCreate = Boolean(context?.permissions.includes('clients:create'))
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get('query') ?? ''
  const status = readStatus(searchParams.get('status'))
  const page = readPositiveInteger(searchParams.get('page'))
  const [searchInput, setSearchInput] = useState(query)
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [pagination, setPagination] = useState<ClientPagination>(emptyPagination)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const replaceSearchParams = useCallback((updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    const serialized = next.toString()
    router.replace(serialized ? `${pathname}?${serialized}` : pathname)
  }, [pathname, router, searchParams])

  useEffect(() => setSearchInput(query), [query])

  useEffect(() => {
    if (searchInput === query) return
    const timer = window.setTimeout(() => {
      replaceSearchParams({query: searchInput.trim() || null, page: null})
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query, replaceSearchParams, searchInput])

  const load = useCases.list
  const refresh = useCallback(async () => {
    const currentRequestId = ++requestId.current
    setClients([])
    setPagination({...emptyPagination, page})
    setIsLoading(true)
    setError(null)

    try {
      const result = await load({
        query: query || undefined,
        status: status === 'ALL' ? undefined : status as ClientStatus,
        page,
        pageSize: 20,
        sort: '-updatedAt',
      })
      if (requestId.current !== currentRequestId) return
      setClients(result.items)
      setPagination(result.pagination)
      setHasLoaded(true)
    } catch (cause) {
      if (requestId.current !== currentRequestId) return
      setError(clientErrorMessage(cause))
      setHasLoaded(true)
    } finally {
      if (requestId.current === currentRequestId) setIsLoading(false)
    }
  }, [load, page, query, status])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return <ClientsPage
    clients={clients}
    pagination={pagination}
    query={searchInput}
    status={status}
    canCreate={canCreate}
    hasLoaded={hasLoaded}
    isLoading={isLoading}
    error={error}
    onQueryChange={setSearchInput}
    onStatusChange={nextStatus => replaceSearchParams({
      status: nextStatus === 'ALL' ? null : nextStatus,
      page: null,
    })}
    onPageChange={nextPage => replaceSearchParams({
      page: nextPage > 1 ? String(nextPage) : null,
    })}
    onRetry={() => void refresh()}
    onAdd={() => router.push('/client/new')}
  />
}
