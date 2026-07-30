import React, { useState } from 'react'
import { Bell, BriefcaseBusiness, ChevronRight, LayoutDashboard, Users } from 'lucide-react'
import type { SettingsSection } from '../../domain/models'

export function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('profile')
  const [saved, setSaved] = useState(false)
  const [notifications, setNotifications] = useState({invoice:true,schedule:true,weekly:true,marketing:false})
  const [compact, setCompact] = useState(false)

  const saveSettings = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }

  return <div className="settings-page">
    <div className="settings-titlebar"><div><p className="eyebrow">SETTINGS</p><h1>設定</h1><p>アカウント情報や通知、表示方法を管理します。</p></div>{saved&&<span className="settings-saved">✓ 変更を保存しました</span>}</div>
    <div className="settings-layout">
      <aside className="settings-nav">
        <button className={section==='profile'?'active':''} onClick={()=>setSection('profile')}><Users size="1.0625rem"/><span><strong>プロフィール</strong><small>基本情報と連絡先</small></span><ChevronRight size="0.9375rem"/></button>
        <button className={section==='business'?'active':''} onClick={()=>setSection('business')}><BriefcaseBusiness size="1.0625rem"/><span><strong>事業情報</strong><small>屋号・住所・振込先</small></span><ChevronRight size="0.9375rem"/></button>
        <button className={section==='notifications'?'active':''} onClick={()=>setSection('notifications')}><Bell size="1.0625rem"/><span><strong>通知</strong><small>メールとリマインダー</small></span><ChevronRight size="0.9375rem"/></button>
        <button className={section==='appearance'?'active':''} onClick={()=>setSection('appearance')}><LayoutDashboard size="1.0625rem"/><span><strong>表示設定</strong><small>画面表示と週の設定</small></span><ChevronRight size="0.9375rem"/></button>
      </aside>

      <form className="settings-panel" onSubmit={saveSettings}>
        {section==='profile'&&<>
          <div className="settings-section-head"><div><h2>プロフィール</h2><p>サービス内で使用する基本情報を設定します。</p></div><div className="settings-avatar">SA</div></div>
          <div className="settings-form-grid"><label>姓<input defaultValue="佐藤"/></label><label>名<input defaultValue="あかり"/></label><label className="full">メールアドレス<input type="email" defaultValue="akari.sato@example.com"/></label><label className="full">電話番号<input type="tel" defaultValue="090-1234-5678"/></label><label className="full">自己紹介<textarea data-max-length={1000} defaultValue="Webサービスの設計・開発を中心に活動しているフリーランスエンジニアです。"/></label></div>
        </>}
        {section==='business'&&<>
          <div className="settings-section-head"><div><h2>事業情報</h2><p>請求書などに記載する情報を設定します。</p></div></div>
          <div className="settings-form-grid"><label className="full">屋号<input defaultValue="Flowance Studio"/></label><label>郵便番号<input defaultValue="150-0001"/></label><label>都道府県<input defaultValue="東京都"/></label><label className="full">住所<input defaultValue="渋谷区神宮前 1-2-3"/></label><label>適格請求書発行事業者番号<input defaultValue="T1234567890123"/></label><label>消費税率<select defaultValue="10"><option value="10">10%</option><option value="8">8%</option></select></label></div>
          <div className="bank-settings"><h3>振込先口座</h3><div className="settings-form-grid"><label>銀行名<input defaultValue="みずほ銀行"/></label><label>支店名<input defaultValue="渋谷支店"/></label><label>口座種別<select defaultValue="ordinary"><option value="ordinary">普通</option><option value="current">当座</option></select></label><label>口座番号<input defaultValue="1234567"/></label></div></div>
        </>}
        {section==='notifications'&&<>
          <div className="settings-section-head"><div><h2>通知</h2><p>受け取りたい通知とタイミングを設定します。</p></div></div>
          <div className="settings-toggle-list">
            <label><span><strong>請求書の支払期限</strong><small>支払期限の3日前と当日に通知します。</small></span><input type="checkbox" checked={notifications.invoice} onChange={()=>setNotifications(value=>({...value,invoice:!value.invoice}))}/><i/></label>
            <label><span><strong>稼働予定のリマインダー</strong><small>予定開始の30分前に通知します。</small></span><input type="checkbox" checked={notifications.schedule} onChange={()=>setNotifications(value=>({...value,schedule:!value.schedule}))}/><i/></label>
            <label><span><strong>週間レポート</strong><small>毎週月曜日に先週の実績を送信します。</small></span><input type="checkbox" checked={notifications.weekly} onChange={()=>setNotifications(value=>({...value,weekly:!value.weekly}))}/><i/></label>
            <label><span><strong>サービスからのお知らせ</strong><small>新機能や活用方法のお知らせを受け取ります。</small></span><input type="checkbox" checked={notifications.marketing} onChange={()=>setNotifications(value=>({...value,marketing:!value.marketing}))}/><i/></label>
          </div>
        </>}
        {section==='appearance'&&<>
          <div className="settings-section-head"><div><h2>表示設定</h2><p>カレンダーや一覧画面の表示方法を設定します。</p></div></div>
          <div className="settings-form-grid"><label>週の開始曜日<select defaultValue="monday"><option value="monday">月曜日</option><option value="sunday">日曜日</option></select></label><label>時間表示<select defaultValue="24"><option value="24">24時間表示</option><option value="12">12時間表示</option></select></label><label>通貨<select defaultValue="jpy"><option value="jpy">日本円（JPY）</option><option value="usd">米ドル（USD）</option></select></label><label>タイムゾーン<select defaultValue="tokyo"><option value="tokyo">Asia/Tokyo</option><option value="utc">UTC</option></select></label></div>
          <div className="settings-toggle-list compact-setting"><label><span><strong>コンパクト表示</strong><small>一覧画面の行間を狭くして多くの情報を表示します。</small></span><input type="checkbox" checked={compact} onChange={()=>setCompact(value=>!value)}/><i/></label></div>
        </>}
        <div className="settings-actions"><button type="button">キャンセル</button><button type="submit">変更を保存</button></div>
      </form>
    </div>
  </div>
}
