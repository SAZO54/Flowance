import {useState} from 'react'
import {ArrowLeft, ChevronDown} from 'lucide-react'
import type {
  ContractStatus,
  ContractType,
  ContractUpdateCommand,
  ContractWriteCommand,
  ProjectContract,
  RoundingMethod,
} from '@/domain/contract'
import type {ProjectListItem} from '@/domain/project'
import {DatePickerInput} from '@/presentation/components/DateTimePickerInput'

type ContractFormProps = {
  project: ProjectListItem
  contract?: ProjectContract
  isSubmitting: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (command: ContractWriteCommand | ContractUpdateCommand) => void
  onDelete?: () => void
  onReload?: () => void
}

const numberOrNull = (form: FormData, key: string): number | null => {
  const value = String(form.get(key) ?? '').trim()
  return value === '' ? null : Number(value)
}

export function ContractForm({
  project,
  contract,
  isSubmitting,
  error,
  onCancel,
  onSubmit,
  onDelete,
  onReload,
}: ContractFormProps) {
  const [contractType, setContractType] = useState<ContractType>(contract?.contractType ?? 'HOURLY')
  const [validFrom, setValidFrom] = useState(contract?.validFrom ?? '')
  const editing = Boolean(contract)

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const usesRounding = contractType === 'HOURLY' || contractType === 'MONTHLY_RANGE'
    const command: ContractWriteCommand = {
      projectId: project.id,
      contractType,
      currency: 'JPY',
      hourlyRate: contractType === 'HOURLY' ? numberOrNull(form, 'hourlyRate') : null,
      monthlyRate: contractType === 'MONTHLY_RANGE' || contractType === 'MONTHLY_FIXED'
        ? numberOrNull(form, 'monthlyRate')
        : null,
      performanceAmount: contractType === 'PERFORMANCE' ? numberOrNull(form, 'performanceAmount') : null,
      minimumMinutes: contractType === 'MONTHLY_RANGE' ? numberOrNull(form, 'minimumMinutes') : null,
      maximumMinutes: contractType === 'MONTHLY_RANGE' ? numberOrNull(form, 'maximumMinutes') : null,
      baseMinutes: contractType === 'MONTHLY_RANGE' ? numberOrNull(form, 'baseMinutes') : null,
      deductionRate: contractType === 'MONTHLY_RANGE' ? numberOrNull(form, 'deductionRate') : null,
      overtimeRate: contractType === 'MONTHLY_RANGE' ? numberOrNull(form, 'overtimeRate') : null,
      taxRate: numberOrNull(form, 'taxRate') ?? 0,
      withholdingTaxRate: numberOrNull(form, 'withholdingTaxRate') ?? 0,
      roundingUnitMinutes: usesRounding ? numberOrNull(form, 'roundingUnitMinutes') : null,
      roundingMethod: usesRounding
        ? String(form.get('roundingMethod') ?? 'ROUND_DOWN') as RoundingMethod
        : null,
      closingDay: numberOrNull(form, 'closingDay'),
      paymentTermsDays: numberOrNull(form, 'paymentTermsDays'),
      validFrom: String(form.get('validFrom') ?? ''),
      validUntil: String(form.get('validUntil') ?? '').trim() || null,
      status: String(form.get('status') ?? 'ACTIVE') as ContractStatus,
    }
    onSubmit(contract
      ? {...command, contractId: contract.id, version: contract.version}
      : command)
  }

  return <div className="client-form-page contract-form-page">
    <button className="client-form-back" type="button" onClick={onCancel}>
      <ArrowLeft size="1rem"/>{project.name}の詳細
    </button>
    <div className="client-form-title">
      <p className="eyebrow">{editing ? 'EDIT CONTRACT' : 'NEW CONTRACT'}</p>
      <h1>{editing ? '契約を編集' : '契約を登録'}</h1>
      <p>{project.name}の精算条件と有効期間を設定します。</p>
    </div>
    <form className="client-form-card" onSubmit={submit}>
      {error && <div className='form-api-error' role='alert'><span>{error}</span>{onReload && <button type='button' onClick={onReload}>最新情報を再取得</button>}</div>}
      <section className="client-form-section">
        <div className="client-form-section-head"><h2>契約形態</h2><p>契約形態に応じて必要な金額・時間条件を入力します。</p></div>
        <div className="client-form-fields">
          <label><span className="field-label">契約形態 <i className="required-symbol">※</i></span><span className="select-wrap"><select name="contractType" value={contractType} onChange={event => setContractType(event.target.value as ContractType)}><option value="HOURLY">時間単価</option><option value="MONTHLY_RANGE">月額精算幅</option><option value="MONTHLY_FIXED">月額固定</option><option value="PERFORMANCE">成果報酬</option></select><ChevronDown size="1.0625rem"/></span></label>
          <label><span className="field-label">通貨</span><input name="currency" value="JPY" readOnly/></label>
          {contractType === 'HOURLY' && <label><span className="field-label">時間単価（円） <i className="required-symbol">※</i></span><input type="number" name="hourlyRate" min="0" required defaultValue={contract?.hourlyRate ?? ''}/></label>}
          {(contractType === 'MONTHLY_RANGE' || contractType === 'MONTHLY_FIXED') && <label><span className="field-label">月額（円） <i className="required-symbol">※</i></span><input type="number" name="monthlyRate" min="0" required defaultValue={contract?.monthlyRate ?? ''}/></label>}
          {contractType === 'PERFORMANCE' && <label><span className="field-label">成果報酬額（円） <i className="required-symbol">※</i></span><input type="number" name="performanceAmount" min="0" required defaultValue={contract?.performanceAmount ?? ''}/></label>}
        </div>
      </section>
      {contractType === 'MONTHLY_RANGE' && <section className="client-form-section">
        <div className="client-form-section-head"><h2>精算幅</h2><p>月額精算の時間幅と控除・超過条件です。</p></div>
        <div className="client-form-fields">
          <label><span className="field-label">最低時間（分） <i className="required-symbol">※</i></span><input type="number" name="minimumMinutes" min="0" required defaultValue={contract?.minimumMinutes ?? ''}/></label>
          <label><span className="field-label">最大時間（分） <i className="required-symbol">※</i></span><input type="number" name="maximumMinutes" min="0" required defaultValue={contract?.maximumMinutes ?? ''}/></label>
          <label><span className="field-label">基準時間（分） <i className="required-symbol">※</i></span><input type="number" name="baseMinutes" min="0" required defaultValue={contract?.baseMinutes ?? ''}/></label>
          <label><span className="field-label">控除単価（円/時） <i className="required-symbol">※</i></span><input type="number" name="deductionRate" min="0" required defaultValue={contract?.deductionRate ?? ''}/></label>
          <label><span className="field-label">超過単価（円/時） <i className="required-symbol">※</i></span><input type="number" name="overtimeRate" min="0" required defaultValue={contract?.overtimeRate ?? ''}/></label>
        </div>
      </section>}
      {(contractType === 'HOURLY' || contractType === 'MONTHLY_RANGE') && <section className="client-form-section">
        <div className="client-form-section-head"><h2>時間丸め</h2><p>請求対象時間へ適用する丸め条件です。</p></div>
        <div className="client-form-fields">
          <label><span className="field-label">丸め単位 <i className="required-symbol">※</i></span><span className="select-wrap"><select name="roundingUnitMinutes" required defaultValue={contract?.roundingUnitMinutes ?? 15}>{[1,5,10,15,30,60].map(value => <option value={value} key={value}>{value}分</option>)}</select><ChevronDown size="1.0625rem"/></span></label>
          <label><span className="field-label">丸め方式 <i className="required-symbol">※</i></span><span className="select-wrap"><select name="roundingMethod" required defaultValue={contract?.roundingMethod ?? 'ROUND_DOWN'}><option value="ROUND_DOWN">切り捨て</option><option value="ROUND_UP">切り上げ</option><option value="ROUND_HALF_UP">四捨五入</option></select><ChevronDown size="1.0625rem"/></span></label>
        </div>
      </section>}
      <section className="client-form-section">
        <div className="client-form-section-head"><h2>請求・有効期間</h2><p>税率、締め条件、契約の有効期間を設定します。</p></div>
        <div className="client-form-fields">
          <label><span className="field-label">消費税率（%） <i className="required-symbol">※</i></span><input type="number" name="taxRate" min="0" max="100" step=".01" required defaultValue={contract?.taxRate ?? 10}/></label>
          <label><span className="field-label">源泉徴収率（%） <i className="required-symbol">※</i></span><input type="number" name="withholdingTaxRate" min="0" max="100" step=".01" required defaultValue={contract?.withholdingTaxRate ?? 0}/></label>
          <label><span className="field-label">締め日</span><input type="number" name="closingDay" min="1" max="31" defaultValue={contract?.closingDay ?? 31}/></label>
          <label><span className="field-label">支払サイト（日）</span><input type="number" name="paymentTermsDays" min="0" defaultValue={contract?.paymentTermsDays ?? 30}/></label>
          <label><span className="field-label">契約開始日 <i className="required-symbol">※</i></span><DatePickerInput name="validFrom" value={validFrom} onValueChange={setValidFrom} required ariaLabel="契約開始日"/></label>
          <label><span className="field-label">契約終了日</span><DatePickerInput name="validUntil" defaultValue={contract?.validUntil ?? ''} min={validFrom || undefined} ariaLabel="契約終了日"/></label>
          {editing && <label><span className='field-label'>状態</span><span className='select-wrap'><select name='status' defaultValue={contract?.status ?? 'ACTIVE'}><option value='ACTIVE'>有効</option><option value='INACTIVE'>無効</option></select><ChevronDown size='1.0625rem'/></span></label>}
        </div>
      </section>
      <div className="client-form-actions contract-form-actions">
        {editing && onDelete && <button className="contract-delete-action" type="button" onClick={onDelete} disabled={isSubmitting}>契約を削除</button>}
        <button type="button" onClick={onCancel}>キャンセル</button>
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? '保存中…' : editing ? '変更を保存' : '契約を登録'}</button>
      </div>
    </form>
  </div>
}
