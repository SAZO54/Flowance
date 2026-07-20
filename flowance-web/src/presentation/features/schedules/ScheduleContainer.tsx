'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {dateKeyInTimeZone, timeZoneOffset} from '@/domain/dateTime'
import {useAuthSession} from '@/presentation/providers/AuthSessionProvider'
import type {
  CalendarEvent,
  CreateWorkScheduleCommand,
  CreateWorkScheduleResult,
  ScheduleProject,
  ScheduleWarning,
  UpdateWorkScheduleCommand,
  WorkSchedule,
} from '@/domain/schedule'
import {
  SchedulePage,
  type SchedulePeriod,
} from '@/presentation/pages/SchedulePage'

export type LoadScheduleQuery = {
  anchorDate: string
  period: SchedulePeriod
  filterProjectId: string
  utcOffset: string
  weekStartsOn: 'MONDAY' | 'SUNDAY'
}

export type LoadScheduleResult = {
  events: CalendarEvent[]
  projects: ScheduleProject[]
}

export type ScheduleUseCases = {
  load: (query: LoadScheduleQuery) => Promise<LoadScheduleResult>
  create: (command: CreateWorkScheduleCommand) => Promise<CreateWorkScheduleResult>
  get: (workScheduleId: string) => Promise<WorkSchedule>
  update: (command: UpdateWorkScheduleCommand) => Promise<CreateWorkScheduleResult>
  delete: (workScheduleId: string, version: number) => Promise<void>
}

export type ScheduleContainerProps = {
  useCases: ScheduleUseCases
}

function scheduleErrorMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : 'スケジュールを取得できませんでした。時間をおいて再度お試しください。'
}

export function ScheduleContainer({useCases}: ScheduleContainerProps) {
  const {context} = useAuthSession()
  const appearance = context?.appearance ?? {
    timezone: 'Asia/Tokyo',
    weekStartsOn: 'MONDAY' as const,
    timeFormat: 'H24' as const,
    compactMode: false,
  }
  const today = useMemo(
    () => dateKeyInTimeZone(new Date(), appearance.timezone),
    [appearance.timezone],
  )
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [projects, setProjects] = useState<ScheduleProject[]>([])
  const [filterProjectId, setFilterProjectId] = useState('all')
  const [period, setPeriod] = useState<SchedulePeriod>('week')
  const [anchorDate, setAnchorDate] = useState(today)
  const [selectedDate, setSelectedDate] = useState(today)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const {load, create, get, update, delete: remove} = useCases

  const refresh = useCallback(async () => {
    const currentRequestId = ++requestId.current
    setIsLoading(true)
    setError(null)

    try {
      const result = await load({
        anchorDate,
        period,
        filterProjectId,
        utcOffset: timeZoneOffset(appearance.timezone, anchorDate),
        weekStartsOn: appearance.weekStartsOn,
      })
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
  }, [
    anchorDate,
    appearance.timezone,
    appearance.weekStartsOn,
    filterProjectId,
    load,
    period,
  ])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createWorkSchedule = useCallback(async (
    command: CreateWorkScheduleCommand,
  ): Promise<ScheduleWarning[]> => {
    setIsMutating(true)
    try {
      const result = await create(command)
      await refresh()
      return result.warnings
    } finally {
      setIsMutating(false)
    }
  }, [create, refresh])

  const updateWorkSchedule = useCallback(async (
    command: UpdateWorkScheduleCommand,
  ): Promise<ScheduleWarning[]> => {
    setIsMutating(true)
    try {
      const result = await update(command)
      await refresh()
      return result.warnings
    } finally {
      setIsMutating(false)
    }
  }, [refresh, update])

  const deleteWorkSchedule = useCallback(async (
    workScheduleId: string,
    version: number,
  ): Promise<void> => {
    setIsMutating(true)
    try {
      await remove(workScheduleId, version)
      await refresh()
    } finally {
      setIsMutating(false)
    }
  }, [refresh, remove])

  return (
    <SchedulePage
      preferences={appearance}
      events={events}
      projects={projects}
      filterProjectId={filterProjectId}
      period={period}
      anchorDate={anchorDate}
      selectedDate={selectedDate}
      hasLoaded={hasLoaded}
      isLoading={isLoading}
      isMutating={isMutating}
      error={error}
      onFilterChange={setFilterProjectId}
      onPeriodChange={setPeriod}
      onAnchorDateChange={setAnchorDate}
      onSelectedDateChange={setSelectedDate}
      onRetry={() => void refresh()}
      onCreate={createWorkSchedule}
      onGet={get}
      onUpdate={updateWorkSchedule}
      onDelete={deleteWorkSchedule}
    />
  )
}
