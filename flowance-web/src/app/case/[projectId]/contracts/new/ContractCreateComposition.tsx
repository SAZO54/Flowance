'use client'

import {createContract} from '@/application/contracts'
import {getProject} from '@/application/projects/getProject'
import {contractApi} from '@/infrastructure/api/contractApi'
import {projectApi} from '@/infrastructure/api/projectApi'
import {
  ContractFormContainer,
  type ContractFormUseCases,
} from '@/presentation/features/contracts/ContractFormContainer'

const useCases: ContractFormUseCases = {
  getProject: projectId => getProject({projectGateway: projectApi}, projectId),
  create: command => createContract(contractApi, command),
}

export function ContractCreateComposition({projectId}: {projectId: string}) {
  return <ContractFormContainer projectId={projectId} useCases={useCases}/>
}
