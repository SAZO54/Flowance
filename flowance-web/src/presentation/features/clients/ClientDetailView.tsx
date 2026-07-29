'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Clock3,
  CalendarDays,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  StickyNote,
  UserRound,
} from 'lucide-react'
import {useAuthSession} from '@/presentation/providers/AuthSessionProvider'
import type {ClientListItem} from '@/domain/client'

type ClientDetailViewProps = {
  client: ClientListItem | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

function formatDateTime(value: string, timezone: string, hour12: boolean): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12,
  }).format(date)
}

function DetailIcon({client}: {client: ClientListItem}) {
  const showImage = client.icon.type === 'UPLOADED'
    && client.icon.status === 'READY'
    && client.icon.url
  return <div className="client-detail-logo entity-default-icon" aria-hidden="true" style={{
    color: client.icon.textColor,
    background: client.icon.backgroundColor,
  }}>
    {showImage ? <img src={client.icon.url ?? ''} alt=""/> : client.icon.defaultText}
  </div>
}

export function ClientDetailView({client, isLoading, error, onRetry}: ClientDetailViewProps) {
  const {context} = useAuthSession()
  const timezone = context?.appearance.timezone ?? 'Asia/Tokyo'
  const hour12 = context?.appearance.timeFormat === 'H12'
  if (isLoading) return <div className="client-detail-state" role="status"><RefreshCw/><p>クライアントを読み込んでいます</p></div>
  if (error) return <div className="client-detail-state" role="alert"><UserRound/><h1>クライアントを表示できません</h1><p>{error}</p><button type="button" onClick={onRetry}><RefreshCw size="0.875rem"/>再読み込み</button><Link href="/client"><ArrowLeft size="0.875rem"/>一覧へ戻る</Link></div>
  if (!client) return null
  const canEdit = Boolean(context?.permissions.includes('clients:update'))

  return <div className="client-detail-page">
    <div className="client-detail-actions-row"><Link className="client-detail-back" href="/client"><ArrowLeft size="1rem"/>クライアント一覧</Link>{canEdit && <Link className="client-detail-edit" href={`/client/${client.id}/edit`}><Pencil size="0.9375rem"/>編集</Link>}</div>
    <section className="client-detail-hero">
      <div className="client-detail-identity">
        <DetailIcon client={client}/>
        <div>
          <div className="client-detail-heading"><h1>{client.name}</h1><span className={`client-status ${client.status.toLowerCase()}`}>{client.status === 'ACTIVE' ? '取引中' : '取引終了'}</span></div>
        </div>
      </div>
    </section>

    <div className="client-detail-api-layout">
      <section className="client-detail-panel">
        <div className="client-detail-panel-head"><div><h2>連絡先情報</h2><p>登録されている取引先情報</p></div></div>
        <dl className="client-detail-contact">
          <div><dt><UserRound size="0.9375rem"/>担当者</dt><dd>{client.contactName || '未設定'}</dd></div>
          <div><dt><Mail size="0.9375rem"/>メールアドレス</dt><dd>{client.email ? <a href={`mailto:${client.email}`}>{client.email}</a> : '未設定'}</dd></div>
          <div><dt><Phone size="0.9375rem"/>電話番号</dt><dd>{client.phone ? <a href={`tel:${client.phone}`}>{client.phone}</a> : '未設定'}</dd></div>
          <div><dt><MapPin size="0.9375rem"/>住所</dt><dd>{client.postalCode && <span>〒{client.postalCode}<br/></span>}{client.address || '未設定'}</dd></div>
        </dl>
      </section>

      <aside className="client-detail-side">
        <section className="client-detail-note">
          <h2><StickyNote size="0.9375rem"/>備考</h2>
          <p>{client.notes || '備考は登録されていません。'}</p>
        </section>
        <section className="client-detail-panel">
          <div className="client-detail-panel-head"><div><h2>登録情報</h2><p>システム管理情報</p></div></div>
          <dl className="client-detail-contact">
            <div><dt><CalendarDays size="0.9375rem"/>登録日時</dt><dd>{formatDateTime(client.createdAt, timezone, hour12)}</dd></div>
            <div><dt><Clock3 size="0.9375rem"/>更新日時</dt><dd>{formatDateTime(client.updatedAt, timezone, hour12)}</dd></div>
          </dl>
        </section>
      </aside>
    </div>
  </div>
}
