'use client'

import React, {useMemo, useState} from 'react'
import {ChevronLeft, ChevronRight, Plus, Trash2, X} from 'lucide-react'
import {DateTimePickerInput} from '@/presentation/components/DateTimePickerInput'
import {localDateTimeToIso, type DateTimePreferences} from '@/domain/dateTime'
import type {
  CalendarEvent,
  CreateWorkScheduleCommand,
  ScheduleProject,
  ScheduleWarning,
  UpdateWorkScheduleCommand,
  WorkSchedule,
} from '../../domain/schedule'

export type SchedulePeriod = 'week' | 'month'

export type SchedulePageProps = {
  preferences: DateTimePreferences
  events: CalendarEvent[]
  projects: ScheduleProject[]
  filterProjectId: string
  period: SchedulePeriod
  anchorDate: string
  selectedDate: string
  hasLoaded: boolean
  isLoading: boolean
  isMutating: boolean
  error: string | null
  onFilterChange: (id: string) => void
  onPeriodChange: (period: SchedulePeriod) => void
  onAnchorDateChange: (date: string) => void
  onSelectedDateChange: (date: string) => void
  onRetry: () => void
  onCreate: (command: CreateWorkScheduleCommand) => Promise<ScheduleWarning[] | void>
  onGet: (workScheduleId: string) => Promise<WorkSchedule>
  onUpdate: (command: UpdateWorkScheduleCommand) => Promise<ScheduleWarning[] | void>
  onDelete: (workScheduleId: string, version: number) => Promise<void>
}

type ScheduleFormState =
  | {mode: 'create'; startAt: string; endAt: string; showDateInTitle: boolean}
  | {mode: 'edit'; schedule: WorkSchedule; startAt: string; endAt: string}

