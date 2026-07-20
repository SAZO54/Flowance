import Link from 'next/link'
import {FilePenLine, Plus, RefreshCw, ScrollText} from 'lucide-react'
import type {ProjectContract} from '@/domain/contract'
import {contractTypeLabels} from '@/domain/contract'

const yen = (value: number | null): string => value == null
  ? '未設定'
  : new Intl.NumberFormat('ja-JP', {style: 'currency', currency: 'JPY', maximumFractionDigits: 0}).format(value)

const date = (value: string | null): string => {
  if (!value) return '無期限'
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime())
    ? ''
    : new Intl.DateTimeFormat('ja-JP').format(parsed)
}

function amount(contract: ProjectContract): string {
  if (contract.contractType === 'HOURLY') return `${yen(contract.hourlyRate)} / 時`
  if (contract.contractType === 'PERFORMANCE') return yen(contract.performanceAmount)
  return `${yen(contract.monthlyRate)} / 月`
}

function ContractSummary({contract}: {contract: ProjectContract}) {
  return <dl className="contract-summary-fields">
    <div><dt>契約形態</dt><dd>{contractTypeLabels[contract.contractType]}</dd></div>
    <div><dt>契約金額</dt><dd>{amount(contract)}</dd></div>
    {contract.contractType === 'MONTHLY_RANGE' && <div><dt>精算幅</dt><dd>{contract.minimumMinutes ?? '—'}〜{contract.maximumMinutes ?? '—'}分</dd></div>}
    <div><dt>有効期間</dt><dd>{date(contract.validFrom)} — {date(contract.validUntil)}</dd></div>
    <div><dt>状態</dt><dd><span className={`contract-status ${contract.status.toLowerCase()}`}>{contract.status === 'ACTIVE' ? '有効' : '無効'}</span></dd></div>
    <div><dt>税率 / 源泉</dt><dd>{contract.taxRate}% / {contract.withholdingTaxRate}%</dd></div>
  </dl>
}

export function ProjectContractsPanel({
  projectId,
  contracts,
  canEdit,
  isLoading,
  error,
  onRetry,
}: {
  projectId: string
  contracts: ProjectContract[]
  canEdit: boolean
  isLoading: boolean
  error: string | null
  onRetry: () => void
}) {
  const current = contracts.find(contract => contract.isCurrent)
  const history = contracts.filter(contract => contract.id !== current?.id)
  return <section className="project-detail-panel project-contracts-panel">
    <div className="project-detail-panel-head contract-panel-head">
      <div><h2><ScrollText size=".9375rem"/>契約</h2><p>現在の精算条件と契約履歴</p></div>
      {canEdit && <Link className="contract-primary-action" href={`/case/${projectId}/contracts/new`}><Plus size=".875rem"/>契約を登録</Link>}
    </div>
    {isLoading && <div className="contract-panel-state" role="status"><RefreshCw/><span>契約を読み込んでいます</span></div>}
    {!isLoading && error && <div className="contract-panel-state" role="alert"><p>{error}</p><button type="button" onClick={onRetry}><RefreshCw size=".875rem"/>再読み込み</button></div>}
    {!isLoading && !error && !current && <div className="contract-empty"><strong>現在有効な契約はありません</strong><p>契約を登録すると、稼働時間の丸めや月次精算に利用されます。</p>{canEdit && <Link href={`/case/${projectId}/contracts/new`}><Plus size=".875rem"/>最初の契約を登録</Link>}</div>}
    {!isLoading && !error && current && <article className="current-contract">
      <div className="current-contract-title"><div><span>現在の契約</span><h3>{contractTypeLabels[current.contractType]}</h3></div>{canEdit && <Link href={`/case/${projectId}/contracts/${current.id}/edit`}><FilePenLine size=".875rem"/>編集</Link>}</div>
      <ContractSummary contract={current}/>
    </article>}
    {!isLoading && !error && history.length > 0 && <div className="contract-history">
      <h3>契約履歴</h3>
      <ul>{history.map(contract => <li key={contract.id}>
        <div><strong>{contractTypeLabels[contract.contractType]}</strong><span>{date(contract.validFrom)} — {date(contract.validUntil)}</span></div>
        <span>{amount(contract)}</span>
        {canEdit && <Link href={`/case/${projectId}/contracts/${contract.id}/edit`} aria-label={`${date(contract.validFrom)}開始の契約を編集`}><FilePenLine/></Link>}
      </li>)}</ul>
    </div>}
  </section>
}
