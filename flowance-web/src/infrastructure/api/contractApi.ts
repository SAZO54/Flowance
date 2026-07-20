import type {
  ContractListResult,
  ContractUpdateCommand,
  ContractWriteCommand,
  ProjectContract,
} from '@/domain/contract'
import {apiClient, type ApiClient} from './apiClient'

function path(projectId: string, contractId?: string): string {
  const base = `/api/v1/projects/${encodeURIComponent(projectId)}/contracts`
  return contractId ? `${base}/${encodeURIComponent(contractId)}` : base
}

function payload(command: ContractWriteCommand) {
  return {
    contractType: command.contractType,
    currency: command.currency,
    hourlyRate: command.hourlyRate,
    monthlyRate: command.monthlyRate,
    performanceAmount: command.performanceAmount,
    minimumMinutes: command.minimumMinutes,
    maximumMinutes: command.maximumMinutes,
    baseMinutes: command.baseMinutes,
    deductionRate: command.deductionRate,
    overtimeRate: command.overtimeRate,
    taxRate: command.taxRate,
    withholdingTaxRate: command.withholdingTaxRate,
    roundingUnitMinutes: command.roundingUnitMinutes,
    roundingMethod: command.roundingMethod,
    closingDay: command.closingDay,
    paymentTermsDays: command.paymentTermsDays,
    validFrom: command.validFrom,
    validUntil: command.validUntil,
    status: command.status,
  }
}

export class ContractApi {
  constructor(private readonly client: ApiClient = apiClient) {}

  listContracts(projectId: string): Promise<ContractListResult> {
    return this.client.request<ContractListResult>(path(projectId))
  }
  getContract(projectId: string, contractId: string): Promise<ProjectContract> {
    return this.client.request<ProjectContract>(path(projectId, contractId))
  }
  createContract(command: ContractWriteCommand): Promise<ProjectContract> {
    return this.client.request<ProjectContract>(path(command.projectId), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload(command)),
    })
  }
  updateContract(command: ContractUpdateCommand): Promise<ProjectContract> {
    return this.client.request<ProjectContract>(path(command.projectId, command.contractId), {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({...payload(command), version: command.version}),
    })
  }
  deleteContract(projectId: string, contractId: string, version: number): Promise<void> {
    return this.client.request<void>(`${path(projectId, contractId)}?version=${version}`, {method: 'DELETE'})
  }
}

export const contractApi = new ContractApi()
