import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, CircleDollarSign, Clock3, FileText, MoreHorizontal, Plus, Search } from 'lucide-react'
import type { Invoice, InvoiceStatus } from '../../domain/models'

const invoiceStatusLabels: Record<InvoiceStatus,string> = {paid:'入金済み',pending:'入金待ち',overdue:'期限超過',draft:'下書き'}

export function InvoicesPage({invoices}:{invoices: Invoice[]}) {
  const [status, setStatus] = useState<'all' | InvoiceStatus>('all')
  const [query, setQuery] = useState('')
  const visibleInvoices = invoices.filter(invoice => {
    const matchesStatus = status === 'all' || invoice.status === status
    const matchesQuery = (invoice.id + invoice.client + invoice.project).toLowerCase().includes(query.toLowerCase())
    return matchesStatus && matchesQuery
  })

  return <div className="invoices-page">
    <div className="invoices-titlebar">
      <div><p className="eyebrow">INVOICES</p><h1>請求書</h1><p>請求書の発行状況と入金ステータスをまとめて管理します。</p></div>
      <button className="add-btn"><Plus size="1.0625rem"/>請求書を作成</button>
    </div>

    <div className="invoice-summary">
      <article><span className="invoice-summary-icon total"><FileText size="1.125rem"/></span><div><p>今月の請求額</p><strong>¥1,050,000</strong><small>3件の請求書</small></div></article>
      <article><span className="invoice-summary-icon waiting"><Clock3 size="1.125rem"/></span><div><p>未入金</p><strong>¥700,000</strong><small>2件 · 入金待ち</small></div></article>
      <article><span className="invoice-summary-icon overdue">!</span><div><p>期限超過</p><strong>¥350,000</strong><small>1件 · 要確認</small></div></article>
      <article><span className="invoice-summary-icon paid"><CircleDollarSign size="1.125rem"/></span><div><p>今年の入金額</p><strong>¥4,280,000</strong><small>入金率 86.4%</small></div></article>
    </div>

    <section className="invoices-panel">
      <div className="invoices-toolbar">
        <div className="invoice-tabs"><button className={status==='all'?'active':''} onClick={()=>setStatus('all')}>すべて <b>{invoices.length}</b></button><button className={status==='pending'?'active':''} onClick={()=>setStatus('pending')}>入金待ち <b>2</b></button><button className={status==='paid'?'active':''} onClick={()=>setStatus('paid')}>入金済み <b>2</b></button><button className={status==='overdue'?'active':''} onClick={()=>setStatus('overdue')}>期限超過 <b>1</b></button><button className={status==='draft'?'active':''} onClick={()=>setStatus('draft')}>下書き <b>1</b></button></div>
        <label className="invoice-search"><Search size="0.9375rem"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="請求書・取引先を検索"/></label>
      </div>

      <div className="invoice-table">
        <div className="invoice-row header"><span>請求書番号</span><span>取引先・案件</span><span>発行日</span><span>支払期限</span><span>ステータス</span><span>請求額</span><span/></div>
        {visibleInvoices.map(invoice=><div className="invoice-row" key={invoice.id}><strong className="invoice-number"><FileText size="0.9375rem"/>{invoice.id}</strong><span className="invoice-client"><strong>{invoice.client}</strong><small>{invoice.project}</small></span><span>{invoice.issueDate}</span><span className={invoice.status==='overdue'?'overdue-date':''}>{invoice.dueDate}</span><span className={'invoice-status '+invoice.status}>{invoiceStatusLabels[invoice.status]}</span><strong className="invoice-amount">¥{invoice.amount.toLocaleString()}</strong><button aria-label="その他"><MoreHorizontal size="1.0625rem"/></button></div>)}
      </div>
      {!visibleInvoices.length && <div className="invoice-empty"><FileText size="1.5625rem"/><strong>請求書が見つかりません</strong><p>検索条件またはステータスを変更してください。</p></div>}
      <div className="invoice-panel-footer"><span>{visibleInvoices.length}件を表示</span><div><button><ChevronLeft size="0.875rem"/></button><b>1</b><button><ChevronRight size="0.875rem"/></button></div></div>
    </section>
  </div>
}
