import React, { useState } from 'react'
import { BriefcaseBusiness, ChevronRight, CircleDollarSign, Clock3, MoreHorizontal, Plus, Search } from 'lucide-react'
import type { EventItem, Project, ProjectDetail, ProjectStatus } from '../../domain/models'
import { scheduledHoursForProject } from '../../application/metrics'

export function ProjectsPage({events, projects, projectDetails, onAdd}:{events: EventItem[]; projects: Project[]; projectDetails: Record<string, ProjectDetail>; onAdd: () => void}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | ProjectStatus>('all')
  const filteredProjects = projects.filter(project => {
    const detail = projectDetails[project.id]
    const matchesQuery = (project.name + project.client).toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (status === 'all' || detail.status === status)
  })
  const scheduledHours = (projectId: string) => scheduledHoursForProject(events, projectId)
  const formatDate = (value?: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.replace(/-/g, '/') : value || '未設定'
  const activeCount = projects.filter(project => projectDetails[project.id]?.status === 'active').length
  const attentionCount = projects.filter(project => projectDetails[project.id]?.status === 'attention').length
  const totalBudget = projects.reduce((sum, project) => sum + Number(projectDetails[project.id]?.budget.replace(/[^0-9]/g, '') ?? 0), 0)

  return <div className="projects-page">
    <div className="projects-titlebar">
      <div><p className="eyebrow">PROJECTS</p><h1>案件</h1><p>進行中の案件、稼働時間、予算をまとめて管理します。</p></div>
      <button className="add-btn" onClick={onAdd}><Plus size="1.0625rem"/>新しい案件</button>
    </div>

    <div className="project-summary">
      <article><span className="summary-icon"><BriefcaseBusiness size="1.125rem"/></span><div><p>進行中の案件</p><strong>{activeCount}<small> 件</small></strong></div></article>
      <article><span className="summary-icon"><CircleDollarSign size="1.125rem"/></span><div><p>契約金額合計</p><strong>¥{totalBudget.toLocaleString()}</strong></div></article>
      <article><span className="summary-icon"><Clock3 size="1.125rem"/></span><div><p>今週の予定稼働</p><strong>{events.reduce((sum,event)=>sum+event.end-event.start,0)}<small> h</small></strong></div></article>
    </div>

    <section className="projects-panel">
      <div className="projects-toolbar">
        <div className="project-tabs"><button className={status==='all'?'active':''} onClick={()=>setStatus('all')}>すべて <b>{projects.length}</b></button><button className={status==='active'?'active':''} onClick={()=>setStatus('active')}>進行中 <b>{activeCount}</b></button><button className={status==='attention'?'active':''} onClick={()=>setStatus('attention')}>確認待ち <b>{attentionCount}</b></button></div>
        <label className="project-search"><Search size="0.9375rem"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="案件・クライアントを検索"/></label>
      </div>

      <div className="project-card-grid">{filteredProjects.map(project => {
        const detail = projectDetails[project.id]
        return <article className="project-card" key={project.id}>
          <div className="project-card-head"><div className="project-card-icon" style={{background:project.soft,color:project.color}}>{project.name.slice(0,1)}</div><span className={'project-status '+detail.status}>{detail.statusLabel}</span><button aria-label="その他"><MoreHorizontal size="1.125rem"/></button></div>
          <div className="project-card-title"><h2>{project.name}</h2><p>{project.client}</p></div>
          <div className="project-card-progress"><div><span>進捗</span><strong>{detail.progress}%</strong></div><div className="progress"><i style={{width:detail.progress+'%',background:project.color}}/></div></div>
          <dl><div><dt>契約金額</dt><dd>{detail.budget}</dd></div><div><dt>期間</dt><dd>{formatDate(detail.startDate)} — {formatDate(detail.endDate || (detail as ProjectDetail & {deadline?: string}).deadline)}</dd></div></dl>
          <div className="project-hours"><div><span>今月の稼働</span><strong>{detail.usedHours} / {detail.targetHours}h</strong></div><div><span>今週の予定</span><strong>{scheduledHours(project.id)}h</strong></div></div>
          <button className="project-detail-button">案件詳細を見る <ChevronRight size="0.9375rem"/></button>
        </article>
      })}</div>
      {!filteredProjects.length && <div className="projects-empty"><Search size="1.5rem"/><strong>該当する案件がありません</strong><p>検索条件を変更してお試しください。</p></div>}
    </section>
  </div>
}
