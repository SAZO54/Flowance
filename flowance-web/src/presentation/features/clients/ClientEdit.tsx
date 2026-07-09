import React, { useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, ImagePlus, Trash2 } from 'lucide-react'
import type { Client, ClientStatus } from '../../../domain/models'

export type ClientEditValues = { name: string; contact: string; email: string; status: ClientStatus; icon?: string }
type ClientEditProps = { client?: Client; onCancel: () => void; onSave: (values: ClientEditValues) => void }

export function ClientEdit({client, onCancel, onSave}: ClientEditProps) {
  const [icon, setIcon] = useState<string|undefined>(client?.icon)
  const [iconError, setIconError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  if (!client) return <div className="client-detail-not-found"><h1>クライアントが見つかりません</h1><button onClick={onCancel}>一覧へ戻る</button></div>

  const selectIcon = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setIconError('画像ファイルを選択してください。'); return }
    if (file.size > 2 * 1024 * 1024) { setIconError('画像は2MB以下にしてください。'); return }
    const reader = new FileReader()
    reader.onload = () => { setIcon(String(reader.result)); setIconError('') }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    onSave({name:String(formData.get('name')??'').trim(),contact:String(formData.get('contact')??'').trim(),email:String(formData.get('email')??'').trim(),status:String(formData.get('status')??'active') as ClientStatus,icon})
  }

  return <div className="client-form-page">
    <button className="client-form-back" type="button" onClick={onCancel}><ArrowLeft size="1rem"/>{client.name}の詳細</button>
    <div className="client-form-title"><p className="eyebrow">EDIT CLIENT</p><h1>クライアントを編集</h1><p>基本情報とアイコンを更新します。</p></div>
    <form className="client-form-card" onSubmit={handleSubmit}>
      <section className="client-form-section"><div className="client-form-section-head"><h2>アイコン</h2><p>一覧や詳細画面に表示する画像です。</p></div>
        <div className="client-icon-field"><div className="client-icon-preview" style={!icon?{color:client.color,background:client.soft}:undefined}>{icon?<img src={icon} alt="アイコンのプレビュー"/>:<span>{client.initials}</span>}</div><div><input ref={fileInputRef} type="file" accept="image/*" onChange={selectIcon}/><div className="client-icon-actions"><button type="button" onClick={()=>fileInputRef.current?.click()}>{icon?'画像を変更':'画像を選択'}</button>{icon&&<button type="button" onClick={()=>{setIcon(undefined);if(fileInputRef.current)fileInputRef.current.value=''}}><Trash2 size=".875rem"/>削除</button>}</div><small>JPG、PNG、WebP（最大2MB）</small>{iconError&&<em role="alert">{iconError}</em>}</div></div>
      </section>
      <section className="client-form-section"><div className="client-form-section-head"><h2>基本情報</h2><p>クライアントの連絡先を編集します。</p></div><div className="client-form-fields">
        <label className="full"><span className="field-label">会社名・屋号 <i className="required-symbol">※</i></span><input name="name" defaultValue={client.name} required autoFocus/></label>
        <label><span className="field-label">担当者名 <i className="required-symbol">※</i></span><input name="contact" defaultValue={client.contact} required/></label>
        <label><span className="field-label">ステータス <i className="required-symbol">※</i></span><span className="select-wrap"><select name="status" required defaultValue={client.status}><option value="active">取引中</option><option value="inactive">取引終了</option></select><ChevronDown size="1.0625rem"/></span></label>
        <label className="full"><span className="field-label">メールアドレス <i className="required-symbol">※</i></span><input type="email" name="email" defaultValue={client.email} required/></label>
      </div></section>
      <div className="client-form-actions"><button type="button" onClick={onCancel}>キャンセル</button><button type="submit">変更を保存</button></div>
    </form>
  </div>
}