'use client'

import {useState} from 'react'
import {
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  LayoutDashboard,
  Users,
} from 'lucide-react'
import type {SettingsData, SettingsSection} from '@/domain/settings'

type SettingsViewProps = {
  saved: SettingsData | null
  draft: SettingsData | null
  isLoading: boolean
  isSaving: boolean
  isDirty: boolean
  savedNotice: boolean
  error: string | null
  conflict: boolean
  onChange: (settings: SettingsData) => void
  onSave: () => void
  onCancel: () => void
  onRetry: () => void
  onDismissError: () => void
}

const sections = [
  ['profile', 'プロフィール', '基本情報と連絡先', Users],
  ['organization', '組織', '組織名と既定情報', Building2],
  ['business', '事業情報', '屋号・住所・税情報', BriefcaseBusiness],
  ['appearance', '表示設定', '画面表示と週の設定', LayoutDashboard],
] as const

function initials(value: string): string {
  return Array.from(value.trim()).slice(0, 2).join('').toUpperCase()
}

export function SettingsView({
  saved,
  draft,
  isLoading,
  isSaving,
  isDirty,
  savedNotice,
  error,
  conflict,
  onChange,
  onSave,
  onCancel,
  onRetry,
  onDismissError,
}: SettingsViewProps) {
  const [section, setSection] = useState<SettingsSection>('profile')

  if (isLoading && !draft) {
    return <div className="settings-page"><div className="settings-titlebar">
      <div><p className="eyebrow">SETTINGS</p><h1>設定</h1><p>設定を読み込んでいます。</p></div>
    </div><div className="settings-state" aria-busy="true"/></div>
  }

  if (!draft) {
    return <div className="settings-page"><div className="settings-titlebar">
      <div><p className="eyebrow">SETTINGS</p><h1>設定</h1><p>アカウントと組織の設定を管理します。</p></div>
    </div><div className="settings-state settings-error" role="alert">
      <p>{error ?? '設定を取得できませんでした。'}</p>
      <button type="button" onClick={onRetry}>再読み込み</button>
    </div></div>
  }

  const updateProfile = (values: Partial<SettingsData['profile']>) =>
    onChange({...draft, profile: {...draft.profile, ...values}})
  const updateOrganization = (values: Partial<SettingsData['organization']>) =>
    onChange({...draft, organization: {...draft.organization, ...values}})
  const updateBusiness = (values: Partial<SettingsData['business']>) =>
    onChange({...draft, business: {...draft.business, ...values}})
  const updateAppearance = (values: Partial<SettingsData['appearance']>) =>
    onChange({...draft, appearance: {...draft.appearance, ...values}})
  const timezoneOptions = Array.from(new Set([
    draft.appearance.timezone,
    draft.organization.timezone,
    'Asia/Tokyo',
    'UTC',
  ]))

  return <form className="settings-page" onSubmit={event => {
    event.preventDefault()
    onSave()
  }}>
    <div className="settings-titlebar">
      <div><p className="eyebrow">SETTINGS</p><h1>設定</h1><p>プロフィール、組織、事業情報、表示方法を管理します。</p></div>
      {savedNotice && <span className="settings-saved">変更を保存しました</span>}
    </div>
    {error && <div className="settings-banner" role="alert">
      <p>{error}</p>
      <div>
        {conflict && <button type="button" onClick={onRetry}>最新情報を取得</button>}
        <button type="button" onClick={onDismissError}>編集を続ける</button>
      </div>
    </div>}
    <div className="settings-layout">
      <aside className="settings-nav" aria-label="設定項目">
        {sections.map(([id, label, description, Icon]) => (
          <button
            type="button"
            className={section === id ? 'active' : ''}
            onClick={() => setSection(id)}
            key={id}
          >
            <Icon size="1.0625rem"/>
            <span><strong>{label}</strong><small>{description}</small></span>
            <ChevronRight size="0.9375rem"/>
          </button>
        ))}
      </aside>
      <section className="settings-panel">
        {section === 'profile' && <>
          <div className="settings-section-head">
            <div><h2>プロフィール</h2><p>サービス内で使用する基本情報を設定します。</p></div>
            <div className="settings-avatar" aria-hidden="true">{initials(draft.profile.displayName)}</div>
          </div>
          <div className="settings-form-grid">
            <label className="full">表示名<input required maxLength={100} value={draft.profile.displayName} onChange={event => updateProfile({displayName: event.target.value})}/></label>
            <label>姓<input maxLength={100} value={draft.profile.familyName} onChange={event => updateProfile({familyName: event.target.value})}/></label>
            <label>名<input maxLength={100} value={draft.profile.givenName} onChange={event => updateProfile({givenName: event.target.value})}/></label>
            <label className="full">メールアドレス<input type="email" value={draft.profile.email} readOnly aria-readonly="true"/><small>メールアドレスの変更はPhase2で対応します。</small></label>
            <label className="full">電話番号<input type="tel" maxLength={32} pattern="[0-9+()\-\s]*" value={draft.profile.phoneNumber} onChange={event => updateProfile({phoneNumber: event.target.value})}/></label>
            <label className="full">自己紹介<textarea maxLength={1000} value={draft.profile.bio} onChange={event => updateProfile({bio: event.target.value})}/></label>
          </div>
        </>}
        {section === 'organization' && <>
          <div className="settings-section-head"><div><h2>組織</h2><p>所属組織の基本情報を管理します。</p></div>{!draft.organization.canEdit && <span className="settings-readonly">閲覧のみ</span>}</div>
          <div className="settings-form-grid">
            <label className="full">組織名<input required maxLength={150} value={draft.organization.name} readOnly={!draft.organization.canEdit} onChange={event => updateOrganization({name: event.target.value})}/></label>
            <label>組織タイムゾーン<select value={draft.organization.timezone} disabled={!draft.organization.canEdit} onChange={event => updateOrganization({timezone: event.target.value})}>{timezoneOptions.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>通貨<input value={draft.organization.currency} readOnly aria-readonly="true"/><small>Phase1はJPY固定です。</small></label>
          </div>
        </>}
        {section === 'business' && <>
          <div className="settings-section-head"><div><h2>事業情報</h2><p>将来の請求書作成に利用する基本情報です。</p></div>{!draft.business.canEdit && <span className="settings-readonly">閲覧のみ</span>}</div>
          <div className="settings-form-grid">
            <label className="full">屋号<input maxLength={150} value={draft.business.businessName} readOnly={!draft.business.canEdit} onChange={event => updateBusiness({businessName: event.target.value})}/></label>
            <label>郵便番号<input maxLength={8} pattern="(?:\d{3}-?\d{4})?" value={draft.business.postalCode} readOnly={!draft.business.canEdit} onChange={event => updateBusiness({postalCode: event.target.value})}/></label>
            <label>都道府県<input maxLength={20} value={draft.business.prefecture} readOnly={!draft.business.canEdit} onChange={event => updateBusiness({prefecture: event.target.value})}/></label>
            <label className="full">住所<input maxLength={255} value={draft.business.address} readOnly={!draft.business.canEdit} onChange={event => updateBusiness({address: event.target.value})}/></label>
            <label>適格請求書発行事業者番号<input maxLength={14} pattern="(?:T\d{13})?" placeholder="T1234567890123" value={draft.business.invoiceRegistrationNumber} readOnly={!draft.business.canEdit} onChange={event => updateBusiness({invoiceRegistrationNumber: event.target.value})}/></label>
            <label>既定消費税率<select value={draft.business.defaultTaxRate ?? ''} disabled={!draft.business.canEdit} onChange={event => updateBusiness({defaultTaxRate: event.target.value || null})}><option value="">未設定</option><option value="10.00">10%</option><option value="8.00">8%</option></select><small>契約・精算の税率は変更しません。</small></label>
          </div>
        </>}
        {section === 'appearance' && <>
          <div className="settings-section-head"><div><h2>表示設定</h2><p>カレンダーや一覧画面の表示方法を設定します。</p></div></div>
          <div className="settings-form-grid">
            <label>週の開始曜日<select value={draft.appearance.weekStartsOn} onChange={event => updateAppearance({weekStartsOn: event.target.value as SettingsData['appearance']['weekStartsOn']})}><option value="MONDAY">月曜日</option><option value="SUNDAY">日曜日</option></select></label>
            <label>時間表示<select value={draft.appearance.timeFormat} onChange={event => updateAppearance({timeFormat: event.target.value as SettingsData['appearance']['timeFormat']})}><option value="H24">24時間表示</option><option value="H12">12時間表示</option></select></label>
            <label className="full">利用者タイムゾーン<select value={draft.appearance.timezone} onChange={event => updateAppearance({timezone: event.target.value})}>{timezoneOptions.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          </div>
          <div className="settings-toggle-list compact-setting">
            <label><span><strong>コンパクト表示</strong><small>一覧とカードの余白を狭くして、多くの情報を表示します。</small></span><input type="checkbox" checked={draft.appearance.compactMode} onChange={event => updateAppearance({compactMode: event.target.checked})}/><i/></label>
          </div>
        </>}
        <div className="settings-actions">
          <span>{isDirty ? '未保存の変更があります' : saved ? '保存済みです' : ''}</span>
          <button type="button" disabled={!isDirty || isSaving} onClick={onCancel}>取消</button>
          <button type="submit" disabled={!isDirty || isSaving}>{isSaving ? '保存中…' : '変更を保存'}</button>
        </div>
      </section>
    </div>
  </form>
}
