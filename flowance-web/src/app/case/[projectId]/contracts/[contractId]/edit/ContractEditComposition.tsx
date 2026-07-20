'use client'

import {
  deleteContract,
  getContract,
  updateContract,
} from '@/application/contracts'
import {getProject} from '@/application/projects/getProject'
import {contractApi} from '@/infrastructure/api/contractApi'
import {projectApi} from '@/infrastructure/api/projectApi'
import {
  ContractFormContainer,
  type ContractFormUseCases,
} from '@/presentation/features/contracts/ContractFormContainer'

const useCases: ContractFormUseCases = {
  getProject: projectId => getProject({projectGateway: projectApi}, projectId),
  getContract: (projectId, contractId) => getContract(contractApi, projectId, contractId),
  update: command => updateContract(contractApi, command),
  delete: (projectId, contractId, version) => deleteContract(contractApi, projectId, contractId, version),
}

export function ContractEditComposition({projectId, contractId}: {projectId: string; contractId: string}) {
  return <ContractFormContainer projectId={projectId} contractId={contractId} useCases={useCases}/>
}
