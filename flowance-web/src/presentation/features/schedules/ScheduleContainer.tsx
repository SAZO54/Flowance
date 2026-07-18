'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {
  CalendarEvent,
  CreateWorkScheduleCommand,
  CreateWorkScheduleResult,
  ScheduleProject,
  ScheduleWarning,
} from '@/domain/schedule'
import {
  SchedulePage,
  type SchedulePeriod,
} from '@/presentation/pages/SchedulePage'

export type LoadScheduleQuery = {
  anchorDate: string
  period: SchedulePeriod
  filterProjectId: string
}

export type LoadScheduleResult = {
  events: CalendarEvent[]
  projects: ScheduleProject[]
}

/**
 * Presentation が利用するスケジュールのユースケース境界。
 * HTTP Adapter ではなく Application 層で組み立てた関数を注入する。
 */
export type ScheduleUseCases = {
  load: (query: LoadScheduleQuery) => Promise<LoadScheduleResult>
  create: (command: CreateWorkScheduleCommand) => Promise<CreateWorkScheduleResult>
}

export type ScheduleContainerProps = {
  useCases: ScheduleUseCases
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function scheduleErrorMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : 'スケジュールを取得できませんでした。時間をおいて再度お試しください。'
}

export function ScheduleContainer({useCases}: ScheduleContainerProps) {
  const today = useMemo(() => formatLocalDate(new Date()), [])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [projects, setProjects] = useState<ScheduleProject[]>([])
  const [filterProjectId, setFilterProjectId] = useState('all')
  const [period, setPeriod] = useState<SchedulePeriod>('week')
  const [anchorDate, setAnchorDate] = useState(today)
  const [selectedDate, setSelectedDate] = useState(today)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const load = useCases.load
  const create = useCases.create

  const refresh = useCallback(async () => {
    const currentRequestId = ++requestId.current
    setIsLoading(true)
    setError(null)

    try {
      const result = await load({anchorDate, period, filterProjectId})
      if (currentRequestId !== requestId.current) return

      setProjects(result.projects)
      setEvents(result.events)
      setHasLoaded(true)
    } catch (cause) {
      if (currentRequestId !== requestId.current) return

      setError(scheduleErrorMessage(cause))
      setHasLoaded(true)
    } finally {
      if (currentRequestId === requestId.current) setIsLoading(false)
    }
  }, [anchorDate, filterProjectId, load, period])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createWorkSchedule = useCallback(async (
    command: CreateWorkScheduleCommand,
  ): Promise<ScheduleWarning[]> => {
    setIsCreating(true)
    setError(null)

    try {
      const result = await create(command)
      await refresh()
      return result.warnings
    } catch (cause) {
      setError(scheduleErrorMessage(cause))
      throw cause
    } finally {
      setIsCreating(false)
    }
  }, [create, refresh])

  return (
    <SchedulePage
      events={events}
      projects={projects}
      filterProjectId={filterProjectId}
      period={period}
      anchorDate={anchorDate}
      selectedDate={selectedDate}
      hasLoaded={hasLoaded}
      isLoading={isLoading}
      isCreating={isCreating}
      error={error}
      onFilterChange={setFilterProjectId}
      onPeriodChange={setPeriod}
      onAnchorDateChange={setAnchorDate}
      onSelectedDateChange={setSelectedDate}
      onRetry={() => void refresh()}
      onCreate={createWorkSchedule}
    />
  )
}
