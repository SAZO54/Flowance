import {useState} from 'react'
import {Plus, Trash2, X} from 'lucide-react'
import {DateTimePickerInput} from '@/presentation/components/DateTimePickerInput'
import type {ProjectListItem} from '@/domain/project'
import type {
  SaveWorkRecordCommand,
  UpdateWorkRecordCommand,
  WorkRecord,
  WorkRecordStatus,
} from '@/domain/workRecord'

type BreakValue = {startAt: string; endAt: string}

type WorkRecordFormProps = {
  projects: ProjectListItem[]
  record: WorkRecord | null
  isSubmitting: boolean
  error: string | null
  onCancel: () => void
  onSave: (command: SaveWorkRecordCommand | UpdateWorkRecordCommand) => void
  onDelete: ((record: WorkRecord) => void) | null
}

function localDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function isoDateTime(value: string): string {
  return new Date(value).toISOString()
}

export function WorkRecordForm({projects, record, isSubmitting, error, onCancel, onSave, onDelete}: WorkRecordFormProps) {
  const [actualStartAt, setActualStartAt] = useState(record ? localDateTime(record.actualStartAt) : '')
  const [breaks, setBreaks] = useState<BreakValue[]>(record?.breaks.map(item => ({
    startAt: localDateTime(item.startAt),
    endAt: localDateTime(item.endAt),
  })) ?? [])

  const updateBreak = (index: number, field: keyof BreakValue, value: string) => {
    setBreaks(current => current.map((item, itemIndex) => itemIndex === index
      ? {...item, [field]: value}
      : item))
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const base: SaveWorkRecordCommand = {
      projectId: String(form.get('projectId') ?? ''),
      workScheduleId: record?.workScheduleId ?? null,
      actualStartAt: isoDateTime(actualStartAt),
      actualEndAt: isoDateTime(String(form.get('actualEndAt') ?? '')),
      breaks: breaks.map(item => ({
        startAt: isoDateTime(item.startAt),
        endAt: isoDateTime(item.endAt),
      })),
      isBillable: form.get('isBillable') === 'on',
      status: String(form.get('status') ?? 'DRAFT') as WorkRecordStatus,
      notes: String(form.get('notes') ?? '').trim() || null,
    }
    onSave(record ? {...base, recordId: record.id, version: record.version} : base)
  }

  return <div className="work-record-modal-backdrop" onMouseDown={onCancel}>
    <div className="work-record-modal" role="dialog" aria-modal="true" aria-labelledby="work-record-form-title" onMouseDown={event => event.stopPropagation()}>
      <div className="work-record-modal-head">
        <div><p>{record ? 'EDIT WORK RECORD' : 'NEW WORK RECORD'}</p><h2 id="work-record-form-title">{record ? '稼働実績を編集' : '稼働実績を登録'}</h2></div>
        <button type="button" onClick={onCancel} aria-label="閉じる"><X size="1.125rem"/></button>
      </div>
      <form onSubmit={submit}>
        {error && <div className="form-api-error" role="alert">{error}</div>}
        <div className="work-record-form-grid">
          <label className="full"><span>案件 <i>※</i></span><select name="projectId" required defaultValue={record?.projectId ?? ''}><option value="" disabled>選択してください</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name} · {project.client.name}</option>)}</select></label>
          <label><span>開始日時 <i>※</i></span><DateTimePickerInput name="actualStartAt" required value={actualStartAt} onValueChange={setActualStartAt} ariaLabel="開始日時"/></label>
          <label><span>終了日時 <i>※</i></span><DateTimePickerInput name="actualEndAt" required defaultValue={record ? localDateTime(record.actualEndAt) : ''} min={actualStartAt || undefined} ariaLabel="終了日時"/></label>
          <label><span>状態 <i>※</i></span><select name="status" required defaultValue={record?.status ?? 'DRAFT'}><option value="DRAFT">下書き</option><option value="CONFIRMED">確定</option>{record?.status === 'CANCELLED' && <option value="CANCELLED">取消</option>}</select></label>
          <label className="work-record-billable"><input type="checkbox" name="isBillable" defaultChecked={record?.isBillable ?? true}/><span>請求対象にする</span></label>
          <label className="full"><span>備考</span><textarea name="notes" data-max-length={1000} rows={3} defaultValue={record?.notes ?? ''}/></label>
        </div>

        <section className="work-record-breaks">
          <div><div><h3>休憩</h3><p>休憩時間はバックエンドで稼働時間から差し引かれます。</p></div><button type="button" onClick={() => setBreaks(current => [...current, {startAt: '', endAt: ''}])}><Plus size="0.875rem"/>休憩を追加</button></div>
          {breaks.length === 0
            ? <p className="work-record-break-empty">休憩は登録されていません。</p>
            : breaks.map((item, index) => <div className="work-record-break-row" key={index}>
              <label><span>開始 <i>※</i></span><DateTimePickerInput name={`breaks.${index}.startAt`} required value={item.startAt} min={actualStartAt || undefined} onValueChange={value => updateBreak(index, 'startAt', value)} ariaLabel={`休憩${index + 1}の開始日時`}/></label>
              <label><span>終了 <i>※</i></span><DateTimePickerInput name={`breaks.${index}.endAt`} required value={item.endAt} min={item.startAt || actualStartAt || undefined} onValueChange={value => updateBreak(index, 'endAt', value)} ariaLabel={`休憩${index + 1}の終了日時`}/></label>
              <button type="button" aria-label={`休憩${index + 1}を削除`} onClick={() => setBreaks(current => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size="0.9375rem"/></button>
            </div>)}
        </section>

        <div className="work-record-modal-actions">
          <div>{record && onDelete && <button className="danger" type="button" disabled={isSubmitting} onClick={() => onDelete(record)}><Trash2 size="0.875rem"/>取消</button>}</div>
          <button type="button" onClick={onCancel}>キャンセル</button>
          <button type="submit" disabled={isSubmitting || projects.length === 0}>{isSubmitting ? '保存中…' : record ? '変更を保存' : '実績を登録'}</button>
        </div>
      </form>
    </div>
  </div>
}
