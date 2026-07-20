import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'
import type {ProjectListItem} from '@/domain/project'
import type {
  SaveWorkRecordCommand,
  UpdateWorkRecordCommand,
  WorkRecord,
  WorkRecordPagination,
  WorkRecordStatus,
} from '@/domain/workRecord'
import {WorkRecordForm} from '@/presentation/features/workRecords/WorkRecordForm'
import {MonthPickerInput} from '@/presentation/components/MonthPickerInput'

export type WorkRecordStatusFilter = 'ALL' | WorkRecordStatus

type WorkRecordsApiPageProps = {
  projects: ProjectListItem[]
  records: WorkRecord[]
  pagination: WorkRecordPagination
  projectFilter: string
  statusFilter: WorkRecordStatusFilter
  monthFilter: string
  hasLoaded: boolean
  isLoading: boolean
  isSubmitting: boolean
  error: string | null
  formError: string | null
  editingRecord: WorkRecord | null | undefined
  onProjectFilterChange: (projectId: string) => void
  onStatusFilterChange: (status: WorkRecordStatusFilter) => void
  onMonthFilterChange: (month: string) => void
  onPageChange: (page: number) => void
  onRetry: () => void
  onOpenCreate: () => void
  onOpenEdit: (record: WorkRecord) => void
  onCloseForm: () => void
  onSave: (command: SaveWorkRecordCommand | UpdateWorkRecordCommand) => void
  onDelete: (record: WorkRecord) => void
}

