import type { Client, EventItem, FinanceTransaction, Invoice, Project, ProjectDetail, WorkRecord } from '../../domain/models'

export type FlowanceSnapshot = {
  projects: Project[]
  initialEvents: EventItem[]
  clients: Client[]
  invoices: Invoice[]
  financeTransactions: FinanceTransaction[]
  workRecords: WorkRecord[]
  projectDetails: Record<string, ProjectDetail>
}

export interface FlowanceRepository {
  getSnapshot(): FlowanceSnapshot
}
