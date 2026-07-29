'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CalendarRange,
  Clock3,
  Pencil,
  RefreshCw,
  StickyNote,
  Users,
} from 'lucide-react'
import type {ProjectContract} from '@/domain/contract'
import type {ProjectListItem, ProjectStatus} from '@/domain/project'
import {useAuthSession} from '@/presentation/providers/AuthSessionProvider'
import {ProjectContractsPanel} from '@/presentation/features/contracts/ProjectContractsPanel'

type ProjectDetailViewProps = {
  project: ProjectListItem | null
  contracts: ProjectContract[]
  canEditContracts: boolean
  isLoading: boolean
  contractsLoading: boolean
  error: string | null
  contractsError: string | null
  onRetry: () => void
  onRetryContracts: () => void
}

const statusLabels: Record<ProjectStatus, string> = {
  ACTIVE: '進行中',
  PAUSED: '一時停止',
  COMPLETED: '完了',
  ARCHIVED: 'アーカイブ',
}

function formatDate(value: string | null): string {
  if (!value) return '未設定'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function formatDateTime(value: string, timezone: string, hour12: boolean): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12,
  }).format(date)
}

function ProjectIcon({project}: {project: ProjectListItem}) {
  const showImage = project.icon.type === 'UPLOADED'
    && project.icon.status === 'READY'
    && project.icon.url

  return <div className="project-detail-logo entity-default-icon" aria-hidden="true" style={{
    color: project.icon.textColor,
    background: project.icon.backgroundColor,
  }}>
    {showImage ? <img src={project.icon.url ?? ''} alt=""/> : project.icon.defaultText}
  </div>
}

export function ProjectDetailView({
  project,
  contracts,
  canEditContracts,
  isLoading,
  contractsLoading,
  error,
  contractsError,
  onRetry,
  onRetryContracts,
}: ProjectDetailViewProps) {
  const {context} = useAuthSession()
  const timezone = context?.appearance.timezone ?? 'Asia/Tokyo'
  const hour12 = context?.appearance.timeFormat === 'H12'
  if (isLoading) return <div className="project-detail-state" role="status"><RefreshCw/><p>案件を読み込んでいます</p></div>
  if (error) return <div className="project-detail-state" role="alert"><BriefcaseBusiness/><h1>案件を表示できません</h1><p>{error}</p><button type="button" onClick={onRetry}><RefreshCw size="0.875rem"/>再読み込み</button><Link href="/case"><ArrowLeft size="0.875rem"/>一覧へ戻る</Link></div>
  const canEditProject = Boolean(context?.permissions.includes('projects:update'))
  if (!project) return null

  return <div className="project-detail-page">
    <div className="project-detail-actions-row"><Link className="project-detail-back" href="/case"><ArrowLeft size="1rem"/>案件一覧</Link>{canEditProject && <Link className="project-detail-edit" href={`/case/${project.id}/edit`}><Pencil size="0.9375rem"/>編集</Link>}</div>
    <section className="project-detail-hero">
      <ProjectIcon project={project}/>
      <div>
        <div className="project-detail-heading">
          <h1>{project.name}</h1>
          <span className={`project-status ${project.status.toLowerCase()}`}>{statusLabels[project.status]}</span>
        </div>
        <Link href={`/client/${project.client.id}`}>{project.client.name}</Link>
      </div>
    </section>

    <div className="project-detail-layout">
      <div className="project-detail-main">
        <section className="project-detail-panel">
          <div className="project-detail-panel-head"><div><h2>案件情報</h2><p>案件の概要と管理条件</p></div></div>
          <dl className="project-detail-fields">
            <div><dt><BriefcaseBusiness size="0.9375rem"/>説明</dt><dd>{project.description || '未設定'}</dd></div>
            <div><dt><CalendarRange size="0.9375rem"/>管理期間</dt><dd>{formatDate(project.startDate)} — {formatDate(project.endDate)}</dd></div>
            <div><dt>ラベルカラー</dt><dd><span className="project-detail-color" style={{background: project.labelColor}}/>{project.labelColor}</dd></div>
          </dl>
        </section>
        <ProjectContractsPanel
          projectId={project.id}
          contracts={contracts}
          canEdit={canEditContracts}
          isLoading={contractsLoading}
          error={contractsError}
          onRetry={onRetryContracts}
        />
      </div>

      <aside className="project-detail-side">
        <section className="project-detail-panel">
          <div className="project-detail-panel-head"><div><h2><Users size="0.9375rem"/>メンバー</h2><p>{project.members.length}名</p></div></div>
          {project.members.length === 0
            ? <p className="project-detail-empty">メンバーは登録されていません。</p>
            : <ul className="project-detail-members">{project.members.map(member => <li key={member.id}><span>{member.displayName}</span><small>{member.role === 'MANAGER' ? '管理者' : 'メンバー'}</small></li>)}</ul>}
        </section>
        <section className="project-detail-note">
          <h2><StickyNote size="0.9375rem"/>備考</h2>
          <p>{project.notes || '備考は登録されていません。'}</p>
        </section>
        <section className="project-detail-panel">
          <div className="project-detail-panel-head"><div><h2>登録情報</h2><p>システム管理情報</p></div></div>
          <dl className="project-detail-system-info">
            <div><dt><CalendarDays size="0.9375rem"/>登録日時</dt><dd>{formatDateTime(project.createdAt, timezone, hour12)}</dd></div>
            <div><dt><Clock3 size="0.9375rem"/>更新日時</dt><dd>{formatDateTime(project.updatedAt, timezone, hour12)}</dd></div>
          </dl>
        </section>
      </aside>
    </div>
  </div>
}
