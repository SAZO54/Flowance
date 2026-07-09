import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, CircleDollarSign, Clock3, FileText, MoreHorizontal, Sparkles } from 'lucide-react'
import type { FinanceTransaction, Project } from '../../domain/models'

export function FinancePage({projects, financeTransactions}:{projects: Project[]; financeTransactions: FinanceTransaction[]}) {
  const [transactionType, setTransactionType] = useState<'all' | 'income' | 'expense'>('all')
  const filteredTransactions = financeTransactions.filter(transaction => transactionType === 'all' || transaction.type === transactionType)
  const months = ['2月','3月','4月','5月','6月','7月']
  const income = [72,88,96,84,112,125]
  const expenses = [18,21,24,20,26,22]
  const maxValue = 140

  return <div className="finance-page">
    <div className="finance-titlebar">
      <div><p className="eyebrow">FINANCE</p><h1>収支</h1><p>売上と経費の流れを把握して、事業の利益を見える化します。</p></div>
      <div className="finance-period"><button><ChevronLeft size="1rem"/></button><strong>2026年7月</strong><button><ChevronRight size="1rem"/></button></div>
    </div>

    <div className="finance-summary">
      <article className="revenue"><div><span>今月の売上</span><CircleDollarSign size="1.125rem"/></div><strong>¥1,250,000</strong><p><em>+12.4%</em> 先月比</p></article>
      <article className="expense"><div><span>今月の経費</span><FileText size="1.125rem"/></div><strong>¥218,400</strong><p><em>−3.8%</em> 先月比</p></article>
      <article className="profit"><div><span>営業利益</span><Sparkles size="1.125rem"/></div><strong>¥1,031,600</strong><p>利益率 <em>82.5%</em></p></article>
      <article className="receivable"><div><span>未入金</span><Clock3 size="1.125rem"/></div><strong>¥350,000</strong><p>2件 · 次回 7月15日</p></article>
    </div>

    <div className="finance-dashboard-grid">
      <section className="finance-chart-card">
        <div className="finance-card-head"><div><h2>売上と経費の推移</h2><p>過去6か月の月次推移</p></div><div className="chart-legend"><span><i className="income"/>売上</span><span><i className="expense"/>経費</span></div></div>
        <div className="finance-chart">
          <div className="finance-axis"><span>¥140万</span><span>¥105万</span><span>¥70万</span><span>¥35万</span><span>¥0</span></div>
          <div className="finance-bars">{months.map((month,index)=><div className="finance-month" key={month}><div className="bar-pair"><i className="income" style={{height:(income[index]/maxValue*100)+'%'}}/><i className="expense" style={{height:(expenses[index]/maxValue*100)+'%'}}/></div><b>{month}</b></div>)}</div>
        </div>
      </section>

      <section className="revenue-breakdown">
        <div className="finance-card-head"><div><h2>案件別売上</h2><p>今月の構成比</p></div><button><MoreHorizontal size="1.125rem"/></button></div>
        <div className="revenue-total"><div className="revenue-ring"><strong>¥1.25M</strong><span>合計</span></div></div>
        <div className="revenue-projects">{projects.map((project,index)=>{const values=[520000,420000,310000];const rates=[42,34,24];return <div key={project.id}><i style={{background:project.color}}/><span>{project.name}</span><strong>¥{values[index].toLocaleString()}</strong><em>{rates[index]}%</em></div>})}</div>
      </section>
    </div>

    <section className="finance-transactions">
      <div className="finance-transactions-head"><div><h2>入出金履歴</h2><p>最近の取引</p></div><div className="transaction-tabs"><button className={transactionType==='all'?'active':''} onClick={()=>setTransactionType('all')}>すべて</button><button className={transactionType==='income'?'active':''} onClick={()=>setTransactionType('income')}>入金</button><button className={transactionType==='expense'?'active':''} onClick={()=>setTransactionType('expense')}>支出</button></div></div>
      <div className="transaction-table">
        <div className="transaction-row header"><span>日付</span><span>取引先・内容</span><span>区分</span><span>状態</span><span>金額</span><span/></div>
        {filteredTransactions.map(transaction=><div className="transaction-row" key={transaction.id}><span>{transaction.date}</span><span className="transaction-name"><i className={transaction.type}>{transaction.type==='income'?'↗':'↘'}</i><span><strong>{transaction.title}</strong><small>{transaction.category}</small></span></span><span>{transaction.type==='income'?'売上':'経費'}</span><span className={'payment-status '+transaction.status}>{transaction.status==='paid'?'入金済み':'入金待ち'}</span><strong className={transaction.type}>{transaction.type==='income'?'+':'−'}¥{transaction.amount.toLocaleString()}</strong><button><MoreHorizontal size="1.0625rem"/></button></div>)}
      </div>
    </section>
  </div>
}
