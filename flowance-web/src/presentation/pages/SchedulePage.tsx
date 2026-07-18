'use client'

import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import type { CalendarEvent, CreateWorkScheduleCommand, ScheduleProject, ScheduleWarning } from '../../domain/schedule'

export type SchedulePeriod = 'week' | 'month'
export type SchedulePageProps = {
  events: CalendarEvent[]; projects: ScheduleProject[]; filterProjectId: string
  period: SchedulePeriod; anchorDate: string; selectedDate: string
  hasLoaded: boolean; isLoading: boolean; isCreating: boolean; error: string | null
  onFilterChange: (id: string) => void; onPeriodChange: (period: SchedulePeriod) => void
  onAnchorDateChange: (date: string) => void; onSelectedDateChange: (date: string) => void
  onRetry: () => void
  onCreate: (command: CreateWorkScheduleCommand) => Promise<ScheduleWarning[] | void>
}

const TZ = 'Asia/Tokyo'
const DAY_NAMES = ['日曜日','月曜日','火曜日','水曜日','木曜日','金曜日','土曜日']
const SHORT_DAYS = ['日','月','火','水','木','金','土']
const parseDate = (value: string) => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d) }
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
const shiftDays = (value: string, amount: number) => { const d=parseDate(value); d.setDate(d.getDate()+amount); return dateKey(d) }
const shiftMonths = (value: string, amount: number) => { const d=parseDate(value); d.setDate(1); d.setMonth(d.getMonth()+amount); return dateKey(d) }
const weekStart = (value: string) => shiftDays(value, -((parseDate(value).getDay()+6)%7))
const displayDate = (value: string) => new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric'}).format(parseDate(value))
const zonedParts = (value: string) => new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value))
const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) => parts.find(item=>item.type===type)?.value ?? ''
const eventDay = (value: string) => { const p=zonedParts(value); return `${part(p,'year')}-${part(p,'month')}-${part(p,'day')}` }
const eventMinute = (value: string) => { const p=zonedParts(value); return Number(part(p,'hour'))*60+Number(part(p,'minute')) }
const eventTime = (value: string) => new Intl.DateTimeFormat('ja-JP',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value))
const projectOf = (event: CalendarEvent, projects: ScheduleProject[]) => projects.find(project=>project.id===event.projectId)
const softColor = (color?: string) => color && /^#[0-9a-f]{6}$/i.test(color) ? `${color}22` : '#E5F2FA'

