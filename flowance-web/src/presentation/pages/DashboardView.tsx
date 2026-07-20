import Link from 'next/link'
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  ReceiptText,
  RefreshCw,
} from 'lucide-react'
import type {DateTimePreferences} from '@/domain/dateTime'
import type {DashboardData} from '@/domain/dashboard'
import type {ProjectListItem} from '@/domain/project'

type DashboardViewProps = {
  data: DashboardData | null
  hasLoaded: boolean
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (!hours) return `${remainder}分`
  return remainder ? `${hours}時間${remainder}分` : `${hours}時間`
}

function durationMinutes(startAt: string, endAt: string): number {
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()
  return Number.isFinite(start) && Number.isFinite(end)
    ? Math.max(0, Math.round((end - start) / 60_000))
    : 0
}

function formatTime(value: string, preferences: DateTimePreferences): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: preferences.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: preferences.timeFormat === 'H12',
  }).format(date)
}

function formatDate(value: string | Date, timezone: string): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date)
}

function greeting(timezone: string): string {
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(new Date()))
  if (hour < 11) return 'おはようございます'
  if (hour < 18) return 'こんにちは'
  return 'こんばんは'
}

function ProjectIcon({project}: {project: ProjectListItem}) {
  const showImage = project.icon.type === 'UPLOADED'
    && project.icon.status === 'READY'
    && project.icon.url
  return <span className="dashboard-project-icon entity-default-icon" aria-hidden="true" style={{
    color: project.icon.textColor,
    background: project.icon.backgroundColor,
  }}>{showImage ? <img src={project.icon.url ?? ''} alt=""/> : project.icon.defaultText}</span>
}

