import {useRef, useState} from 'react'
import {validateImageFile} from '@/shared/validation/validationRules'
import {ArrowLeft, ChevronDown, ImagePlus, Trash2} from 'lucide-react'
import type {ClientListItem, ClientStatus} from '@/domain/client'
import type {UpdateClientCommand} from '@/domain/clientUpdate'

type ClientEditFormProps = {
  client: ClientListItem
  isSubmitting: boolean
  error: string | null
  onCancel: () => void
  onSave: (command: UpdateClientCommand) => void
}


export function ClientEditForm({client, isSubmitting, error, onCancel, onSave}: ClientEditFormProps) {
  const existingImage = client.icon.type === 'UPLOADED' && client.icon.status === 'READY'
    ? client.icon.url ?? undefined
    : undefined
  const [iconFile, setIconFile] = useState<File>()
  const [iconPreview, setIconPreview] = useState<string | undefined>(existingImage)
  const [deleteExistingIcon, setDeleteExistingIcon] = useState(false)
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
    setDeleteExistingIcon(false)
  }

  const clearIcon = () => {
    setIconFile(undefined)
    setIconPreview(undefined)
    setDeleteExistingIcon(client.icon.type === 'UPLOADED')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const nullable = (name: string) => String(form.get(name) ?? '').trim() || null
    onSave({
      clientId: client.id,
      version: client.version,
      name: String(form.get('name') ?? '').trim(),
      contactName: nullable('contactName'),
      email: nullable('email'),
      phone: nullable('phone'),
      postalCode: nullable('postalCode'),
      address: nullable('address'),
      status: String(form.get('status') ?? 'ACTIVE') as ClientStatus,
      notes: nullable('notes'),
      iconAction: deleteExistingIcon ? 'DELETE' : 'KEEP',
      iconFile,
    })
  }

  return <div className="client-form-page edit-form-page">
    <button className="client-form-back" type="button" onClick={onCancel}><ArrowLeft size="1rem"/>{client.name}の詳細</button>
    <div className="client-form-title"><p className="eyebrow">EDIT CLIENT</p><h1>クライアントを編集</h1><p>基本情報、取引状態、アイコンを更新します。</p></div>
    <form className="client-form-card" onSubmit={handleSubmit}>
      {error && <div className="form-api-error" role="alert">{error}</div>}
      <section className="client-form-section">
        <div className="client-form-section-head"><h2>アイコン</h2><p>新しい画像への変更や初期アイコンへの復元ができます。</p></div>
        <div className="client-icon-field">
          <div className="client-icon-preview entity-default-icon" aria-hidden="true" style={{color: client.icon.textColor, background: client.icon.backgroundColor}}>{iconPreview ? <img src={iconPreview} alt=""/> : client.icon.defaultText || <ImagePlus size="1.5rem"/>}</div>
          <div>
            <input ref={fileInputRef} type="file" name="iconFile" accept="image/jpeg,image/png,image/webp" onChange={selectIcon}/>
            <div className="client-icon-actions"><button type="button" onClick={() => fileInputRef.current?.click()}>{iconPreview ? '画像を変更' : '画像を選択'}</button>{(iconPreview || iconFile) && <button type="button" onClick={clearIcon}><Trash2 size=".875rem"/>初期アイコンに戻す</button>}</div>
            <small>JPG、PNG、WebP（最大5MB）。SVGは利用できません。</small>
          </div>
        </div>
      </section>
      <section className="client-form-section">
        <div className="client-form-section-head"><h2>基本情報</h2><p>クライアントの連絡先と取引状態を編集します。</p></div>
        <div className="client-form-fields">
          <label className="full"><span className="field-label">会社名・屋号 <i className="required-symbol">※</i></span><input name="name" defaultValue={client.name} data-max-length={150} required autoFocus/></label>
          <label><span className="field-label">担当者名</span><input name="contactName" defaultValue={client.contactName ?? ''} data-max-length={100}/></label>
          <label><span className="field-label">ステータス <i className="required-symbol">※</i></span><span className="select-wrap"><select name="status" required defaultValue={client.status}><option value="ACTIVE">取引中</option><option value="INACTIVE">取引終了</option></select><ChevronDown size="1.0625rem"/></span></label>
          <label><span className="field-label">メールアドレス</span><input type="email" name="email" defaultValue={client.email ?? ''} data-max-length={254}/></label>
          <label><span className="field-label">電話番号</span><input type="tel" name="phone" defaultValue={client.phone ?? ''} data-max-length={15}/></label>
          <label><span className="field-label">郵便番号</span><input name="postalCode" defaultValue={client.postalCode ?? ''} data-max-length={7}/></label>
          <label className="full"><span className="field-label">住所</span><textarea name="address" defaultValue={client.address ?? ''} data-max-length={500} rows={2}/></label>
          <label className="full"><span className="field-label">備考</span><textarea name="notes" defaultValue={client.notes ?? ''} data-max-length={1000} rows={3}/></label>
        </div>
      </section>
      <div className="client-form-actions"><button type="button" onClick={onCancel}>キャンセル</button><button type="submit" disabled={isSubmitting}>{isSubmitting ? '保存中…' : '変更を保存'}</button></div>
    </form>
  </div>
}