export function SchedulePage(props: SchedulePageProps) {
  const {events,projects,filterProjectId,period,anchorDate,selectedDate,hasLoaded,isLoading,isCreating,error,onFilterChange,onPeriodChange,onAnchorDateChange,onSelectedDateChange,onRetry,onCreate}=props
  const [formOpen,setFormOpen]=useState(false)
  const [formError,setFormError]=useState<string|null>(null)
  const [warnings,setWarnings]=useState<ScheduleWarning[]>([])
  const visible=useMemo(()=>filterProjectId==='all'?events:events.filter(event=>event.projectId===filterProjectId),[events,filterProjectId])
  const planned=visible.filter(event=>event.type==='SCHEDULE')
  const actual=visible.filter(event=>event.type==='WORK_RECORD')
  const plannedMinutes=planned.reduce((total,event)=>total+Math.max(0,(Date.parse(event.endAt)-Date.parse(event.startAt))/60000),0)
  const selectedEvents=visible.filter(event=>eventDay(event.startAt)===selectedDate).sort((a,b)=>a.startAt.localeCompare(b.startAt))
  const label=period==='week'?`${displayDate(weekStart(anchorDate))} — ${displayDate(shiftDays(weekStart(anchorDate),6))}`:new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'long'}).format(parseDate(anchorDate))
  const move=(direction:-1|1)=>{ const next=period==='week'?shiftDays(anchorDate,direction*7):shiftMonths(anchorDate,direction); onAnchorDateChange(next); onSelectedDateChange(next) }
  const submit=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault(); const data=new FormData(event.currentTarget); const start=String(data.get('start')); const end=String(data.get('end'))
    if(end<=start){setFormError('終了時刻は開始時刻より後にしてください。');return}
    setFormError(null)
    try { const result=await onCreate({projectId:String(data.get('project')),title:String(data.get('title')).trim(),scheduledStartAt:new Date(`${selectedDate}T${start}:00+09:00`).toISOString(),scheduledEndAt:new Date(`${selectedDate}T${end}:00+09:00`).toISOString(),notes:String(data.get('notes')).trim()||null}); setWarnings(result??[]); setFormOpen(false) }
    catch(cause){setFormError(cause instanceof Error?cause.message:'予定を登録できませんでした。')}
  }
  return <div className="schedule-page">
    <div className="schedule-titlebar"><div><p className="eyebrow">SCHEDULE</p><h1>スケジュール</h1><p>案件ごとの予定と実績を、週・月単位で確認できます。</p></div><div className="schedule-actions"><button className="add-btn" disabled={!hasLoaded||!projects.length} onClick={()=>setFormOpen(true)}><Plus size="1.0625rem"/>予定を追加</button></div></div>
    <div className="schedule-stats" aria-busy={isLoading}>
      <article><span>表示期間の予定</span><strong>{hasLoaded&&!isLoading?<>{planned.length}<small> 件</small></>:null}</strong><p>登録されている作業予定</p></article>
      <article><span>予定稼働時間</span><strong>{hasLoaded&&!isLoading?<>{Number((plannedMinutes/60).toFixed(1))}<small> h</small></>:null}</strong><p>休憩時間を含む予定枠</p></article>
      <article><span>実績入力済み</span><strong>{hasLoaded&&!isLoading?<>{actual.length}<small> 件</small></>:null}</strong><p>別データとして登録された実績</p></article>
    </div>
    {warnings.length>0&&<div className="schedule-warning" role="status">{warnings.map(warning=><p key={`${warning.code}-${warning.targetId??warning.message}`}>{warning.message}</p>)}</div>}
    <div className="schedule-content-grid">
      <section className="calendar-card schedule-calendar">
        <div className="card-head"><div><h2>{period==='week'?'週間カレンダー':'月間カレンダー'}</h2><p>予定と実績を別のラベルで表示します。</p></div><div className="calendar-controls"><div className="week-nav compact-week-nav"><button aria-label={period==='week'?'前の週':'前の月'} onClick={()=>move(-1)}><ChevronLeft size="1.125rem"/></button><strong>{label}</strong><button aria-label={period==='week'?'次の週':'次の月'} onClick={()=>move(1)}><ChevronRight size="1.125rem"/></button></div><div className="segmented"><button className={period==='week'?'active':''} onClick={()=>onPeriodChange('week')}>週</button><button className={period==='month'?'active':''} onClick={()=>onPeriodChange('month')}>月</button></div></div></div>
        <div className="filters"><button className={filterProjectId==='all'?'selected':''} onClick={()=>onFilterChange('all')}>すべて</button>{projects.map(project=><button key={project.id} className={filterProjectId===project.id?'selected':''} onClick={()=>onFilterChange(project.id)}><i style={{background:project.labelColor}}/>{project.name}</button>)}</div>
        {!hasLoaded?<div className="schedule-unloaded"/>:isLoading?<div className="schedule-state" role="status">スケジュールを読み込んでいます…</div>:error?<div className="schedule-state schedule-error" role="alert"><p>{error}</p><button onClick={onRetry}>再読み込み</button></div>:!visible.length?<div className="schedule-state"><p>この期間の予定・実績はありません。</p></div>:period==='week'?<WeekCalendar events={visible} projects={projects} anchorDate={anchorDate} selectedDate={selectedDate} onSelectDate={onSelectedDateChange}/>:<MonthView events={visible} projects={projects} anchorDate={anchorDate} selectedDate={selectedDate} onSelectDate={onSelectedDateChange}/>} 
      </section>
      <aside className="day-agenda"><div className="agenda-head"><div><p>{displayDate(selectedDate)}</p><h2>{DAY_NAMES[parseDate(selectedDate).getDay()]}</h2></div>{hasLoaded&&!isLoading&&<span>{selectedEvents.length}件</span>}</div><div className="agenda-list">{!hasLoaded||isLoading?null:selectedEvents.length?selectedEvents.map(event=><AgendaEvent key={`${event.type}-${event.id}`} event={event} project={projectOf(event,projects)}/>):<p className="agenda-empty">この日の予定・実績はありません。</p>}</div><button disabled={!hasLoaded||!projects.length} onClick={()=>setFormOpen(true)}><Plus size="1rem"/>この日に予定を追加</button></aside>
    </div>
    {formOpen&&<div className="modal-backdrop" onMouseDown={()=>setFormOpen(false)}><div className="modal" onMouseDown={event=>event.stopPropagation()}><div className="modal-head"><div><p>NEW SCHEDULE</p><h2>{displayDate(selectedDate)}の予定を追加</h2></div><button aria-label="閉じる" onClick={()=>setFormOpen(false)}><X/></button></div><form onSubmit={submit}>{formError&&<p className="form-error" role="alert">{formError}</p>}<label>案件<select name="project" required defaultValue=""><option value="" disabled>案件を選択</option>{projects.map(project=><option value={project.id} key={project.id}>{project.name}</option>)}</select></label><label>作業内容<input name="title" required maxLength={150}/></label><div className="form-row"><label>開始<input type="time" name="start" required/></label><label>終了<input type="time" name="end" required/></label></div><label>メモ<textarea name="notes" rows={3}/></label><div className="modal-actions"><button type="button" onClick={()=>setFormOpen(false)}>キャンセル</button><button type="submit" disabled={isCreating}>{isCreating?'登録中…':'予定に追加'}</button></div></form></div></div>}
  </div>
}

