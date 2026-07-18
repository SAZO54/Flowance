'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  ChevronDown, ChevronRight, CircleDollarSign, Clock3, FileText, MoreHorizontal,
  Pause, Sparkles, Timer, X
} from 'lucide-react'
import type { Client, Project } from '../domain/models'
import { InMemoryFlowanceRepository } from '../infrastructure/InMemoryFlowanceRepository'
import { ClientDetail } from '../presentation/features/clients/ClientDetail'
import { ClientEdit, type ClientEditValues } from '../presentation/features/clients/ClientEdit'
import { AppShell } from '../presentation/layout/AppShell'
import { AnalyticsPage } from '../presentation/pages/AnalyticsPage'
import { FinancePage } from '../presentation/pages/FinancePage'
import { InvoicesPage } from '../presentation/pages/InvoicesPage'
import { SettingsPage } from '../presentation/pages/SettingsPage'
import { WorkRecordsPage } from '../presentation/pages/WorkRecordsPage'

const repository = new InMemoryFlowanceRepository()
const {clients: initialClients, financeTransactions, initialEvents, invoices, projects: initialProjects, workRecords} = repository.getSnapshot()

const pathToPage: Record<string, string> = {
  '/dashboard': 'overview', '/case': 'projects', '/timelog': 'work',
  '/client': 'clients', '/setting': 'settings', '/balance': 'finance',
  '/invoice': 'invoices', '/analytics': 'analytics',
}