export function DashboardView({data, hasLoaded, isLoading, error, onRetry}: DashboardViewProps) {
  const preferences = data?.auth.appearance ?? {
    timezone: 'Asia/Tokyo',
    weekStartsOn: 'MONDAY' as const,
    timeFormat: 'H24' as const,
  }
  const activeRecords = data?.monthWorkRecords.filter(record => record.status !== 'CANCELLED') ?? []
  const monthActualMinutes = activeRecords.reduce((total, record) => total + record.actualMinutes, 0)
  const monthBillableMinutes = activeRecords.reduce((total, record) => total + record.billableMinutes, 0)
  const activeSchedules = data?.todaySchedules.filter(event => event.status !== 'CANCELLED') ?? []
  const todayPlannedMinutes = activeSchedules.reduce(
    (total, event) => total + durationMinutes(event.startAt, event.endAt),
    0,
  )
  const projectById = new Map(data?.projects.map(project => [project.id, project]) ?? [])
  const workMinutesByProject = new Map<string, number>()
  activeRecords.forEach(record => {
    workMinutesByProject.set(
      record.projectId,
      (workMinutesByProject.get(record.projectId) ?? 0) + record.actualMinutes,
    )
  })

  return <div className="dashboard-api-page">
    <section className="dashboard-api-welcome">
      <div>
        <p className="eyebrow">{hasLoaded ? formatDate(new Date(), preferences.timezone) : ''}</p>
        <h1>{hasLoaded ? `${greeting(preferences.timezone)}、${data?.auth.user.displayName ?? ''}さん` : ''}</h1>
        <p>{hasLoaded ? `今日の予定は${activeSchedules.length}件です。` : ''}</p>
      </div>
    </section>

    {isLoading && <div className="dashboard-api-status" role="status"><RefreshCw/><span>ダッシュボードを読み込んでいます</span></div>}
    {!isLoading && error && <div className="dashboard-api-status error" role="alert"><strong>ダッシュボードを取得できませんでした</strong><p>{error}</p><button type="button" onClick={onRetry}><RefreshCw size="0.875rem"/>再読み込み</button></div>}

    <section className="dashboard-api-metrics" aria-busy={isLoading}>
      <article><span><CalendarDays/></span><div><p>今日の予定</p><strong>{hasLoaded ? formatMinutes(todayPlannedMinutes) : ''}</strong><small>{hasLoaded ? `${activeSchedules.length}件` : ''}</small></div></article>
      <article><span><Clock3/></span><div><p>今月の稼働</p><strong>{hasLoaded ? formatMinutes(monthActualMinutes) : ''}</strong><small>{hasLoaded ? `${data?.monthWorkRecordTotal ?? 0}件の実績` : ''}</small></div></article>
      <article><span><ReceiptText/></span><div><p>今月の請求対象</p><strong>{hasLoaded ? formatMinutes(monthBillableMinutes) : ''}</strong><small>{hasLoaded ? 'バックエンド計算値' : ''}</small></div></article>
      <article><span><BriefcaseBusiness/></span><div><p>進行中の案件</p><strong>{hasLoaded ? `${data?.activeProjectTotal ?? 0}件` : ''}</strong><small>{hasLoaded ? 'ACTIVE' : ''}</small></div></article>
    </section>

    <div className="dashboard-api-grid">
      <section className="dashboard-api-panel dashboard-today-panel">
        <div className="dashboard-api-panel-head"><div><h2>今日の予定</h2><p>{hasLoaded ? formatDate(new Date(), preferences.timezone) : ''}</p></div><Link href="/schedule">スケジュールを見る<ArrowRight size="0.875rem"/></Link></div>
        {!hasLoaded || isLoading ? <div className="dashboard-api-panel-empty"/> : activeSchedules.length === 0
          ? <p className="dashboard-api-panel-empty">今日の予定はありません。</p>
          : <div className="dashboard-schedule-list">{activeSchedules.map(event => {
            const project = projectById.get(event.projectId)
            return <article key={event.id}>
              <i style={{background: project?.labelColor ?? '#C3E7F6'}}/>
              <time>{formatTime(event.startAt, preferences)} — {formatTime(event.endAt, preferences)}</time>
              <div><strong>{event.title}</strong><small>{project ? `${project.name} · ${project.client.name}` : ''}</small></div>
              <span>{event.isGenerated ? '定期予定' : '個別予定'}</span>
            </article>
          })}</div>}
      </section>

      <section className="dashboard-api-panel">
        <div className="dashboard-api-panel-head"><div><h2>案件サマリー</h2><p>今月の稼働実績</p></div><Link href="/case">案件一覧<ArrowRight size="0.875rem"/></Link></div>
        {!hasLoaded || isLoading ? <div className="dashboard-api-panel-empty"/> : data?.projects.length === 0
          ? <p className="dashboard-api-panel-empty">進行中の案件はありません。</p>
          : <div className="dashboard-project-list">{data?.projects.slice(0, 5).map(project => <Link href={`/case/${project.id}`} key={project.id}>
            <ProjectIcon project={project}/>
            <span><strong>{project.name}</strong><small>{project.client.name}</small></span>
            <b>{formatMinutes(workMinutesByProject.get(project.id) ?? 0)}</b>
            <ArrowRight size="0.875rem"/>
          </Link>)}</div>}
      </section>

      <section className="dashboard-api-panel dashboard-recent-panel">
        <div className="dashboard-api-panel-head"><div><h2>最近の稼働実績</h2><p>今月の新しい記録</p></div><Link href="/timelog">稼働記録を見る<ArrowRight size="0.875rem"/></Link></div>
        {!hasLoaded || isLoading ? <div className="dashboard-api-panel-empty"/> : activeRecords.length === 0
          ? <p className="dashboard-api-panel-empty">今月の稼働実績はありません。</p>
          : <div className="dashboard-record-list">{activeRecords.slice(0, 5).map(record => {
            const project = projectById.get(record.projectId)
            return <article key={record.id}>
              <i style={{background: project?.labelColor ?? '#C3E7F6'}}/>
              <span><strong>{project?.name ?? ''}</strong><small>{formatDate(record.actualStartAt, preferences.timezone)} · {formatTime(record.actualStartAt, preferences)} — {formatTime(record.actualEndAt, preferences)}</small></span>
              <b>{formatMinutes(record.actualMinutes)}</b>
              <em>{record.status === 'CONFIRMED' ? '確定' : '下書き'}</em>
            </article>
          })}</div>}
      </section>
    </div>
  </div>
}
