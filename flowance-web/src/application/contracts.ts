import type {
  ContractListResult,
  ContractUpdateCommand,
  ContractWriteCommand,
  ProjectContract,
} from '@/domain/contract'

export interface ContractGateway {
  listContracts(projectId: string): Promise<ContractListResult>
  getContract(projectId: string, contractId: string): Promise<ProjectContract>
  createContract(command: ContractWriteCommand): Promise<ProjectContract>
  updateContract(command: ContractUpdateCommand): Promise<ProjectContract>
  deleteContract(projectId: string, contractId: string, version: number): Promise<void>
}

export const listContracts = (
  gateway: ContractGateway,
  projectId: string,
) => gateway.listContracts(projectId)

export const getContract = (
  gateway: ContractGateway,
  projectId: string,
  contractId: string,
) => gateway.getContract(projectId, contractId)

export const createContract = (
  gateway: ContractGateway,
  command: ContractWriteCommand,
) => gateway.createContract(command)

export const updateContract = (
  gateway: ContractGateway,
  command: ContractUpdateCommand,
) => gateway.updateContract(command)

export const deleteContract = (
  gateway: ContractGateway,
  projectId: string,
  contractId: string,
  version: number,
) => gateway.deleteContract(projectId, contractId, version)
