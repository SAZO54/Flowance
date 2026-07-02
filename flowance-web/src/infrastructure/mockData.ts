import type { Client, EventItem, FinanceTransaction, Invoice, Project, ProjectDetail, WorkRecord } from '../domain/models'

export const projects: Project[] = [
  { id: 'a', name: 'SaaS リニューアル', client: 'Nova Works', color: '#426c5a', soft: '#dbe9df' },
  { id: 'b', name: 'ECサイト改善', client: 'Mellow Inc.', color: '#d36f86', soft: '#f8dce2' },
  { id: 'c', name: 'ブランドサイト', client: 'Aster Studio', color: '#a47a35', soft: '#f1e5c6' },
]

export const initialEvents: EventItem[] = [
  { id: 1, project: 'a', day: 0, start: 10, end: 13, label: 'API設計・レビュー', actual: true },
  { id: 2, project: 'b', day: 0, start: 14, end: 17, label: 'UI実装' },
  { id: 3, project: 'a', day: 1, start: 10, end: 16, label: 'バックエンド実装' },
  { id: 4, project: 'c', day: 2, start: 9, end: 12, label: '定例・デザイン確認', actual: true },
  { id: 5, project: 'b', day: 2, start: 13, end: 17, label: '商品ページ改善' },
  { id: 6, project: 'a', day: 3, start: 10, end: 15, label: '認証機能' },
  { id: 7, project: 'c', day: 4, start: 9, end: 13, label: 'CMS組み込み' },
]

export const clients: Client[] = [
  {id:'nova',name:'Nova Works',contact:'田中 健太',email:'kenta.tanaka@novaworks.jp',status:'active',projects:2,revenue:1720000,receivable:420000,lastActivity:'2026年7月1日',initials:'NW',color:'#4f91ae',soft:'#dceef7'},
  {id:'mellow',name:'Mellow Inc.',contact:'小林 美咲',email:'misaki@mellow.co.jp',status:'active',projects:1,revenue:1080000,receivable:280000,lastActivity:'2026年6月28日',initials:'MI',color:'#a06b79',soft:'#f8e2e7'},
  {id:'aster',name:'Aster Studio',contact:'山本 蓮',email:'ren@aster-studio.jp',status:'active',projects:2,revenue:1480000,receivable:350000,lastActivity:'2026年6月25日',initials:'AS',color:'#8b713c',soft:'#f4ead0'},
  {id:'lumen',name:'Lumen Design',contact:'鈴木 里奈',email:'rina@lumen-design.jp',status:'inactive',projects:1,revenue:620000,receivable:0,lastActivity:'2026年3月31日',initials:'LD',color:'#6f8792',soft:'#e8f0f3'},
]

export const invoices: Invoice[] = [
  {id: 'INV-2026-007', client: 'Nova Works', project: 'SaaS リニューアル', issueDate: '2026/07/01', dueDate: '2026/07/31', amount: 420000, status: 'pending'},
  {id: 'INV-2026-006', client: 'Mellow Inc.', project: 'ECサイト改善', issueDate: '2026/06/25', dueDate: '2026/07/25', amount: 280000, status: 'pending'},
  {id: 'INV-2026-005', client: 'Aster Studio', project: 'ブランドサイト', issueDate: '2026/06/01', dueDate: '2026/06/30', amount: 350000, status: 'overdue'},
  {id: 'INV-2026-004', client: 'Nova Works', project: 'SaaS リニューアル', issueDate: '2026/05/31', dueDate: '2026/06/30', amount: 380000, status: 'paid'},
  {id: 'INV-2026-003', client: 'Mellow Inc.', project: 'ECサイト改善', issueDate: '2026/05/20', dueDate: '2026/06/20', amount: 240000, status: 'paid'},
  {id: 'INV-2026-008', client: 'Aster Studio', project: '保守・運用', issueDate: '—', dueDate: '—', amount: 120000, status: 'draft'},
]


export const financeTransactions: FinanceTransaction[] = [
  {id: 1, date: '7月1日', type: 'income', title: 'Nova Works', category: 'SaaS リニューアル', amount: 420000, status: 'paid'},
  {id: 2, date: '6月28日', type: 'expense', title: 'Adobe Creative Cloud', category: 'ソフトウェア', amount: 7780, status: 'paid'},
  {id: 3, date: '6月25日', type: 'income', title: 'Mellow Inc.', category: 'ECサイト改善', amount: 280000, status: 'paid'},
  {id: 4, date: '6月20日', type: 'expense', title: 'AWS', category: 'サーバー費用', amount: 18420, status: 'paid'},
  {id: 5, date: '6月18日', type: 'income', title: 'Aster Studio', category: 'ブランドサイト', amount: 350000, status: 'pending'},
]

export const workRecords: WorkRecord[] = [
  {id: 1, date: '7月2日（木）', project: 'a', label: 'API設計・レビュー', start: '09:30', end: '12:30', hours: 3, status: 'confirmed'},
  {id: 2, date: '7月2日（木）', project: 'b', label: '商品ページ UI実装', start: '13:30', end: '17:00', hours: 3.5, status: 'draft'},
  {id: 3, date: '7月1日（水）', project: 'c', label: '定例・デザイン確認', start: '09:00', end: '12:00', hours: 3, status: 'confirmed'},
  {id: 4, date: '7月1日（水）', project: 'b', label: '商品ページ改善', start: '13:00', end: '17:30', hours: 4.5, status: 'confirmed'},
  {id: 5, date: '6月30日（火）', project: 'a', label: 'バックエンド実装', start: '10:00', end: '17:00', hours: 6, status: 'confirmed'},
  {id: 6, date: '6月29日（月）', project: 'a', label: 'API仕様確認', start: '10:00', end: '13:00', hours: 3, status: 'confirmed'},
]

export const projectDetails: Record<string, ProjectDetail> = {
  a: {status: 'active', statusLabel: '進行中', progress: 72, budget: '¥720,000', deadline: '7月31日', usedHours: 72, targetHours: 100},
  b: {status: 'active', statusLabel: '進行中', progress: 58, budget: '¥380,000', deadline: '8月15日', usedHours: 46, targetHours: 80},
  c: {status: 'attention', statusLabel: '確認待ち', progress: 43, budget: '¥450,000', deadline: '8月30日', usedHours: 34, targetHours: 80},
}
