import React from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { EventItem, Project } from '../../domain/models'
import { filterEventsByProject, percentageOf, sumEventHours } from '../../application/metrics'

type SchedulePageProps = {
  events: EventItem[]
  projects: Project[]
  filter: string
  period: 'week' | 'month'
  onFilterChange: (filter: string) => void
  onPeriodChange: (period: 'week' | 'month') => void
  onAdd: () => void
}

export function SchedulePage({events, projects, filter, period, onFilterChange, onPeriodChange, onAdd}: SchedulePageProps) {
  const visibleEvents = filterEventsByProject(events, filter)
  const totalHours = sumEventHours(visibleEvents)
  const todayEvents = visibleEvents.filter(event => event.day === 3).sort((a, b) => a.start - b.start)

  return <div className="schedule-page">
    <div className="schedule-titlebar">
      <div><p className="eyebrow">SCHEDULE</p><h1>スケジュール</h1><p>案件ごとの予定と実績を、週・月単位で確認できます。</p></div>
      <div className="schedule-actions"><div className="week-nav"><button aria-label="前の週"><ChevronLeft size="1.125rem"/></button><strong>6月29日 — 7月5日</strong><button aria-label="次の週"><ChevronRight size="1.125rem"/></button></div><button className="add-btn" onClick={onAdd}><Plus size="1.0625rem"/>予定を追加</button></div>
    </div>

    <div className="schedule-stats">
      <article><span>今週の予定</span><strong>{visibleEvents.length}<small> 件</small></strong><p>月曜日から日曜日まで</p></article>
      <article><span>予定稼働時間</span><strong>{totalHours}<small> h</small></strong><p>目標 40h の {percentageOf(totalHours, 40)}%</p></article>
      <article><span>実績入力済み</span><strong>{visibleEvents.filter(event => event.actual).length}<small> 件</small></strong><p>完了した予定を反映</p></article>
    </div>

    <div className="schedule-content-grid">
      <section className="calendar-card schedule-calendar">
        <div className="card-head"><div><h2>{period === 'week' ? '今週のカレンダー' : '月間カレンダー'}</h2><p>予定と実績をひとつの場所で。</p></div><div className="segmented"><button className={period==='week'?'active':''} onClick={()=>onPeriodChange('week')}>週</button><button className={period==='month'?'active':''} onClick={()=>onPeriodChange('month')}>月</button></div></div>
        <div className="filters"><button className={filter==='all'?'selected':''} onClick={()=>onFilterChange('all')}>すべて</button>{projects.map(project=><button key={project.id} className={filter===project.id?'selected':''} onClick={()=>onFilterChange(project.id)}><i style={{background:project.color}}/>{project.name}</button>)}</div>
        {period === 'week' ? <WeekCalendar events={visibleEvents} projects={projects}/> : <MonthView/>}
      </section>

      <aside className="day-agenda">
        <div className="agenda-head"><div><p>7月2日</p><h2>木曜日</h2></div><span>{todayEvents.length}件</span></div>
        <div className="agenda-list">{todayEvents.length ? todayEvents.map(event => { const project = projects.find(item => item.id === event.project)!; return <article key={event.id}><i style={{background:project.color}}/><div><time>{event.start}:00 — {event.end}:00</time><strong>{event.label}</strong><span>{project.name} · {project.client}</span></div>{event.actual && <em>実績</em>}</article> }) : <p className="agenda-empty">この日の予定はありません。</p>}</div>
        <button onClick={onAdd}><Plus size="1rem"/>この日に予定を追加</button>
      </aside>
    </div>
  </div>
}

export function WeekCalendar({events,projects}:{events:EventItem[];projects:Project[]}) {
  const days = [['月','29'],['火','30'],['水','1'],['木','2'],['金','3'],['土','4'],['日','5']]
  const hours = [9,10,11,12,13,14,15,16,17]
  return <div className="week-calendar"><div className="calendar-header"><div/>{days.map(([d,n],i)=><div className={(i===3?'today ':'')+(i>=5?'weekend':'')} key={d}><span>{d}</span><strong>{n}</strong></div>)}</div><div className="calendar-body"><div className="times">{hours.map(h=><span key={h}>{String(h).padStart(2,'0')}:00</span>)}</div><div className="days-grid">{days.map((_,day)=><div className={'day-col '+(day>=5?'weekend':'')} key={day}>{hours.map(h=><i key={h}/>)}{events.filter(e=>e.day===day).map(e=>{const p=projects.find(x=>x.id===e.project)!; return <div className="event" key={e.id} style={{top:((e.start-9)*3.25+.3125)+'rem',height:((e.end-e.start)*3.25-.5)+'rem',background:p.soft,borderColor:p.color,color:p.color}}><b>{e.start}:00–{e.end}:00</b><span>{e.label}</span>{e.actual&&<em>実績</em>}</div>})}</div>)}</div><div className="now-line"><b>11:32</b><i/></div></div></div>
}

export function MonthView(){return <div className="month-view">{Array.from({length:35},(_,i)=><div className={(i<2||i>31)?'muted':''} key={i}><span>{i<2?29+i:i-1}</span>{[4,8,10,15,18,23,25].includes(i)&&<i/>}{[6,12,17,21,27].includes(i)&&<i className="pink-dot"/>}</div>)}</div>}
