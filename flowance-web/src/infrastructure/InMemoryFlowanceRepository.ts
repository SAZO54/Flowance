import type { FlowanceRepository, FlowanceSnapshot } from '../application/ports/FlowanceRepository'
import { clients, financeTransactions, initialEvents, invoices, projectDetails, projects, workRecords } from './mockData'

export class InMemoryFlowanceRepository implements FlowanceRepository {
  getSnapshot(): FlowanceSnapshot {
    return {projects, initialEvents, clients, invoices, financeTransactions, workRecords, projectDetails}
  }
}
