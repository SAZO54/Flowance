import {useRef, useState} from 'react'
import {validateImageFile} from '@/shared/validation/validationRules'
import {ArrowLeft, ChevronDown, ImagePlus, Trash2} from 'lucide-react'
import type {ClientStatus} from '@/domain/client'
import type {CreateClientCommand} from '@/domain/clientCreate'

type ClientCreateProps = {
  isSubmitting: boolean
  error: string | null
  onCancel: () => void
  onCreate: (command: CreateClientCommand) => void
}


export function ClientCreate({isSubmitting, error, onCancel, onCreate}: ClientCreateProps) {
  const [iconFile, setIconFile] = useState<File>()
  const [iconPreview, setIconPreview] = useState<string>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectIcon = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const validationIssue = validateImageFile(file)
    if (validationIssue) return
    const reader = new FileReader()
    reader.onload = () => setIconPreview(String(reader.result))
    reader.readAsDataURL(file)
    setIconFile(file)
  }

  const clearIcon = () => {
    setIconFile(undefined)
    setIconPreview(undefined)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const nullable = (name: string) => String(form.get(name) ?? '').trim() || null
    onCreate({
      name: String(form.get('name') ?? '').trim(),
      contactName: nullable('contactName'),
      email: nullable('email'),
      phone: nullable('phone'),
      postalCode: nullable('postalCode'),
      address: nullable('address'),
      status: String(form.get('status') ?? 'ACTIVE') as ClientStatus,
      notes: nullable('notes'),
      iconFile,
    })
  }

  return <div className="client-form-page">
    <button className="client-form-back" type="button" onClick={onCancel}><ArrowLeft size="1rem"/>クライアント一覧</button>
    <div className="client-form-title"><p className="eyebrow">NEW CLIENT</p><h1>クライアントを追加</h1><p>取引先の基本情報と任意のアイコンを登録します。</p></div>
    <form className="client-form-card" onSubmit={handleSubmit}>
      {error && <div className="form-api-error" role="alert">{error}</div>}
      <section className="client-form-section">
        <div className="client-form-section-head"><h2>アイコン</h2><p>一覧に表示する任意の画像です。</p></div>
        <div className="client-icon-field">
          <div className="client-icon-preview">{iconPreview ? <img src={iconPreview} alt="アイコンのプレビュー"/> : <ImagePlus size="1.5rem"/>}</div>
          <div>
            <input ref={fileInputRef} type="file" name="iconFile" accept="image/jpeg,image/png,image/webp" onChange={selectIcon}/>
            <div className="client-icon-actions"><button type="button" onClick={() => fileInputRef.current?.click()}>{iconFile ? '画像を変更' : '画像を選択'}</button>{iconFile && <button type="button" onClick={clearIcon}><Trash2 size=".875rem"/>削除</button>}</div>
            <small>JPG、PNG、WebP（最大5MB）。SVGは利用できません。</small>
          </div>
        </div>
      </section>
      <section className="client-form-section">
        <div className="client-form-section-head"><h2>基本情報</h2><p>クライアント名と取引状態を設定します。</p></div>
        <div className="client-form-fields">
          <label className="full"><span className="field-label">会社名・屋号 <i className="required-symbol">※</i></span><input name="name" data-max-length={150} required autoFocus/></label>
          <label><span className="field-label">担当者名</span><input name="contactName" data-max-length={100}/></label>
          <label><span className="field-label">ステータス <i className="required-symbol">※</i></span><span className="select-wrap"><select name="status" required defaultValue="ACTIVE"><option value="ACTIVE">取引中</option><option value="INACTIVE">取引終了</option></select><ChevronDown size="1.0625rem"/></span></label>
          <label><span className="field-label">メールアドレス</span><input type="email" name="email" data-max-length={254}/></label>
          <label><span className="field-label">電話番号</span><input type="tel" name="phone" data-max-length={15}/></label>
          <label><span className="field-label">郵便番号</span><input name="postalCode" data-max-length={7}/></label>
          <label className="full"><span className="field-label">住所</span><textarea name="address" data-max-length={500} rows={2}/></label>
          <label className="full"><span className="field-label">備考</span><textarea name="notes" data-max-length={1000} rows={3}/></label>
        </div>
      </section>
      <div className="client-form-actions"><button type="button" onClick={onCancel}>キャンセル</button><button type="submit" disabled={isSubmitting}>{isSubmitting ? '登録中…' : 'クライアントを追加'}</button></div>
    </form>
  </div>
}
