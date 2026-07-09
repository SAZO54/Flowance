import Link from 'next/link'
import { ArrowLeft, BriefcaseBusiness, CalendarDays, CircleDollarSign, FileText, Mail, MoreHorizontal, Pencil, UserRound } from 'lucide-react'
import type { Client, Invoice, InvoiceStatus, Project } from '../../../domain/models'

type ClientDetailProps = { client?: Client; projects: Project[]; invoices: Invoice[]; onEdit: () => void }

const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  paid: '入金済み', pending: '入金待ち', overdue: '期限超過', draft: '下書き',
}

export function ClientDetail({client, projects, invoices, onEdit}: ClientDetailProps) {
  if (!client) return <div className="client-detail-not-found">
    <UserRound size="2rem"/><h1>クライアントが見つかりません</h1>
    <p>削除されたか、URLが正しくない可能性があります。</p>
    <Link href="/client"><ArrowLeft size="1rem"/>一覧へ戻る</Link>
  </div>

  const clientProjects = projects.filter(project => project.clientId === client.id || (!project.clientId && project.client === client.name))
  const clientInvoices = invoices.filter(invoice => invoice.client === client.name)
  const paidAmount = clientInvoices.filter(invoice => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.amount, 0)

  return <div className="client-detail-page">
    <Link className="client-detail-back" href="/client"><ArrowLeft size="1rem"/>クライアント一覧</Link>
    <section className="client-detail-hero">
      <div className="client-detail-identity">
        <div className="client-detail-logo" style={{color:client.color,background:client.soft}}>{client.icon?<img src={client.icon} alt=""/>:client.initials}</div>
        <div><div className="client-detail-heading"><h1>{client.name}</h1><span className={'client-status '+client.status}>{client.status==='active'?'取引中':'取引終了'}</span></div><p>最終取引：{client.lastActivity}</p></div>
      </div>
      <div className="client-detail-actions"><button type="button" onClick={onEdit}><Pencil size="0.9375rem"/>編集</button><button aria-label="その他"><MoreHorizontal size="1.125rem"/></button></div>
    </section>

    <div className="client-detail-summary">
      <article><span><BriefcaseBusiness size="1.125rem"/></span><div><p>案件</p><strong>{client.projects}<small> 件</small></strong></div></article>
      <article><span><CircleDollarSign size="1.125rem"/></span><div><p>累計売上</p><strong>¥{client.revenue.toLocaleString()}</strong></div></article>
      <article><span><FileText size="1.125rem"/></span><div><p>未入金</p><strong className={client.receivable?'has-receivable':''}>¥{client.receivable.toLocaleString()}</strong></div></article>
      <article><span><CalendarDays size="1.125rem"/></span><div><p>入金済み請求</p><strong>¥{paidAmount.toLocaleString()}</strong></div></article>
    </div>

    <div className="client-detail-layout">
      <div className="client-detail-main">
        <section className="client-detail-panel">
          <div className="client-detail-panel-head"><div><h2>案件</h2><p>このクライアントに紐づく案件</p></div><Link href="/case">すべての案件</Link></div>
          <div className="client-detail-projects">{clientProjects.map(project=><article key={project.id}><i style={{background:project.color}}/><div><strong>{project.name}</strong><small>進行中</small></div><span style={{color:project.color,background:project.soft}}>稼働中</span><MoreHorizontal size="1rem"/></article>)}</div>
          {!clientProjects.length&&<p className="client-detail-empty">紐づく案件はまだありません。</p>}
        </section>
        <section className="client-detail-panel">
          <div className="client-detail-panel-head"><div><h2>請求履歴</h2><p>直近の請求書と入金状況</p></div><Link href="/invoice">すべての請求書</Link></div>
          <div className="client-detail-invoices">{clientInvoices.map(invoice=><div key={invoice.id}><span><FileText size="1rem"/><span><strong>{invoice.id}</strong><small>{invoice.project}</small></span></span><span>{invoice.issueDate}</span><span className={'invoice-status '+invoice.status}>{invoiceStatusLabels[invoice.status]}</span><strong>¥{invoice.amount.toLocaleString()}</strong></div>)}</div>
          {!clientInvoices.length&&<p className="client-detail-empty">請求履歴はまだありません。</p>}
        </section>
      </div>
      <aside className="client-detail-side">
        <section className="client-detail-panel">
          <div className="client-detail-panel-head"><div><h2>基本情報</h2><p>連絡先情報</p></div></div>
          <dl className="client-detail-contact"><div><dt><UserRound size="0.9375rem"/>担当者</dt><dd>{client.contact}</dd></div><div><dt><Mail size="0.9375rem"/>メールアドレス</dt><dd><a href={`mailto:${client.email}`}>{client.email}</a></dd></div></dl>
        </section>
        <section className="client-detail-note"><h2>メモ</h2><p>次回の定例で今後の案件スケジュールを確認する。</p><button><Pencil size="0.875rem"/>メモを編集</button></section>
      </aside>
    </div>
  </div>
}