function AgendaEvent({event,project}:{event:CalendarEvent;project?:ScheduleProject}) { const color=project?.labelColor??'#75A8C7'; return <article><i style={{background:color}}/><div><time>{eventTime(event.startAt)} — {eventTime(event.endAt)}</time><strong>{event.title}</strong><span>{project?`${project.name} · ${project.client.name}`:'案件情報を取得できませんでした'}</span></div><em>{event.type==='SCHEDULE'?'予定':'実績'}</em></article> }

export function WeekCalendar({events,projects,anchorDate,selectedDate,onSelectDate}:{events:CalendarEvent[];projects:ScheduleProject[];anchorDate:string;selectedDate:string;onSelectDate:(date:string)=>void}) {
  const start=weekStart(anchorDate); const days=Array.from({length:7},(_,i)=>shiftDays(start,i)); const starts=events.map(e=>eventMinute(e.startAt)); const ends=events.map(e=>eventMinute(e.endAt)); const minHour=Math.floor(Math.min(...starts)/60); const maxHour=Math.max(minHour+1,Math.ceil(Math.max(...ends)/60)); const hours=Array.from({length:maxHour-minHour},(_,i)=>minHour+i)
  return <div className="week-calendar"><div className="calendar-header"><div/>{days.map(day=>{const date=parseDate(day);return <button type="button" className={`${day===selectedDate?'today ':''}${date.getDay()===0||date.getDay()===6?'weekend':''}`} key={day} onClick={()=>onSelectDate(day)}><span>{SHORT_DAYS[date.getDay()]}</span><strong>{date.getDate()}</strong></button>})}</div><div className="calendar-body"><div className="times">{hours.map(hour=><span key={hour}>{String(hour).padStart(2,'0')}:00</span>)}</div><div className="days-grid">{days.map(day=>{const date=parseDate(day);return <div className={`day-col ${date.getDay()===0||date.getDay()===6?'weekend':''}`} key={day}>{hours.map(hour=><i key={hour}/>)}{events.filter(event=>eventDay(event.startAt)===day).map(event=>{const project=projectOf(event,projects);const color=project?.labelColor??'#75A8C7';const from=eventMinute(event.startAt);const to=eventMinute(event.endAt);return <button type="button" className="event" key={`${event.type}-${event.id}`} onClick={()=>onSelectDate(day)} style={{top:`${((from-minHour*60)/60)*3.25+.3125}rem`,height:`${Math.max(.85,((to-from)/60)*3.25-.5)}rem`,background:softColor(color),borderColor:color,color}}><b>{eventTime(event.startAt)}–{eventTime(event.endAt)}</b><span>{event.title}</span><em>{event.type==='SCHEDULE'?'予定':'実績'}</em></button>})}</div>})}</div></div></div>
}

export function MonthView({events,projects,anchorDate,selectedDate,onSelectDate}:{events:CalendarEvent[];projects:ScheduleProject[];anchorDate:string;selectedDate:string;onSelectDate:(date:string)=>void}) {
  const anchor=parseDate(anchorDate);const first=dateKey(new Date(anchor.getFullYear(),anchor.getMonth(),1));const last=dateKey(new Date(anchor.getFullYear(),anchor.getMonth()+1,0));const start=weekStart(first);const count=Math.ceil(((parseDate(last).getTime()-parseDate(start).getTime())/86400000+1)/7)*7;const days=Array.from({length:count},(_,i)=>shiftDays(start,i))
  return <div className="month-view">{days.map(day=>{const date=parseDate(day);const items=events.filter(event=>eventDay(event.startAt)===day);return <button type="button" className={`${date.getMonth()!==anchor.getMonth()?'muted ':''}${day===selectedDate?'selected':''}`} key={day} onClick={()=>onSelectDate(day)}><span>{date.getDate()}</span><div className="month-events">{items.slice(0,3).map(event=><i key={`${event.type}-${event.id}`} style={{background:projectOf(event,projects)?.labelColor??'#75A8C7'}} title={`${eventTime(event.startAt)} ${event.title}`}/>)}{items.length>3&&<small>+{items.length-3}</small>}</div></button>})}</div>
}
