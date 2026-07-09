import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal, Pause, Plus, Timer } from 'lucide-react'
import type { Project, WorkRecord } from '../../domain/models'
import { sumWorkHours } from '../../application/metrics'

type WorkRecordsPageProps = {
  projects: Project[]
  workRecords: WorkRecord[]
  time: string
  timerOn: boolean
  onToggleTimer: () => void
  onStopTimer: () => void
  onAdd: () => void
}

export function WorkRecordsPage({projects, workRecords, time, timerOn, onToggleTimer, onStopTimer, onAdd}: WorkRecordsPageProps) {
  const [projectFilter, setProjectFilter] = useState('all')
  const filteredRecords = workRecords.filter(record => projectFilter === 'all' || record.project === projectFilter)
  const totalHours = sumWorkHours(filteredRecords)
  const weeklyHours = [6.5, 7, 7.5, 5.5, 6, 0, 0]
  const weekDays = ['月', '火', '水', '木', '金', '土', '日']

  return <div className="work-page">
    <div className="work-titlebar">
      <div><p className="eyebrow">WORK LOG</p><h1>稼働記録</h1><p>作業時間を記録して、案件ごとの稼働状況を把握します。</p></div>
      <button className="add-btn" onClick={onAdd}><Plus size="1.0625rem"/>稼働を追加</button>
    </div>

    <div className="work-summary">
      <article><span>今週の稼働</span><strong>32.5<small> h</small></strong><p><em>+8.3%</em> 先週比</p></article>
      <article><span>今月の稼働</span><strong>126.5<small> h</small></strong><p>目標 182h の 69.5%</p></article>
      <article><span>請求対象</span><strong>118.0<small> h</small></strong><p>未確定 8.5h</p></article>
      <article><span>実質時給</span><strong>¥6,868</strong><p><em>+4.2%</em> 先月比</p></article>
    </div>

    <div className="work-overview-grid">
      <section className="work-chart-card">
        <div className="work-section-head"><div><h2>週間の稼働時間</h2><p>6月29日 — 7月5日</p></div><div className="week-nav"><button aria-label="前の週"><ChevronLeft size="1rem"/></button><button aria-label="次の週"><ChevronRight size="1rem"/></button></div></div>
        <div className="work-chart">{weeklyHours.map((hours,index)=><div className="work-bar-column" key={weekDays[index]}><span>{hours ? hours+'h' : ''}</span><div><i style={{height:(hours/8*100)+'%'}} className={index===3?'today':''}/></div><b>{weekDays[index]}</b></div>)}</div>
      </section>
      <section className={'work-live-timer '+(timerOn?'running':'')}>
        <div className="work-section-head"><div><h2><Timer size="1.0625rem"/>タイムトラッカー</h2><p>{timerOn?'計測中':'一時停止'}</p></div><span className="live-dot"/></div>
        <div className="work-timer-project"><i style={{background:projects[0].color}}/><div><strong>SaaS リニューアル</strong><span>Nova Works · API設計</span></div></div>
        <strong className="work-timer-time">{time}</strong>
        <div className="work-timer-actions"><button onClick={onToggleTimer}>{timerOn?<Pause size="1.0625rem"/>:<span className="play"/>}{timerOn?'一時停止':'再開する'}</button><button onClick={onStopTimer}>終了</button></div>
      </section>
    </div>

    <section className="work-records-panel">
      <div className="work-records-head"><div><h2>稼働履歴</h2><p>直近の記録を確認・編集できます。</p></div><div className="work-record-filter"><button className={projectFilter==='all'?'active':''} onClick={()=>setProjectFilter('all')}>すべて</button>{projects.map(project=><button className={projectFilter===project.id?'active':''} onClick={()=>setProjectFilter(project.id)} key={project.id}><i style={{background:project.color}}/>{project.name}</button>)}</div></div>
      <div className="work-table">
        <div className="work-table-row header"><span>日付</span><span>案件・作業内容</span><span>時間</span><span>稼働時間</span><span>状態</span><span/></div>
        {filteredRecords.map(record => {const project=projects.find(item=>item.id===record.project)!;return <div className="work-table-row" key={record.id}><span>{record.date}</span><span className="work-record-project"><i style={{background:project.color}}/><span><strong>{record.label}</strong><small>{project.name} · {project.client}</small></span></span><span>{record.start} — {record.end}</span><strong>{record.hours.toFixed(1)}h</strong><span className={'record-status '+record.status}>{record.status==='confirmed'?'確定':'下書き'}</span><button aria-label="その他"><MoreHorizontal size="1.0625rem"/></button></div>})}
      </div>
      <div className="work-records-footer"><span>{filteredRecords.length}件の記録</span><strong>合計 {totalHours.toFixed(1)}時間</strong></div>
    </section>
  </div>
}