const statusLabels: Record<WorkRecordStatus, string> = {
  DRAFT: '下書き',
  CONFIRMED: '確定',
  CANCELLED: '取消',
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (!hours) return `${remainder}分`
  return remainder ? `${hours}時間${remainder}分` : `${hours}時間`
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).format(date)
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function WorkRecordsApiPage({
  projects,
  records,
  pagination,
  projectFilter,
  statusFilter,
  monthFilter,
  hasLoaded,
  isLoading,
  isSubmitting,
  error,
  formError,
  editingRecord,
  onProjectFilterChange,
  onStatusFilterChange,
  onMonthFilterChange,
  onPageChange,
  onRetry,
  onOpenCreate,
  onOpenEdit,
  onCloseForm,
  onSave,
  onDelete,
}: WorkRecordsApiPageProps) {
  const projectById = new Map(projects.map(project => [project.id, project]))
  const totalActualMinutes = records.reduce((total, record) => total + record.actualMinutes, 0)
  const totalBreakMinutes = records.reduce((total, record) => total + record.breakMinutes, 0)
  const totalBillableMinutes = records.reduce((total, record) => total + record.billableMinutes, 0)

  return <div className="work-page work-records-api-page">
    <div className="work-titlebar">
      <div><p className="eyebrow">WORK LOG</p><h1>稼働記録</h1><p>実際の作業時間と休憩を登録し、バックエンドで計算された稼働時間を確認します。</p></div>
      <button type="button" className="add-btn" onClick={onOpenCreate} disabled={isLoading || projects.length === 0}><Plus size="1.0625rem"/>稼働実績を追加</button>
    </div>

    <div className="work-summary" aria-busy={isLoading}>
      <article><span>表示中の稼働</span><strong>{hasLoaded ? formatMinutes(totalActualMinutes) : ''}</strong><p>休憩を除いた実績</p></article>
      <article><span>休憩</span><strong>{hasLoaded ? formatMinutes(totalBreakMinutes) : ''}</strong><p>登録された休憩時間</p></article>
      <article><span>請求対象</span><strong>{hasLoaded ? formatMinutes(totalBillableMinutes) : ''}</strong><p>バックエンド計算値</p></article>
      <article><span>記録件数</span><strong>{hasLoaded ? `${pagination.totalItems}件` : ''}</strong><p>現在の絞り込み結果</p></article>
    </div>

    <section className="work-records-panel" aria-busy={isLoading}>
      <div className="work-records-head work-records-api-head">
        <div><h2>稼働履歴</h2><p>登録済みの実績を確認・編集できます。</p></div>
        <div className="work-record-api-filters">
          <label><span>案件</span><select value={projectFilter} onChange={event => onProjectFilterChange(event.target.value)}><option value="ALL">すべて</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label><span>状態</span><select value={statusFilter} onChange={event => onStatusFilterChange(event.target.value as WorkRecordStatusFilter)}><option value="ALL">すべて</option><option value="DRAFT">下書き</option><option value="CONFIRMED">確定</option><option value="CANCELLED">取消</option></select></label>
          <label><span>稼働月</span><span className="work-record-month-control"><MonthPickerInput value={monthFilter} onValueChange={onMonthFilterChange} ariaLabel="稼働月"/><button type="button" disabled={!monthFilter} onClick={() => onMonthFilterChange('')}>すべて</button></span></label>
        </div>
      </div>

      {isLoading && <div className="work-record-api-state" role="status"><RefreshCw/><p>稼働記録を読み込んでいます</p></div>}
      {!isLoading && error && <div className="work-record-api-state error" role="alert"><Clock3/><strong>稼働記録を取得できませんでした</strong><p>{error}</p><button type="button" onClick={onRetry}><RefreshCw size="0.875rem"/>再読み込み</button></div>}
      {!isLoading && !error && hasLoaded && records.length === 0 && <div className="work-record-api-state"><Search/><strong>稼働記録がありません</strong><p>条件を変更するか、「稼働実績を追加」から登録してください。</p></div>}

      {!isLoading && !error && records.length > 0 && <>
        <div className="work-record-api-table" role="table" aria-label="稼働記録一覧">
          <div className="work-record-api-row header" role="row"><span>日付</span><span>案件・備考</span><span>実績時間</span><span>稼働 / 請求対象</span><span>状態</span><span/></div>
          {records.map(record => {
            const project = projectById.get(record.projectId)
            return <div className="work-record-api-row" role="row" key={record.id}>
              <span>{formatDate(record.actualStartAt)}</span>
              <span className="work-record-api-project"><i style={{background: project?.labelColor ?? '#C3E7F6'}}/><span><strong>{project?.name ?? ''}</strong><small>{record.notes ?? project?.client.name ?? ''}</small></span></span>
              <span>{formatTime(record.actualStartAt)} — {formatTime(record.actualEndAt)}<small>休憩 {formatMinutes(record.breakMinutes)}</small></span>
              <strong>{formatMinutes(record.actualMinutes)}<small>請求 {formatMinutes(record.billableMinutes)}</small></strong>
              <span className={`record-status ${record.status.toLowerCase()}`}>{statusLabels[record.status]}</span>
              <button type="button" aria-label={`${project?.name ?? '案件'}の稼働記録を編集`} onClick={() => onOpenEdit(record)}><Pencil size="0.9375rem"/></button>
            </div>
          })}
        </div>
        <div className="work-records-footer"><span>{pagination.totalItems}件の記録</span><strong>表示ページ合計 {formatMinutes(totalActualMinutes)}</strong></div>
        {pagination.totalPages > 1 && <nav className="work-record-api-pagination" aria-label="稼働記録一覧ページ"><button type="button" disabled={!pagination.hasPrevious} onClick={() => onPageChange(pagination.page - 1)}><ChevronLeft size="0.875rem"/>前へ</button><span>{pagination.page} / {pagination.totalPages}</span><button type="button" disabled={!pagination.hasNext} onClick={() => onPageChange(pagination.page + 1)}>次へ<ChevronRight size="0.875rem"/></button></nav>}
      </>}
    </section>

    {editingRecord !== undefined && <WorkRecordForm
      key={editingRecord?.id ?? 'new'}
      projects={projects}
      record={editingRecord}
      isSubmitting={isSubmitting}
      error={formError}
      onCancel={onCloseForm}
      onSave={onSave}
      onDelete={editingRecord ? onDelete : null}
    />}
  </div>
}
