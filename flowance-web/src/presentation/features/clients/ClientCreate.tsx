import React, { useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, ImagePlus, Trash2 } from 'lucide-react'
import type { ClientStatus } from '../../../domain/models'

export type ClientCreateValues = { name: string; contact: string; email: string; status: ClientStatus; icon?: string }
type ClientCreateProps = { onCancel: () => void; onCreate: (values: ClientCreateValues) => void }

export function ClientCreate({onCancel, onCreate}: ClientCreateProps) {
  const [icon, setIcon] = useState<string>()
  const [iconError, setIconError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    onCreate({name:String(formData.get('name')??'').trim(),contact:String(formData.get('contact')??'').trim(),email:String(formData.get('email')??'').trim(),status:String(formData.get('status')??'active') as ClientStatus,icon})
  }

  return <div className="client-form-page">
    <button className="client-form-back" type="button" onClick={onCancel}><ArrowLeft size="1rem"/>クライアント一覧</button>
    <div className="client-form-title"><p className="eyebrow">NEW CLIENT</p><h1>クライアントを追加</h1><p>取引先の基本情報とアイコンを登録します。</p></div>
    <form className="client-form-card" onSubmit={handleSubmit}>
      <section className="client-form-section"><div className="client-form-section-head"><h2>アイコン</h2><p>一覧や詳細画面に表示する画像です。</p></div>
        <div className="client-icon-field"><div className="client-icon-preview">{icon?<img src={icon} alt="アイコンのプレビュー"/>:<ImagePlus size="1.5rem"/>}</div><div><input ref={fileInputRef} type="file" accept="image/*" onChange={selectIcon}/><div className="client-icon-actions"><button type="button" onClick={()=>fileInputRef.current?.click()}>{icon?'画像を変更':'画像を選択'}</button>{icon&&<button type="button" onClick={()=>{setIcon(undefined);if(fileInputRef.current)fileInputRef.current.value=''}}><Trash2 size=".875rem"/>削除</button>}</div><small>JPG、PNG、WebP（最大2MB）</small>{iconError&&<em role="alert">{iconError}</em>}</div></div>
      </section>
      <section className="client-form-section"><div className="client-form-section-head"><h2>基本情報</h2><p>クライアントの連絡先を入力してください。</p></div><div className="client-form-fields">
        <label className="full"><span className="field-label">会社名・屋号 <i className="required-symbol">※</i></span><input name="name" placeholder="例：Nova Works" required autoFocus/></label>
        <label><span className="field-label">担当者名 <i className="required-symbol">※</i></span><input name="contact" placeholder="例：田中 健太" required/></label>
        <label><span className="field-label">ステータス <i className="required-symbol">※</i></span><span className="select-wrap"><select name="status" required defaultValue="active"><option value="active">取引中</option><option value="inactive">取引終了</option></select><ChevronDown size="1.0625rem"/></span></label>
        <label className="full"><span className="field-label">メールアドレス <i className="required-symbol">※</i></span><input type="email" name="email" placeholder="例：client@example.com" required/></label>
      </div></section>
      <div className="client-form-actions"><button type="button" onClick={onCancel}>キャンセル</button><button type="submit">クライアントを追加</button></div>
    </form>
  </div>
}