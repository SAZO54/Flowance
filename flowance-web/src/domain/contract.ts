export type ContractType = 'HOURLY' | 'MONTHLY_RANGE' | 'MONTHLY_FIXED' | 'PERFORMANCE'
export type ContractStatus = 'ACTIVE' | 'INACTIVE'
export type RoundingMethod = 'ROUND_DOWN' | 'ROUND_UP' | 'ROUND_HALF_UP'

export type ProjectContract = {
  id: string
  projectId: string
  contractType: ContractType
  currency: 'JPY'
  hourlyRate: number | null
  monthlyRate: number | null
  performanceAmount: number | null
  minimumMinutes: number | null
  maximumMinutes: number | null
  baseMinutes: number | null
  deductionRate: number | null
  overtimeRate: number | null
  taxRate: number
  withholdingTaxRate: number
  roundingUnitMinutes: number | null
  roundingMethod: RoundingMethod | null
  closingDay: number | null
  paymentTermsDays: number | null
  validFrom: string
  validUntil: string | null
  status: ContractStatus
  isCurrent: boolean
  version: number
  createdAt: string
  updatedAt: string
}

export type ContractWriteCommand = {
  projectId: string
  contractType: ContractType
  currency: 'JPY'
  hourlyRate: number | null
  monthlyRate: number | null
  performanceAmount: number | null
  minimumMinutes: number | null
  maximumMinutes: number | null
  baseMinutes: number | null
  deductionRate: number | null
  overtimeRate: number | null
  taxRate: number
  withholdingTaxRate: number
  roundingUnitMinutes: number | null
  roundingMethod: RoundingMethod | null
  closingDay: number | null
  paymentTermsDays: number | null
  validFrom: string
  validUntil: string | null
  status: ContractStatus
}

export type ContractUpdateCommand = ContractWriteCommand & {
  contractId: string
  version: number
}

export type ContractListResult = {items: ProjectContract[]}

export const contractTypeLabels: Record<ContractType, string> = {
  HOURLY: '時間単価',
  MONTHLY_RANGE: '月額精算幅',
  MONTHLY_FIXED: '月額固定',
  PERFORMANCE: '成果報酬',
}
