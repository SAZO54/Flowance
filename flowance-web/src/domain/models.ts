export type Project = { id: string; name: string; clientId: string; client: string; color: string; soft: string }
export type EventItem = { id: number; project: string; day: number; start: number; end: number; label: string; actual?: boolean }

export type SettingsSection = 'profile' | 'business' | 'notifications' | 'appearance'
export type ClientStatus = 'active' | 'inactive'
export type Client = {id: string; name: string; contact: string; email: string; status: ClientStatus; projects: number; revenue: number; receivable: number; lastActivity: string; initials: string; color: string; soft: string; icon?: string}
export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft'
export type Invoice = {id: string; client: string; project: string; issueDate: string; dueDate: string; amount: number; status: InvoiceStatus}
export type FinanceTransaction = {id: number; date: string; type: 'income' | 'expense'; title: string; category: string; amount: number; status: 'paid' | 'pending'}
export type WorkRecord = {id: number; date: string; project: string; label: string; start: string; end: string; hours: number; status: 'confirmed' | 'draft'}
export type ProjectStatus = 'active' | 'attention'
export type ProjectDetail = {status: ProjectStatus; statusLabel: string; progress: number; budget: string; startDate: string; endDate: string; usedHours: number; targetHours: number}
