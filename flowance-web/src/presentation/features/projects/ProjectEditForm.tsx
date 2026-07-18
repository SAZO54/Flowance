import {useRef, useState} from 'react'
import {ArrowLeft, ChevronDown, ImagePlus, Trash2} from 'lucide-react'
import type {ClientListItem} from '@/domain/client'
import type {ProjectListItem, ProjectStatus} from '@/domain/project'
import type {UpdateProjectCommand} from '@/domain/projectUpdate'

type ProjectEditFormProps = {
  project: ProjectListItem
  clients: ClientListItem[]
  isSubmitting: boolean
  error: string | null
  onCancel: () => void
  onSave: (command: UpdateProjectCommand) => void
}

const presetColors = ['#75A8C7', '#8DBFD3', '#426C5A', '#D36F86', '#A47A35']
const hexColorPattern = /^#[0-9A-Fa-f]{6}$/
const supportedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function ProjectEditForm({project, clients, isSubmitting, error, onCancel, onSave}: ProjectEditFormProps) {
  const existingImage = project.icon.type === 'UPLOADED' && project.icon.status === 'READY'
    ? project.icon.url ?? undefined
    : undefined
  const [color, setColor] = useState(project.labelColor)
  const [startDate, setStartDate] = useState(project.startDate ?? '')
  const [iconFile, setIconFile] = useState<File>()
  const [iconPreview, setIconPreview] = useState<string | undefined>(existingImage)
  const [deleteExistingIcon, setDeleteExistingIcon] = useState(false)
  const [iconError, setIconError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const normalizedColor = color.toUpperCase()
  const colorPickerValue = hexColorPattern.test(color) ? color : presetColors[0]

  const selectIcon = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!supportedImageTypes.has(file.type)) {
      setIconError('JPG、PNG、WebPのいずれかを選択してください。')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setIconError('画像は5MB以下にしてください。')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setIconPreview(String(reader.result))
    reader.readAsDataURL(file)
    setIconFile(file)
    setDeleteExistingIcon(false)
    setIconError('')
  }

  const clearIcon = () => {
    setIconFile(undefined)
    setIconPreview(undefined)
    setDeleteExistingIcon(project.icon.type === 'UPLOADED')
    setIconError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hexColorPattern.test(normalizedColor)) return
    const form = new FormData(event.currentTarget)
    const nullable = (name: string) => String(form.get(name) ?? '').trim() || null
    const workloadValue = nullable('workloadRate')
    onSave({
      projectId: project.id,
      version: project.version,
      clientId: String(form.get('clientId') ?? ''),
      name: String(form.get('name') ?? '').trim(),
      description: nullable('description'),
      labelColor: normalizedColor,
      startDate: nullable('startDate'),
      endDate: nullable('endDate'),
      workloadRate: workloadValue === null ? null : Number(workloadValue),
      status: String(form.get('status') ?? 'ACTIVE') as ProjectStatus,
      notes: nullable('notes'),
      iconAction: deleteExistingIcon ? 'DELETE' : 'KEEP',
      iconFile,
    })
  }

  return <div className="client-form-page project-create-page">
    <button className="client-form-back" type="button" onClick={onCancel}><ArrowLeft size="1rem"/>{project.name}の詳細</button>
    <div className="client-form-title"><p className="eyebrow">EDIT PROJECT</p><h1>案件を編集</h1><p>案件情報、管理期間、状態、アイコンを更新します。</p></div>
    <form className="client-form-card" onSubmit={handleSubmit}>
      {error && <div className="form-api-error" role="alert">{error}</div>}
      <section className="client-form-section">
        <div className="client-form-section-head"><h2>アイコン</h2><p>新しい画像への変更や初期アイコンへの復元ができます。</p></div>
        <div className="client-icon-field">
          <div className="client-icon-preview" style={{color: project.icon.textColor, background: project.icon.backgroundColor}}>{iconPreview ? <img src={iconPreview} alt="アイコンのプレビュー"/> : project.icon.defaultText || <ImagePlus size="1.5rem"/>}</div>
          <div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={selectIcon}/>
            <div className="client-icon-actions"><button type="button" onClick={() => fileInputRef.current?.click()}>{iconPreview ? '画像を変更' : '画像を選択'}</button>{(project.icon.type === 'UPLOADED' || iconPreview || iconFile) && <button type="button" onClick={clearIcon}><Trash2 size=".875rem"/>初期アイコンに戻す</button>}</div>
            <small>JPG、PNG、WebP（最大5MB）。SVGは利用できません。</small>
            {iconError && <em role="alert">{iconError}</em>}
          </div>
        </div>
      </section>
      <section className="client-form-section">
        <div className="client-form-section-head"><h2>基本情報</h2><p>案件名、クライアント、状態を編集します。</p></div>
        <div className="client-form-fields">
          <label className="full"><span className="field-label">案件名 <i className="required-symbol">※</i></span><input name="name" defaultValue={project.name} maxLength={150} required autoFocus/></label>
          <label><span className="field-label">クライアント <i className="required-symbol">※</i></span><span className="select-wrap"><select name="clientId" required defaultValue={project.client.id}>{clients.map(client => <option key={client.id} value={client.id}>{client.name}{client.status === 'INACTIVE' ? '（取引終了）' : ''}</option>)}</select><ChevronDown size="1.0625rem"/></span></label>
          <label><span className="field-label">ステータス <i className="required-symbol">※</i></span><span className="select-wrap"><select name="status" required defaultValue={project.status}><option value="ACTIVE">進行中</option><option value="PAUSED">一時停止</option><option value="COMPLETED">完了</option><option value="ARCHIVED">アーカイブ</option></select><ChevronDown size="1.0625rem"/></span></label>
          <label className="full"><span className="field-label">説明</span><textarea name="description" defaultValue={project.description ?? ''} rows={3}/></label>
        </div>
      </section>
      <section className="client-form-section">
        <div className="client-form-section-head"><h2>管理情報</h2><p>契約期間ではなく、案件管理上の予定期間です。</p></div>
        <div className="client-form-fields">
          <label><span className="field-label">開始日</span><input type="date" name="startDate" value={startDate} onChange={event => setStartDate(event.target.value)}/></label>
          <label><span className="field-label">終了日</span><input type="date" name="endDate" defaultValue={project.endDate ?? ''} min={startDate || undefined}/></label>
          <label><span className="field-label">稼働率目安（%）</span><input type="number" name="workloadRate" defaultValue={project.workloadRate ?? ''} min="0" max="100" step="0.01"/></label>
          <label className="full"><span className="field-label">備考</span><textarea name="notes" defaultValue={project.notes ?? ''} rows={3}/></label>
        </div>
      </section>
      <section className="client-form-section">
        <div className="client-form-section-head"><h2>ラベルカラー</h2><p>カレンダーや案件一覧で使用します。</p></div>
        <div className="project-color-section">
          <fieldset className="project-color-picker"><legend>カラーを選択</legend>{presetColors.map(item => <label key={item} className={normalizedColor === item ? 'selected' : ''}><input type="radio" name="presetColor" value={item} checked={normalizedColor === item} onChange={() => setColor(item)}/><span style={{background: item}}/><b>{item}</b></label>)}</fieldset>
          <label className="project-custom-color"><span className="field-label">カスタムカラー</span><span className="project-custom-color-control"><input className="project-native-color" type="color" value={colorPickerValue} onChange={event => setColor(event.target.value.toUpperCase())}/><input type="text" value={color} onChange={event => setColor(event.target.value.toUpperCase())} maxLength={7} pattern="#[0-9A-Fa-f]{6}" required/></span></label>
        </div>
      </section>
      <div className="client-form-actions"><button type="button" onClick={onCancel}>キャンセル</button><button type="submit" disabled={isSubmitting || clients.length === 0}>{isSubmitting ? '保存中…' : '変更を保存'}</button></div>
    </form>
  </div>
}
