import React, { useState } from 'react'
import Link from 'next/link'
import { BriefcaseBusiness, ChevronRight, CircleDollarSign, Clock3, MoreHorizontal, Plus, Search, Users } from 'lucide-react'
import type { Client, ClientStatus } from '../../domain/models'

type ClientsPageProps = {
  clients: Client[]
  onAddClient: () => void
}

export function ClientsPage({clients, onAddClient}: ClientsPageProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | ClientStatus>('all')
  const visibleClients = clients.filter(client => {
    const matchesQuery = (client.name + client.contact + client.email).toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (status === 'all' || client.status === status)
  })
  const activeCount = clients.filter(client => client.status === 'active').length
  const inactiveCount = clients.length - activeCount
  const projectCount = clients.reduce((sum, client) => sum + client.projects, 0)
  const totalRevenue = clients.reduce((sum, client) => sum + client.revenue, 0)
  const receivableClients = clients.filter(client => client.receivable > 0)
  const totalReceivable = receivableClients.reduce((sum, client) => sum + client.receivable, 0)

  return <div className="clients-page">
    <div className="clients-titlebar">
      <div><p className="eyebrow">CLIENTS</p><h1>クライアント</h1><p>取引先ごとの案件、売上、請求状況をまとめて管理します。</p></div>
      <button className="add-btn" onClick={onAddClient}><Plus size="1.0625rem"/>クライアントを追加</button>
    </div>

    <div className="client-summary">
      <article><span><Users size="1.125rem"/></span><div><p>クライアント数</p><strong>{clients.length}<small> 社</small></strong><em>うち取引中 {activeCount}社</em></div></article>
      <article><span><BriefcaseBusiness size="1.125rem"/></span><div><p>進行中の案件</p><strong>{projectCount}<small> 件</small></strong><em>今月完了予定 1件</em></div></article>
      <article><span><CircleDollarSign size="1.125rem"/></span><div><p>累計売上</p><strong>¥{totalRevenue.toLocaleString()}</strong><em>今年度</em></div></article>
      <article><span><Clock3 size="1.125rem"/></span><div><p>未入金</p><strong>¥{totalReceivable.toLocaleString()}</strong><em>{receivableClients.length}社 · {receivableClients.length}件</em></div></article>
    </div>

    <section className="clients-panel">
      <div className="clients-toolbar">
        <div className="client-tabs"><button className={status==='all'?'active':''} onClick={()=>setStatus('all')}>すべて <b>{clients.length}</b></button><button className={status==='active'?'active':''} onClick={()=>setStatus('active')}>取引中 <b>{activeCount}</b></button><button className={status==='inactive'?'active':''} onClick={()=>setStatus('inactive')}>取引終了 <b>{inactiveCount}</b></button></div>
        <label className="client-search"><Search size="0.9375rem"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="会社名・担当者を検索"/></label>
      </div>

      <div className="client-card-grid">{visibleClients.map(client=><article className="client-card" key={client.id}>
        <div className="client-card-head"><div className="client-logo" style={{color:client.color,background:client.soft}}>{client.icon?<img src={client.icon} alt=""/>:client.initials}</div><span className={'client-status '+client.status}>{client.status==='active'?'取引中':'取引終了'}</span><button aria-label="その他"><MoreHorizontal size="1.125rem"/></button></div>
        <div className="client-name"><h2>{client.name}</h2><p>{client.contact} · {client.email}</p></div>
        <dl><div><dt>進行中の案件</dt><dd>{client.projects}件</dd></div><div><dt>累計売上</dt><dd>¥{client.revenue.toLocaleString()}</dd></div><div><dt>未入金</dt><dd className={client.receivable?'has-receivable':''}>¥{client.receivable.toLocaleString()}</dd></div></dl>
        <div className="client-activity"><span>最終取引</span><strong>{client.lastActivity}</strong></div>
        <Link className="client-detail-button" href={`/client/${client.id}`}>クライアント詳細 <ChevronRight size="0.9375rem"/></Link>
      </article>)}</div>
      {!visibleClients.length&&<div className="client-empty"><Users size="1.5625rem"/><strong>クライアントが見つかりません</strong><p>検索条件を変更してお試しください。</p></div>}
    </section>

    <section className="client-revenue-ranking">
      <div className="client-ranking-head"><div><h2>クライアント別売上</h2><p>今年度の累計</p></div><button>詳細を見る <ChevronRight size="0.9375rem"/></button></div>
      <div className="client-ranking-list">{clients.slice(0,3).map((client,index)=><div key={client.id}><b>{index+1}</b><span className="ranking-logo" style={{color:client.color,background:client.soft}}>{client.initials}</span><span><strong>{client.name}</strong><small>{client.projects}件の案件</small></span><div className="ranking-bar"><i style={{width:(client.revenue/1720000*100)+'%',background:client.color}}/></div><strong>¥{client.revenue.toLocaleString()}</strong></div>)}</div>
    </section>
  </div>
}