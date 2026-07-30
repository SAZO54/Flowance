'use client'

import type {ReactNode} from 'react'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {BriefcaseBusiness, CalendarDays, Clock3, LayoutDashboard, Plus, Search, Users} from 'lucide-react'
import {SidebarProfile} from '@/presentation/components/SidebarProfile'
import {AuthSessionProvider, useAuthSession} from '@/presentation/providers/AuthSessionProvider'

const navigation = [
  ['overview', 'ダッシュボード', LayoutDashboard, '/dashboard'],
  ['schedule', 'スケジュール', CalendarDays, '/schedule'],
  ['projects', '案件', BriefcaseBusiness, '/case'],
  ['work', '稼働記録', Clock3, '/timelog'],
  ['clients', 'クライアント', Users, '/client'],
  // TODO: Phase2 で収支、請求書、分析の導線を追加する。
] as const

type AppShellProps = {children: ReactNode; onAddWork?: () => void}

function isNavigationActive(pathname: string, id: string): boolean {
  if (id === 'projects') return pathname === '/case' || pathname.startsWith('/case/')
  if (id === 'clients') return pathname === '/client' || pathname.startsWith('/client/')
  return pathname === navigation.find(([candidate]) => candidate === id)?.[3]
}

function AppShellContent({children, onAddWork}: AppShellProps) {
  const pathname = usePathname()
  const {context, failed} = useAuthSession()
  const showWorkQuickAction = pathname !== '/timelog'
  const workQuickActionLabelId = 'header-work-quick-action-label'
  const workQuickActionLabel = '稼働実績を追加'

  const workQuickActionContent = <>
    <span className="header-quick-action-icon" aria-hidden="true">
      <Clock3/>
      <Plus/>
    </span>
    <span className="header-quick-action-tooltip" id={workQuickActionLabelId} role="tooltip">
      {workQuickActionLabel}
    </span>
  </>

  return <div className="app-shell" data-density={context?.appearance.compactMode ? 'compact' : 'comfortable'}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><span>flowance</span></div>
      <nav>
        <p className="nav-label">WORKSPACE</p>
        {navigation.slice(0, 4).map(([id,label,Icon,path]) => <Link href={path} key={id} className={isNavigationActive(pathname,id)?'active':''}><Icon size="1.125rem"/><span>{label}</span></Link>)}
        <p className="nav-label lower">INSIGHTS</p>
        {navigation.slice(4).map(([id,label,Icon,path]) => <Link href={path} key={id} className={isNavigationActive(pathname,id)?'active':''}><Icon size="1.125rem"/><span>{label}</span></Link>)}
      </nav>
      <div className="sidebar-bottom">
        <SidebarProfile/>
      </div>
    </aside>
    <main>
      <header>
        <div className="header-inner">
          <div className="mobile-brand">flowance</div>
          <div className="search"><Search size="1.0625rem"/><input aria-label="案件・クライアントを検索" placeholder="案件・クライアントを検索"/><kbd>⌘ K</kbd></div>
          <div className="header-actions">
            {showWorkQuickAction && (onAddWork
              ? <button
                  type="button"
                  className="header-quick-action"
                  aria-labelledby={workQuickActionLabelId}
                  onClick={onAddWork}
                >
                  {workQuickActionContent}
                </button>
              : <Link
                  className="header-quick-action"
                  href="/timelog?action=create"
                  aria-labelledby={workQuickActionLabelId}
                >
                  {workQuickActionContent}
                </Link>)}
          </div>
        </div>
      </header>
      <section className="content" aria-busy={!context && !failed}>{context ? children : null}</section>
    </main>
  </div>
}

export function AppShell(props: AppShellProps) {
  return <AuthSessionProvider><AppShellContent {...props}/></AuthSessionProvider>
}