export function App() {
  const pathname = usePathname()
  const router = useRouter()
  const clientPathParts = pathname.split('/').filter(Boolean)
  const clientId = clientPathParts[0] === 'client' && clientPathParts[1] && clientPathParts[1] !== 'new' ? decodeURIComponent(clientPathParts[1]) : undefined
  const active = pathname.endsWith('/edit') && clientId ? 'client-edit' : clientId ? 'client-detail' : pathToPage[pathname] ?? 'overview'
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [events, setEvents] = useState(initialEvents)
  const [modal, setModal] = useState(false)
  const [timerOn, setTimerOn] = useState(false)
  const [seconds, setSeconds] = useState(5238)

  useEffect(() => {
    const storedClients = window.localStorage.getItem('flowance-clients')
    if (!storedClients) return
    try { setClients(JSON.parse(storedClients) as Client[]) } catch { window.localStorage.removeItem('flowance-clients') }
  }, [])
  useEffect(() => {
    const storedProjects = window.localStorage.getItem('flowance-projects')
    try {
      if (storedProjects) setProjects(JSON.parse(storedProjects) as Project[])
    } catch {
      window.localStorage.removeItem('flowance-projects')
    }
  }, [])

  useEffect(() => {
    if (!timerOn) return
    const id = window.setInterval(() => setSeconds(s => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [timerOn])

  const time = useMemo(() => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  }, [seconds])

  const addWork = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const start = Number(String(fd.get('start')).split(':')[0])
    const end = Number(String(fd.get('end')).split(':')[0])
    setEvents(v => [...v, { id: Date.now(), project: String(fd.get('project')), day: Number(fd.get('day')), start, end, label: String(fd.get('label')) }])
    setModal(false)
  }

  const saveClients = (nextClients: Client[]) => {
    setClients(nextClients)
    window.localStorage.setItem('flowance-clients', JSON.stringify(nextClients))
  }

  const editClient = (values: ClientEditValues) => {
    if (!clientId) return
    const nextClients = clients.map(client => client.id === clientId ? {...client, ...values} : client)
    saveClients(nextClients)
    router.push(`/client/${clientId}`)
  }

  return <AppShell onAddWork={() => setModal(true)}>
        {active === 'work' ? <WorkRecordsPage
          projects={projects}
          workRecords={workRecords}
          time={time}
          timerOn={timerOn}
          onToggleTimer={() => setTimerOn(value => !value)}
          onStopTimer={() => {setTimerOn(false); setSeconds(0)}}
          onAdd={() => setModal(true)}
        /> : active === 'finance' ? <FinancePage projects={projects} financeTransactions={financeTransactions}/> : active === 'invoices' ? <InvoicesPage invoices={invoices}/> : active === 'client-edit' ? <ClientEdit client={clients.find(client => client.id === clientId)} onCancel={() => router.push(clientId ? '/client/' + clientId : '/client')} onSave={editClient}/> : active === 'client-detail' ? <ClientDetail client={clients.find(client => client.id === clientId)} projects={projects} invoices={invoices} onEdit={() => router.push('/client/' + clientId + '/edit')}/> : active === 'analytics' ? <AnalyticsPage projects={projects}/> : active === 'settings' ? <SettingsPage/> : <>
        <div className="welcome"><div><p className="eyebrow">THURSDAY, JULY 2</p><h1>おはよう、あかりさん <span>✦</span></h1><p>今週もいい流れです。予定の <b>68%</b> が完了しています。</p></div></div>

        <div className="metrics">
          <article className="metric mint"><div className="metric-top"><span>今月の売上予定</span><CircleDollarSign size="1.1875rem"/></div><strong>¥1,250,000</strong><p><em>+12.4%</em> 先月比</p><div className="spark"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="metric cream"><div className="metric-top"><span>今月の稼働</span><Clock3 size="1.1875rem"/></div><strong>126.5<small> / 182h</small></strong><div className="progress"><i style={{width:'69.5%'}}/></div><p>残り 55.5時間</p></article>
          <article className="metric bubble"><div className="metric-top"><span>未入金</span><FileText size="1.1875rem"/></div><strong>¥350,000</strong><p><em className="pink">2件</em> 支払待ち</p><div className="invoice-dots"><i/><i/><i/><span/></div></article>
          <article className="metric sage"><div className="metric-top"><span>実質時給</span><Sparkles size="1.1875rem"/></div><strong>¥6,868</strong><p><em>+4.2%</em> 目標 ¥6,500</p><div className="mini-line"><svg viewBox="0 0 180 28"><path d="M2 24 C20 24 22 17 39 18 S62 23 79 13 S104 18 120 9 S148 13 178 2"/></svg></div></article>
        </div>

        <div className="workspace-grid">
          <section className="calendar-card">
            <div className="card-head"><div><h2>スケジュール</h2><p>予定と実績をスケジュール画面で確認できます。</p></div></div>
            <p className="agenda-empty">予定はスケジュール画面で確認できます。</p>
          </section>

          <aside className="right-column">
            <section className={`timer-card ${timerOn?'running':''}`}><div className="timer-head"><span><Timer size="1.125rem"/>タイムトラッカー</span><i>{timerOn?'計測中':'一時停止'}</i></div><p>Nova Works · SaaS リニューアル</p><h3>{time}</h3><div className="timer-actions"><button onClick={()=>setTimerOn(v=>!v)}>{timerOn?<Pause size="1.125rem"/>:<span className="play"/>}{timerOn?'一時停止':'再開する'}</button><button onClick={()=>{setTimerOn(false);setSeconds(0)}}>終了</button></div></section>
            <section className="project-list"><div className="card-head"><div><h2>案件の稼働状況</h2><p>7月の進捗</p></div><button><MoreHorizontal/></button></div>{projects.map((p,i)=>{const vals=[72,58,43];return <div className="project-row" key={p.id}><div className="project-icon" style={{background:p.soft,color:p.color}}>{p.name.slice(0,1)}</div><div className="project-info"><div><strong>{p.name}</strong><span>{[72,46,34][i]} / {[100,80,80][i]}h</span></div><small>{p.client}</small><div className="progress"><i style={{width:vals[i]+'%',background:p.color}}/></div></div></div>})}<button className="all-projects">すべての案件を見る <ChevronRight size="1rem"/></button></section>
          </aside>
        </div>
        </>}

    {modal && <div className="modal-backdrop" onMouseDown={()=>setModal(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><p>NEW WORK SESSION</p><h2>稼働予定を追加</h2></div><button onClick={()=>setModal(false)}><X/></button></div><form onSubmit={addWork}><label>案件<select name="project">{projects.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select><ChevronDown size="1.0625rem"/></label><label>作業内容<input name="label" defaultValue="仕様確認・実装" required/></label><div className="form-row"><label>曜日<select name="day"><option value="0">月曜日</option><option value="1">火曜日</option><option value="2">水曜日</option><option value="3">木曜日</option><option value="4">金曜日</option><option value="5">土曜日</option><option value="6">日曜日</option></select><ChevronDown size="1.0625rem"/></label><label>開始<input type="time" name="start" defaultValue="10:00" required/></label><label>終了<input type="time" name="end" defaultValue="12:00" required/></label></div><div className="modal-actions"><button type="button" onClick={()=>setModal(false)}>キャンセル</button><button type="submit">予定に追加</button></div></form></div></div>}
  </AppShell>
}

