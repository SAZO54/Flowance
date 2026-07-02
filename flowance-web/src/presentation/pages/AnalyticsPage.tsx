import React, { useState } from 'react'
import { ChevronRight, CircleDollarSign, Clock3, MoreHorizontal, Sparkles, Users } from 'lucide-react'
import type { Project } from '../../domain/models'

export function AnalyticsPage({projects}:{projects: Project[]}) {
  const [range, setRange] = useState<'6m' | '12m'>('6m')
  const months = range === '6m' ? ['2月','3月','4月','5月','6月','7月'] : ['8月','9月','10月','11月','12月','1月','2月','3月','4月','5月','6月','7月']
  const revenue = range === '6m' ? [72,88,96,84,112,125] : [58,64,70,76,82,68,72,88,96,84,112,125]
  const hours = range === '6m' ? [104,118,126,120,134,126] : [92,98,105,108,116,110,104,118,126,120,134,126]
  const maxRevenue = 140
  const weekdayHours = [6.5,7,7.5,5.5,6,1.5,0.5]
  const projectAnalytics = [
    {project:projects[0],revenue:520000,hours:72,rate:7222,margin:86},
    {project:projects[1],revenue:420000,hours:46,rate:9130,margin:89},
    {project:projects[2],revenue:310000,hours:34,rate:9118,margin:82},
  ]

  return <div className="analytics-page">
    <div className="analytics-titlebar">
      <div><p className="eyebrow">ANALYTICS</p><h1>分析</h1><p>売上と稼働データから、事業の状態と改善ポイントを把握します。</p></div>
      <div className="analytics-range"><button className={range==='6m'?'active':''} onClick={()=>setRange('6m')}>6か月</button><button className={range==='12m'?'active':''} onClick={()=>setRange('12m')}>12か月</button></div>
    </div>

    <div className="analytics-kpis">
      <article><div><span>平均月商</span><CircleDollarSign size="1.125rem"/></div><strong>¥961,000</strong><p><em>+14.8%</em> 前期比</p></article>
      <article><div><span>平均稼働時間</span><Clock3 size="1.125rem"/></div><strong>121.3<small> h/月</small></strong><p>目標の 74%</p></article>
      <article><div><span>平均実質時給</span><Sparkles size="1.125rem"/></div><strong>¥7,921</strong><p><em>+6.2%</em> 前期比</p></article>
      <article><div><span>最大顧客依存度</span><Users size="1.125rem"/></div><strong>41.6<small>%</small></strong><p>目標 40% 以下</p></article>
    </div>

    <div className="analytics-top-grid">
      <section className="analytics-trend">
        <div className="analytics-card-head"><div><h2>売上・稼働の推移</h2><p>月次パフォーマンス</p></div><div className="analytics-legend"><span><i/>売上</span><span><i/>稼働時間</span></div></div>
        <div className="analytics-combo-chart">
          <div className="combo-axis"><span>¥140万</span><span>¥105万</span><span>¥70万</span><span>¥35万</span><span>¥0</span></div>
          <div className="combo-plot" style={{gridTemplateColumns:'repeat('+months.length+',1fr)'}}>{months.map((month,index)=><div className="combo-month" key={month}><div className="combo-value">{revenue[index]}</div><div className="combo-bar"><i style={{height:(revenue[index]/maxRevenue*100)+'%'}}/><span style={{bottom:(hours[index]/150*100)+'%'}}/></div><b>{month}</b></div>)}</div>
        </div>
      </section>

      <section className="client-concentration">
        <div className="analytics-card-head"><div><h2>売上構成</h2><p>クライアント別</p></div><button><MoreHorizontal size="1.125rem"/></button></div>
        <div className="concentration-ring"><div><strong>¥1.25M</strong><span>7月売上</span></div></div>
        <div className="concentration-list">{projects.map((project,index)=><div key={project.id}><i style={{background:project.color}}/><span>{project.client}</span><strong>{[41.6,33.6,24.8][index]}%</strong></div>)}</div>
        <p className="concentration-note"><Sparkles size="0.875rem"/>最大顧客への依存度が目標を1.6%上回っています。</p>
      </section>
    </div>

    <div className="analytics-bottom-grid">
      <section className="project-profitability">
        <div className="analytics-card-head"><div><h2>案件別パフォーマンス</h2><p>売上・稼働・収益性</p></div><button>すべて見る <ChevronRight size="0.875rem"/></button></div>
        <div className="profitability-table"><div className="profitability-row header"><span>案件</span><span>売上</span><span>稼働</span><span>実質時給</span><span>利益率</span></div>{projectAnalytics.map(item=><div className="profitability-row" key={item.project.id}><span className="profitability-project"><i style={{background:item.project.color}}/><span><strong>{item.project.name}</strong><small>{item.project.client}</small></span></span><strong>¥{item.revenue.toLocaleString()}</strong><span>{item.hours}h</span><strong>¥{item.rate.toLocaleString()}</strong><span className="margin-cell"><i><b style={{width:item.margin+'%'}}/></i>{item.margin}%</span></div>)}</div>
      </section>

      <section className="weekday-analysis">
        <div className="analytics-card-head"><div><h2>曜日別の稼働</h2><p>1日あたり平均</p></div></div>
        <div className="weekday-bars">{weekdayHours.map((value,index)=><div key={index}><span>{['月','火','水','木','金','土','日'][index]}</span><i><b style={{width:(value/8*100)+'%'}} className={index>=5?'weekend':''}/></i><strong>{value}h</strong></div>)}</div>
        <div className="weekday-insight"><Clock3 size="0.9375rem"/><p><strong>水曜日</strong>の稼働が最も高く、平均7.5時間です。</p></div>
      </section>
    </div>
  </div>
}
