'use client'

import {useCallback, useEffect, useState} from 'react'
import type {DashboardData, DashboardRange} from '@/domain/dashboard'
import {DashboardView} from '@/presentation/pages/DashboardView'

export type DashboardUseCases = {
  load: (range: DashboardRange) => Promise<DashboardData>
}

function dashboardRange(now = new Date()): DashboardRange {
  const todayFrom = new Date(now)
  todayFrom.setHours(0, 0, 0, 0)
  const todayTo = new Date(todayFrom)
  todayTo.setDate(todayTo.getDate() + 1)
  const monthFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthTo = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return {
    todayFrom: todayFrom.toISOString(),
    todayTo: todayTo.toISOString(),
    monthFrom: monthFrom.toISOString(),
    monthTo: monthTo.toISOString(),
  }
}

export function DashboardContainer({useCases}: {useCases: DashboardUseCases}) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setData(null)
    setHasLoaded(false)
    setIsLoading(true)
    setError(null)
    try {
      setData(await useCases.load(dashboardRange()))
      setHasLoaded(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ダッシュボードを取得できませんでした。')
    } finally {
      setIsLoading(false)
    }
  }, [useCases])

  useEffect(() => {
    void load()
  }, [load])

  return <DashboardView
    data={data}
    hasLoaded={hasLoaded}
    isLoading={isLoading}
    error={error}
    onRetry={() => void load()}
  />
}