const DAY_NAMES = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日']
const SHORT_DAYS = ['日', '月', '火', '水', '木', '金', '土']
const pad = (value: number) => String(value).padStart(2, '0')
const parseDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const shiftDays = (value: string, amount: number) => {
  const date = parseDate(value)
  date.setDate(date.getDate() + amount)
  return dateKey(date)
}
const shiftMonths = (value: string, amount: number) => {
  const date = parseDate(value)
  date.setDate(1)
  date.setMonth(date.getMonth() + amount)
  return dateKey(date)
}
const weekStart = (value: string, startsOn: DateTimePreferences['weekStartsOn']) => {
  const day = parseDate(value).getDay()
  return shiftDays(value, -(startsOn === 'SUNDAY' ? day : (day + 6) % 7))
}
const displayDate = (value: string) => new Intl.DateTimeFormat('ja-JP', {month: 'long', day: 'numeric'}).format(parseDate(value))
const zonedParts = (value: string, timezone: string) => new Intl.DateTimeFormat('en-CA', {
  timeZone: timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
}).formatToParts(new Date(value))
const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? ''
const eventDay = (value: string, timezone: string) => {
  const parts = zonedParts(value, timezone)
  return `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}`
}
const eventMinute = (value: string, timezone: string) => {
  const parts = zonedParts(value, timezone)
  return Number(part(parts, 'hour')) * 60 + Number(part(parts, 'minute'))
}
const eventTime = (value: string, preferences: DateTimePreferences) => new Intl.DateTimeFormat('ja-JP', {
  timeZone: preferences.timezone,
  hour: '2-digit',
  minute: '2-digit',
  hour12: preferences.timeFormat === 'H12',
}).format(new Date(value))
const localDateTimeFromIso = (value: string, timezone: string) => {
  const parts = zonedParts(value, timezone)
  return `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}T${part(parts, 'hour')}:${part(parts, 'minute')}`
}
const localDateTime = (dateValue: string, minuteOfDay: number) => {
  const date = parseDate(dateValue)
  date.setMinutes(minuteOfDay)
  return `${dateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const nextHourMinute = (timezone: string) => {
  const parts = zonedParts(new Date().toISOString(), timezone)
  return Math.min(23, Number(part(parts, 'hour')) + 1) * 60
}
const projectOf = (event: CalendarEvent, projects: ScheduleProject[]) => projects.find(project => project.id === event.projectId)
const softColor = (color?: string) => color && /^#[0-9a-f]{6}$/i.test(color) ? `${color}22` : '#E5F2FA'

function mutationError(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback
}

export function SchedulePage(props: SchedulePageProps) {
  const {
    preferences, events, projects, filterProjectId, period, anchorDate, selectedDate,
    hasLoaded, isLoading, isMutating, error, onFilterChange, onPeriodChange,
    onAnchorDateChange, onSelectedDateChange, onRetry, onCreate, onGet,
    onUpdate, onDelete,
  } = props
  const [form, setForm] = useState<ScheduleFormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<ScheduleWarning[]>([])
  const [openingScheduleId, setOpeningScheduleId] = useState<string | null>(null)
  const visible = useMemo(
    () => filterProjectId === 'all' ? events : events.filter(event => event.projectId === filterProjectId),
    [events, filterProjectId],
  )
  const planned = visible.filter(event => event.type === 'SCHEDULE')
  const actual = visible.filter(event => event.type === 'WORK_RECORD')
  const plannedMinutes = planned.reduce(
    (total, event) => total + Math.max(0, (Date.parse(event.endAt) - Date.parse(event.startAt)) / 60_000),
    0,
  )
  const selectedEvents = visible
    .filter(event => eventDay(event.startAt, preferences.timezone) === selectedDate)
    .sort((left, right) => left.startAt.localeCompare(right.startAt))
  const label = period === 'week'
    ? `${displayDate(weekStart(anchorDate, preferences.weekStartsOn))} — ${displayDate(shiftDays(weekStart(anchorDate, preferences.weekStartsOn), 6))}`
    : new Intl.DateTimeFormat('ja-JP', {year: 'numeric', month: 'long'}).format(parseDate(anchorDate))

  const move = (direction: -1 | 1) => {
    const next = period === 'week' ? shiftDays(anchorDate, direction * 7) : shiftMonths(anchorDate, direction)
    onAnchorDateChange(next)
    onSelectedDateChange(next)
  }

  const openCreate = (date = selectedDate, minuteOfDay = 9 * 60, showDateInTitle = true) => {
    onSelectedDateChange(date)
    setWarnings([])
    setFormError(null)
    setForm({
      mode: 'create',
      startAt: localDateTime(date, minuteOfDay),
      endAt: localDateTime(date, minuteOfDay + 60),
      showDateInTitle,
    })
  }

  const openEdit = async (event: CalendarEvent) => {
    if (event.type !== 'SCHEDULE' || openingScheduleId) return
    setOpeningScheduleId(event.id)
    setWarnings([])
    setFormError(null)
    try {
      const schedule = await onGet(event.id)
      onSelectedDateChange(eventDay(schedule.scheduledStartAt, preferences.timezone))
      setForm({
        mode: 'edit',
        schedule,
        startAt: localDateTimeFromIso(schedule.scheduledStartAt, preferences.timezone),
        endAt: localDateTimeFromIso(schedule.scheduledEndAt, preferences.timezone),
      })
    } catch (cause) {
      setFormError(mutationError(cause, '予定の詳細を取得できませんでした。'))
    } finally {
      setOpeningScheduleId(null)
    }
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form) return
    const data = new FormData(event.currentTarget)
    const startAt = String(data.get('scheduledStartAt'))
    const endAt = String(data.get('scheduledEndAt'))
    if (endAt <= startAt) {
      setFormError('終了日時は開始日時より後にしてください。')
      return
    }
    const command: CreateWorkScheduleCommand = {
      projectId: String(data.get('projectId')),
      title: String(data.get('title')).trim(),
      scheduledStartAt: localDateTimeToIso(startAt, preferences.timezone),
      scheduledEndAt: localDateTimeToIso(endAt, preferences.timezone),
      notes: String(data.get('notes')).trim() || null,
    }
    setFormError(null)
    try {
      const result = form.mode === 'edit'
        ? await onUpdate({...command, workScheduleId: form.schedule.id, version: form.schedule.version})
        : await onCreate(command)
      setWarnings(result ?? [])
      setForm(null)
    } catch (cause) {
      setFormError(mutationError(cause, form.mode === 'edit' ? '予定を更新できませんでした。' : '予定を登録できませんでした。'))
    }
  }

  const deleteCurrent = async () => {
    if (form?.mode !== 'edit') return
    if (!window.confirm('この予定を削除しますか？')) return
    setFormError(null)
    try {
      await onDelete(form.schedule.id, form.schedule.version)
      setWarnings([])
      setForm(null)
    } catch (cause) {
      setFormError(mutationError(cause, '予定を削除できませんでした。'))
    }
  }

  return <div className="schedule-page">
    <div className="schedule-titlebar">
      <div><p className="eyebrow">SCHEDULE</p><h1>スケジュール</h1><p>案件ごとの予定と実績を、週・月単位で確認できます。</p></div>
      <div className="schedule-actions"><button className="add-btn" disabled={!hasLoaded || !projects.length} onClick={() => openCreate(selectedDate, 9 * 60, false)}><Plus size="1.0625rem"/>予定を追加</button></div>
    </div>
    <div className="schedule-stats" aria-busy={isLoading}>
      <article><span>表示期間の予定</span><strong>{hasLoaded && !isLoading ? <>{planned.length}<small> 件</small></> : null}</strong><p>登録されている作業予定</p></article>
      <article><span>予定稼働時間</span><strong>{hasLoaded && !isLoading ? <>{Number((plannedMinutes / 60).toFixed(1))}<small> h</small></> : null}</strong><p>休憩時間を含む予定枠</p></article>
      <article><span>実績入力済み</span><strong>{hasLoaded && !isLoading ? <>{actual.length}<small> 件</small></> : null}</strong><p>別データとして登録された実績</p></article>
    </div>
    {warnings.length > 0 && <div className="schedule-warning" role="status">{warnings.map(warning => <p key={`${warning.code}-${warning.targetId ?? warning.message}`}>{warning.message}</p>)}</div>}
    {formError && !form && <div className="schedule-action-error" role="alert">{formError}</div>}
    <div className="schedule-content-grid">
      <section className="calendar-card schedule-calendar">
        <div className="card-head">
          <div><h2>{period === 'week' ? '週間カレンダー' : '月間カレンダー'}</h2><p>予定と実績を別のラベルで表示します。</p></div>
          <div className="calendar-controls">
            <div className="week-nav compact-week-nav"><button aria-label={period === 'week' ? '前の週' : '前の月'} onClick={() => move(-1)}><ChevronLeft size="1.125rem"/></button><strong>{label}</strong><button aria-label={period === 'week' ? '次の週' : '次の月'} onClick={() => move(1)}><ChevronRight size="1.125rem"/></button></div>
            <div className="segmented"><button className={period === 'week' ? 'active' : ''} onClick={() => onPeriodChange('week')}>週</button><button className={period === 'month' ? 'active' : ''} onClick={() => onPeriodChange('month')}>月</button></div>
          </div>
        </div>
        <div className="filters"><button className={filterProjectId === 'all' ? 'selected' : ''} onClick={() => onFilterChange('all')}>すべて</button>{projects.map(project => <button key={project.id} className={filterProjectId === project.id ? 'selected' : ''} onClick={() => onFilterChange(project.id)}><i style={{background: project.labelColor}}/>{project.name}</button>)}</div>
        {!hasLoaded
          ? <div className="schedule-unloaded"/>
          : isLoading
            ? <div className="schedule-state" role="status">スケジュールを読み込んでいます…</div>
            : error
              ? <div className="schedule-state schedule-error" role="alert"><p>{error}</p><button onClick={onRetry}>再読み込み</button></div>
              : period === 'week'
                ? <WeekCalendar preferences={preferences} events={visible} projects={projects} anchorDate={anchorDate} selectedDate={selectedDate} onSelectDate={onSelectedDateChange} onSelectSlot={openCreate} onOpenSchedule={openEdit} openingScheduleId={openingScheduleId}/>
                : <MonthView preferences={preferences} events={visible} projects={projects} anchorDate={anchorDate} selectedDate={selectedDate} onSelectDate={onSelectedDateChange} onCreateForDate={date => openCreate(date, nextHourMinute(preferences.timezone))} onOpenSchedule={openEdit} openingScheduleId={openingScheduleId}/>
        }
      </section>
      <aside className="day-agenda">
        <div className="agenda-head"><div><p>{displayDate(selectedDate)}</p><h2>{DAY_NAMES[parseDate(selectedDate).getDay()]}</h2></div>{hasLoaded && !isLoading && <span>{selectedEvents.length}件</span>}</div>
        <div className="agenda-list">{!hasLoaded || isLoading ? null : selectedEvents.length ? selectedEvents.map(event => <AgendaEvent preferences={preferences} key={`${event.type}-${event.id}`} event={event} project={projectOf(event, projects)} isOpening={openingScheduleId === event.id} onOpenSchedule={openEdit}/>) : <p className="agenda-empty">この日の予定・実績はありません。</p>}</div>
        <button disabled={!hasLoaded || !projects.length} onClick={() => openCreate()}><Plus size="1rem"/>この日に予定を追加</button>
      </aside>
    </div>
    {form && <div className="modal-backdrop" onMouseDown={() => setForm(null)}><div className="modal" onMouseDown={event => event.stopPropagation()}><div className="modal-head"><div><p>{form.mode === 'edit' ? 'EDIT SCHEDULE' : 'NEW SCHEDULE'}</p><h2>{form.mode === 'edit' ? '予定を編集' : form.showDateInTitle ? `${displayDate(selectedDate)}の予定を追加` : '予定を追加'}</h2></div><button aria-label="閉じる" onClick={() => setForm(null)}><X/></button></div><form key={form.mode === 'edit' ? form.schedule.id : form.startAt} onSubmit={submit}>{formError && <p className="form-error" role="alert">{formError}</p>}<label><span className="field-label">案件 <i className="required-symbol">※</i></span><select name="projectId" required defaultValue={form.mode === 'edit' ? form.schedule.projectId : ''}><option value="" disabled>案件を選択</option>{projects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label><label><span className="field-label">作業内容 <i className="required-symbol">※</i></span><input name="title" required data-max-length={200} defaultValue={form.mode === 'edit' ? form.schedule.title : ''}/></label><div className="schedule-form-row"><label><span className="field-label">開始日時 <i className="required-symbol">※</i></span><DateTimePickerInput name="scheduledStartAt" required defaultValue={form.startAt} ariaLabel="開始日時"/></label><label><span className="field-label">終了日時 <i className="required-symbol">※</i></span><DateTimePickerInput name="scheduledEndAt" required defaultValue={form.endAt} ariaLabel="終了日時"/></label></div><label><span className="field-label">メモ</span><textarea name="notes" data-max-length={1000} rows={3} defaultValue={form.mode === 'edit' ? form.schedule.notes ?? '' : ''}/></label>{form.mode === 'edit' && form.schedule.isGenerated && <p className="schedule-generated-note">編集すると、この予定は今後の自動生成で上書きされません。</p>}<div className="modal-actions">{form.mode === 'edit' && <button className="schedule-delete" type="button" disabled={isMutating} onClick={() => void deleteCurrent()}><Trash2 size="1rem"/>削除</button>}<button type="button" disabled={isMutating} onClick={() => setForm(null)}>キャンセル</button><button type="submit" disabled={isMutating}>{isMutating ? '処理中…' : form.mode === 'edit' ? '変更を保存' : '予定に追加'}</button></div></form></div></div>}
  </div>
}

function AgendaEvent({preferences, event, project, isOpening, onOpenSchedule}: {preferences: DateTimePreferences; event: CalendarEvent; project?: ScheduleProject; isOpening: boolean; onOpenSchedule: (event: CalendarEvent) => void}) {
  const color = project?.labelColor ?? '#75A8C7'
  const editable = event.type === 'SCHEDULE'
  const open = () => { if (editable) void onOpenSchedule(event) }
  return <article className={`${editable ? 'editable ' : ''}${isOpening ? 'opening' : ''}`} role={editable ? 'button' : undefined} tabIndex={editable ? 0 : undefined} aria-label={editable ? `${event.title}を編集` : undefined} onClick={open} onKeyDown={keyboardEvent => { if (editable && (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ')) { keyboardEvent.preventDefault(); open() } }}><i style={{background: color}}/><div><time>{eventTime(event.startAt, preferences)} — {eventTime(event.endAt, preferences)}</time><strong>{event.title}</strong><span>{project ? `${project.name} · ${project.client.name}` : '案件情報を取得できませんでした'}</span></div><em>{event.type === 'SCHEDULE' ? '予定' : '実績'}</em></article>
}

type WeekCalendarProps = {
  preferences: DateTimePreferences
  events: CalendarEvent[]
  projects: ScheduleProject[]
  anchorDate: string
  selectedDate: string
  onSelectDate: (date: string) => void
  onSelectSlot: (date: string, minuteOfDay: number) => void
  onOpenSchedule: (event: CalendarEvent) => void
  openingScheduleId: string | null
}

export function WeekCalendar({preferences, events, projects, anchorDate, selectedDate, onSelectDate, onSelectSlot, onOpenSchedule, openingScheduleId}: WeekCalendarProps) {
  const start = weekStart(anchorDate, preferences.weekStartsOn)
  const days = Array.from({length: 7}, (_, index) => shiftDays(start, index))
  const starts = events.map(event => eventMinute(event.startAt, preferences.timezone))
  const ends = events.map(event => eventMinute(event.endAt, preferences.timezone))
  const minHour = starts.length ? Math.min(8, Math.floor(Math.min(...starts) / 60)) : 8
  const maxHour = ends.length ? Math.max(20, Math.ceil(Math.max(...ends) / 60)) : 20
  const hours = Array.from({length: Math.max(1, maxHour - minHour)}, (_, index) => minHour + index)
  const bodyHeight = `${hours.length * 3.25}rem`
  return <div className="week-calendar"><div className="calendar-header"><div/>{days.map(day => { const date = parseDate(day); return <button type="button" className={`${day === selectedDate ? 'today ' : ''}${date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : ''}`} key={day} onClick={() => onSelectDate(day)}><span>{SHORT_DAYS[date.getDay()]}</span><strong>{date.getDate()}</strong></button> })}</div><div className="calendar-body" style={{height: bodyHeight}}><div className="times" style={{gridTemplateRows: `repeat(${hours.length}, 3.25rem)`}}>{hours.map(hour => <span key={hour}>{pad(hour)}:00</span>)}</div><div className="days-grid">{days.map(day => { const date = parseDate(day); return <div className={`day-col ${date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : ''}`} key={day}>{hours.map(hour => <button className="calendar-slot" type="button" key={hour} aria-label={`${displayDate(day)} ${pad(hour)}時の予定を追加`} onClick={mouseEvent => { const minuteOffset = mouseEvent.nativeEvent.offsetY >= mouseEvent.currentTarget.clientHeight / 2 ? 30 : 0; onSelectSlot(day, hour * 60 + minuteOffset) }}/>)}{events.filter(event => eventDay(event.startAt, preferences.timezone) === day).map(event => { const project = projectOf(event, projects); const color = project?.labelColor ?? '#75A8C7'; const from = eventMinute(event.startAt, preferences.timezone); const to = eventMinute(event.endAt, preferences.timezone); const editable = event.type === 'SCHEDULE'; return <button type="button" className={`event ${editable ? 'editable' : 'actual-event'} ${openingScheduleId === event.id ? 'opening' : ''}`} key={`${event.type}-${event.id}`} aria-label={editable ? `${event.title}を編集` : `${event.title}の実績`} aria-busy={openingScheduleId === event.id} onClick={() => editable ? void onOpenSchedule(event) : onSelectDate(day)} style={{top: `${((from - minHour * 60) / 60) * 3.25 + .3125}rem`, height: `${Math.max(.85, ((to - from) / 60) * 3.25 - .5)}rem`, background: softColor(color), borderColor: color, color}}><span className="event-meta"><em>{editable ? '予定' : '実績'}</em><b>{eventTime(event.startAt, preferences)}–{eventTime(event.endAt, preferences)}</b></span><strong className="event-title">{event.title}</strong></button> })}</div> })}</div></div></div>
}

type MonthViewProps = {
  preferences: DateTimePreferences
  events: CalendarEvent[]
  projects: ScheduleProject[]
  anchorDate: string
  selectedDate: string
  onSelectDate: (date: string) => void
  onCreateForDate: (date: string) => void
  onOpenSchedule: (event: CalendarEvent) => void
  openingScheduleId: string | null
}

export function MonthView({preferences, events, projects, anchorDate, selectedDate, onSelectDate, onCreateForDate, onOpenSchedule, openingScheduleId}: MonthViewProps) {
  const anchor = parseDate(anchorDate)
  const first = dateKey(new Date(anchor.getFullYear(), anchor.getMonth(), 1))
  const last = dateKey(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0))
  const start = weekStart(first, preferences.weekStartsOn)
  const count = Math.ceil(((parseDate(last).getTime() - parseDate(start).getTime()) / 86_400_000 + 1) / 7) * 7
  const days = Array.from({length: count}, (_, index) => shiftDays(start, index))
  return <div className="month-view">{days.map(day => {
    const date = parseDate(day)
    const items = events.filter(event => eventDay(event.startAt, preferences.timezone) === day)
    return <div className={`month-day ${date.getMonth() !== anchor.getMonth() ? 'muted ' : ''}${day === selectedDate ? 'selected' : ''}`} key={day}>
      <button type="button" className="month-day-select" aria-label={`${displayDate(day)}の予定を追加`} onClick={() => onCreateForDate(day)}><span>{date.getDate()}</span></button>
      <div className="month-events">{items.slice(0, 3).map(event => {
        const editable = event.type === 'SCHEDULE'
        const color = projectOf(event, projects)?.labelColor ?? '#75A8C7'
        return <button type="button" className={`month-event ${editable ? 'editable' : 'actual-event'} ${openingScheduleId === event.id ? 'opening' : ''}`} key={`${event.type}-${event.id}`} aria-label={editable ? `${event.title}を編集` : `${event.title}の実績`} aria-busy={openingScheduleId === event.id} title={`${eventTime(event.startAt, preferences)} ${event.title}`} onClick={() => editable ? void onOpenSchedule(event) : onSelectDate(day)}><i style={{background: color}}/></button>
      })}{items.length > 3 && <small>+{items.length - 3}</small>}</div>
    </div>
  })}</div>
}
