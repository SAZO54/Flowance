import Link from 'next/link'
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react'
import type {
  ClientListItem,
  ClientPagination,
  ClientStatus,
} from '@/domain/client'

export type ClientStatusFilter = 'ALL' | ClientStatus

type ClientsPageProps = {
  clients: ClientListItem[]
  pagination: ClientPagination
  query: string
  status: ClientStatusFilter
  hasLoaded: boolean
  isLoading: boolean
  error: string | null
  onQueryChange: (query: string) => void
  onStatusChange: (status: ClientStatusFilter) => void
  onPageChange: (page: number) => void
  onRetry: () => void
  onAdd: () => void
}

const statusTabs: {value: ClientStatusFilter; label: string}[] = [
  {value: 'ALL', label: 'すべて'},
  {value: 'ACTIVE', label: '取引中'},
  {value: 'INACTIVE', label: '取引終了'},
]

function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function ClientIcon({client}: {client: ClientListItem}) {
  const canShowImage = client.icon.type === 'UPLOADED'
    && client.icon.status === 'READY'
    && client.icon.url

  return <span
    className="client-logo"
    style={{
      background: client.icon.backgroundColor,
      color: client.icon.textColor,
    }}
  >
    {canShowImage
      ? <img src={client.icon.url ?? ''} alt=""/>
      : client.icon.defaultText}
  </span>
}

export function ClientsPage({
  clients,
  pagination,
  query,
  status,
  hasLoaded,
  isLoading,
  error,
  onQueryChange,
  onStatusChange,
  onPageChange,
  onRetry,
  onAdd,
}: ClientsPageProps) {
  return <div className="clients-page">
    <div className="clients-titlebar">
      <div>
        <p className="eyebrow">CLIENTS</p>
        <h1>クライアント</h1>
        <p>取引先の基本情報と取引状態を確認できます。</p>
      </div>
      <button type="button" className="add-btn" onClick={onAdd}>
        <Plus size="1.0625rem"/>クライアントを追加
      </button>
    </div>

    <section className="clients-panel" aria-busy={isLoading}>
      <div className="clients-toolbar">
        <div className="client-tabs" aria-label="クライアントステータス">
          {statusTabs.map(tab => <button
            type="button"
            key={tab.value}
            className={status === tab.value ? 'active' : ''}
            onClick={() => onStatusChange(tab.value)}
          >{tab.label}</button>)}
        </div>
        <label className="client-search">
          <Search size="0.9375rem"/>
          <input
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            placeholder="会社名・担当者を検索"
            aria-label="会社名・担当者を検索"
          />
        </label>
      </div>

      {isLoading && <div className="clients-loading" role="status">
        <RefreshCw size="1.25rem" aria-hidden="true"/>
        <span>クライアントを読み込んでいます</span>
      </div>}

      {!isLoading && error && <div className="client-empty clients-error" role="alert">
        <strong>クライアントを読み込めませんでした</strong>
        <p>{error}</p>
        <button type="button" onClick={onRetry}><RefreshCw size="0.875rem"/>再読み込み</button>
      </div>}

      {!isLoading && !error && hasLoaded && clients.length === 0 && <div className="client-empty">
        <Users size="1.5625rem"/>
        <strong>{query || status !== 'ALL' ? '条件に一致するクライアントがありません' : 'クライアントがまだ登録されていません'}</strong>
        <p>{query || status !== 'ALL' ? '検索条件を変更してお試しください。' : '「クライアントを追加」から最初の取引先を登録できます。'}</p>
      </div>}

      {!isLoading && !error && clients.length > 0 && <>
        <div className="client-result-meta">{pagination.totalItems}社のクライアント</div>
        <div className="client-card-grid">{clients.map(client => <Link className="client-card-link" href={`/client/${client.id}`} key={client.id}><article className="client-card">
          <div className="client-card-head">
            <ClientIcon client={client}/>
            <span className={`client-status ${client.status.toLowerCase()}`}>
              {client.status === 'ACTIVE' ? '取引中' : '取引終了'}
            </span>
          </div>
          <div className="client-name">
            <h2>{client.name}</h2>
            {client.contactName && <p>{client.contactName}</p>}
          </div>
          <div className="client-card-contact">
            {client.email && <span><Mail size="0.875rem"/>{client.email}</span>}
            {client.phone && <span><Phone size="0.875rem"/>{client.phone}</span>}
            {client.address && <span><MapPin size="0.875rem"/>{client.address}</span>}
            {!client.email && !client.phone && !client.address && <span><Building2 size="0.875rem"/>連絡先未設定</span>}
          </div>
          <div className="client-card-footer"><span>更新 {formatUpdatedAt(client.updatedAt)}</span><span>詳細を見る<ChevronRight size="0.875rem"/></span></div>
        </article></Link>)}</div>

        {pagination.totalPages > 1 && <nav className="client-pagination" aria-label="クライアント一覧ページ">
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
