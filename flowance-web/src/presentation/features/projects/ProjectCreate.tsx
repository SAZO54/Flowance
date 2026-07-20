import {useRef, useState} from 'react'
import {ArrowLeft, ChevronDown, ImagePlus, Trash2} from 'lucide-react'
import {DatePickerInput} from '@/presentation/components/DateTimePickerInput'
import type {ClientListItem} from '@/domain/client'
import type {ProjectStatus} from '@/domain/project'
import type {CreateProjectCommand} from '@/domain/projectCreate'

type ProjectCreateProps = {
  clients: ClientListItem[]
  isLoadingClients: boolean
  isSubmitting: boolean
  error: string | null
  onCancel: () => void
  onAddClient: () => void
  onCreate: (command: CreateProjectCommand) => void
}

const presetColors = ['#75A8C7', '#8DBFD3', '#426C5A', '#D36F86', '#A47A35']
const hexColorPattern = /^#[0-9A-Fa-f]{6}$/
const supportedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function ProjectCreate({
  clients,
  isLoadingClients,
  isSubmitting,
  error,
  onCancel,
  onAddClient,
  onCreate,
}: ProjectCreateProps) {
  const [color, setColor] = useState(presetColors[0])
  const [startDate, setStartDate] = useState('')
  const [iconFile, setIconFile] = useState<File>()
  const [iconPreview, setIconPreview] = useState<string>()
  const [iconError, setIconError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeClients = clients.filter(client => client.status === 'ACTIVE')
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
    setIconError('')
  }

  const clearIcon = () => {
    setIconFile(undefined)
    setIconPreview(undefined)
    setIconError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hexColorPattern.test(normalizedColor) || !activeClients.length) return
    const form = new FormData(event.currentTarget)
    const nullable = (name: string) => String(form.get(name) ?? '').trim() || null
    onCreate({
      clientId: String(form.get('clientId') ?? ''),
      name: String(form.get('name') ?? '').trim(),
      description: nullable('description'),
      labelColor: normalizedColor,
      startDate: nullable('startDate'),
      endDate: nullable('endDate'),
      workloadRate: null,
      status: String(form.get('status') ?? 'ACTIVE') as ProjectStatus,
      notes: nullable('notes'),
      iconFile,
    })
  }

  return <div className="client-form-page project-create-page">
    <button className="client-form-back" type="button" onClick={onCancel}>
      <ArrowLeft size="1rem"/>案件一覧
    </button>
    <div className="client-form-title">
      <p className="eyebrow">NEW PROJECT</p>
      <h1>新しい案件</h1>
      <p>案件の基本情報と管理上の予定期間を登録します。</p>
    </div>
    <form className="client-form-card" onSubmit={handleSubmit}>
      {error && <div className="form-api-error" role="alert">{error}</div>}
      <section className="client-form-section">
        <div className="client-form-section-head"><h2>アイコン</h2><p>一覧やカレンダーに表示する任意の画像です。</p></div>
        <div className="client-icon-field">
          <div className="client-icon-preview">{iconPreview ? <img src={iconPreview} alt="アイコンのプレビュー"/> : <ImagePlus size="1.5rem"/>}</div>
          <div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={selectIcon}/>
            <div className="client-icon-actions">
              <button type="button" onClick={() => fileInputRef.current?.click()}>{iconFile ? '画像を変更' : '画像を選択'}</button>
              {iconFile && <button type="button" onClick={clearIcon}><Trash2 size=".875rem"/>削除</button>}
            </div>
            <small>JPG、PNG、WebP（最大5MB）。SVGは利用できません。</small>
            {iconError && <em role="alert">{iconError}</em>}
          </div>
        </div>
      </section>
      <section className="client-form-section">
        <div className="client-form-section-head"><h2>基本情報</h2><p>案件名、取引先、状態を設定します。</p></div>
        <div className="client-form-fields">
          <label className="full"><span className="field-label">案件名 <i className="required-symbol">※</i></span><input name="name" maxLength={150} required autoFocus/></label>
          <label><span className="field-label">クライアント <i className="required-symbol">※</i></span><span className="select-wrap"><select name="clientId" required defaultValue="" disabled={isLoadingClients || !activeClients.length}><option value="" disabled>{isLoadingClients ? '読み込み中' : activeClients.length ? '選択してください' : '取引中のクライアントがありません'}</option>{activeClients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select><ChevronDown size="1.0625rem"/></span>{!isLoadingClients && !activeClients.length && <button className="form-inline-action" type="button" onClick={onAddClient}>クライアントを先に登録</button>}</label>
          <label><span className="field-label">ステータス <i className="required-symbol">※</i></span><span className="select-wrap"><select name="status" required defaultValue="ACTIVE"><option value="ACTIVE">進行中</option><option value="PAUSED">一時停止</option><option value="COMPLETED">完了</option><option value="ARCHIVED">アーカイブ</option></select><ChevronDown size="1.0625rem"/></span></label>
          <label className="full"><span className="field-label">説明</span><textarea name="description" rows={3}/></label>
        </div>
      </section>
      <section className="client-form-section">
        <div className="client-form-section-head"><h2>管理情報</h2><p>契約期間ではなく、案件管理上の予定期間です。</p></div>
        <div className="client-form-fields">
          <label><span className="field-label">開始日</span><DatePickerInput name="startDate" value={startDate} onValueChange={setStartDate} ariaLabel="開始日"/></label>
          <label><span className="field-label">終了日</span><DatePickerInput name="endDate" min={startDate || undefined} ariaLabel="終了日"/></label>
          <label className="full"><span className="field-label">備考</span><textarea name="notes" rows={3}/></label>
        </div>
      </section>
      <section className="client-form-section">
        <div className="client-form-section-head"><h2>ラベルカラー</h2><p>カレンダーや案件一覧で使用します。</p></div>
        <div className="project-color-section">
          <fieldset className="project-color-picker"><legend>カラーを選択</legend>{presetColors.map(item => <label key={item} className={normalizedColor === item ? 'selected' : ''}><input type="radio" name="presetColor" value={item} checked={normalizedColor === item} onChange={() => setColor(item)}/><span style={{background: item}}/><b>{item}</b></label>)}</fieldset>
          <label className="project-custom-color"><span className="field-label">カスタムカラー <i className="required-symbol">※</i></span><span className="project-custom-color-control"><input className="project-native-color" type="color" value={colorPickerValue} onChange={event => setColor(event.target.value.toUpperCase())}/><input type="text" value={color} onChange={event => setColor(event.target.value.toUpperCase())} maxLength={7} pattern="#[0-9A-Fa-f]{6}" required/></span></label>
        </div>
      </section>
      <div className="client-form-actions"><button type="button" onClick={onCancel}>キャンセル</button><button type="submit" disabled={isSubmitting || isLoadingClients || !activeClients.length}>{isSubmitting ? '登録中…' : '案件を登録'}</button></div>
    </form>
  </div>
}
