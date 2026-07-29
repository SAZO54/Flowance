import Link from 'next/link'
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react'
import type {
  ProjectListItem,
  ProjectPagination,
  ProjectStatus,
} from '@/domain/project'

export type ProjectStatusFilter = 'ALL' | ProjectStatus

type ProjectsPageProps = {
  projects: ProjectListItem[]
  pagination: ProjectPagination
  query: string
  status: ProjectStatusFilter
  canCreate: boolean
  hasLoaded: boolean
  isLoading: boolean
  error: string | null
  onQueryChange: (query: string) => void
  onStatusChange: (status: ProjectStatusFilter) => void
  onPageChange: (page: number) => void
  onRetry: () => void
  onAdd: () => void
}

const statusLabels: Record<ProjectStatus, string> = {
  ACTIVE: '進行中',
  PAUSED: '一時停止',
  COMPLETED: '完了',
  ARCHIVED: 'アーカイブ',
}

const statusTabs: {value: ProjectStatusFilter; label: string}[] = [
  {value: 'ALL', label: 'すべて'},
  {value: 'ACTIVE', label: '進行中'},
  {value: 'PAUSED', label: '一時停止'},
  {value: 'COMPLETED', label: '完了'},
  {value: 'ARCHIVED', label: 'アーカイブ'},
]

function formatDate(value: string | null): string {
  return value?.replaceAll('-', '/') ?? '未設定'
}

function formatDateRange(project: ProjectListItem): string {
  if (!project.startDate && !project.endDate) return '未設定'
  return `${formatDate(project.startDate)} — ${formatDate(project.endDate)}`
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function ProjectIcon({project}: {project: ProjectListItem}) {
  const canShowImage = project.icon.type === 'UPLOADED'
    && project.icon.status === 'READY'
    && project.icon.url

  return <span
    className="project-card-icon entity-default-icon"
    aria-hidden="true"
    style={{
      background: project.icon.backgroundColor,
      color: project.icon.textColor,
    }}
  >
    {canShowImage
      ? <img src={project.icon.url ?? ''} alt=""/>
      : project.icon.defaultText}
  </span>
}

export function ProjectsPage({
  projects,
  pagination,
  query,
  canCreate,
  status,
  hasLoaded,
  isLoading,
  error,
  onQueryChange,
  onStatusChange,
  onPageChange,
  onRetry,
  onAdd,
}: ProjectsPageProps) {
  return <div className="projects-page">
    <div className="projects-titlebar">
      <div>
        <p className="eyebrow">PROJECTS</p>
        <h1>案件</h1>
        <p>案件の基本情報、状態、管理期間を確認できます。</p>
      </div>
      {canCreate && <button type="button" className="add-btn" onClick={onAdd}>
        <Plus size="1.0625rem"/>新しい案件
      </button>}
    </div>

    <section className="projects-panel" aria-busy={isLoading}>
      <div className="projects-toolbar">
        <div className="project-tabs" aria-label="案件ステータス">
          {statusTabs.map(tab => <button
            type="button"
            key={tab.value}
            className={status === tab.value ? 'active' : ''}
            onClick={() => onStatusChange(tab.value)}
          >{tab.label}</button>)}
        </div>
        <label className="project-search">
          <Search size="0.9375rem"/>
          <input
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            placeholder="案件・クライアントを検索"
            aria-label="案件・クライアントを検索"
          />
        </label>
      </div>

      {isLoading && <div className="projects-loading" role="status">
        <RefreshCw size="1.25rem" aria-hidden="true"/>
        <span>案件を読み込んでいます</span>
      </div>}

      {!isLoading && error && <div className="projects-empty projects-error" role="alert">
        <strong>案件を読み込めませんでした</strong>
        <p>{error}</p>
        <button type="button" onClick={onRetry}><RefreshCw size="0.875rem"/>再読み込み</button>
      </div>}

      {!isLoading && !error && hasLoaded && projects.length === 0 && <div className="projects-empty">
        <Search size="1.5rem"/>
        <strong>{query || status !== 'ALL' ? '条件に一致する案件がありません' : '案件がまだ登録されていません'}</strong>
        <p>{query || status !== 'ALL' ? '検索条件を変更してお試しください。' : canCreate ? '「新しい案件」から最初の案件を登録できます。' : '登録済みの案件はありません。'}</p>
      </div>}

      {!isLoading && !error && projects.length > 0 && <>
        <div className="project-result-meta">{pagination.totalItems}件の案件</div>
        <div className="project-card-grid">{projects.map(project => <Link className="project-card-link" href={`/case/${project.id}`} key={project.id}>
          <article className="project-card">
          <div className="project-card-head">
            <ProjectIcon project={project}/>
            <span className={`project-status ${project.status.toLowerCase()}`}>
              {statusLabels[project.status]}
            </span>
          </div>
          <div className="project-card-title">
            <h2>{project.name}</h2>
            <p>{project.client.name}</p>
          </div>
          {project.description && <p className="project-card-description">{project.description}</p>}
          <dl>
            <div>
              <dt>管理期間</dt>
              <dd>{formatDateRange(project)}</dd>
            </div>
          </dl>
          <div className="project-card-meta">
            <span><Users size="0.875rem"/>{project.members.length}名</span>
            <span><CalendarRange size="0.875rem"/>更新 {formatUpdatedAt(project.updatedAt)}</span>
          </div>
        </article></Link>)}</div>

        {pagination.totalPages > 1 && <nav className="project-pagination" aria-label="案件一覧ページ">
          <button
            type="button"
            disabled={!pagination.hasPrevious}
            onClick={() => onPageChange(pagination.page - 1)}
          ><ChevronLeft size="0.875rem"/>前へ</button>
          <span>{pagination.page} / {pagination.totalPages}</span>
          <button
            type="button"
            disabled={!pagination.hasNext}
            onClick={() => onPageChange(pagination.page + 1)}
          >次へ<ChevronRight size="0.875rem"/></button>
        </nav>}
      </>}
    </section>
  </div>
}
