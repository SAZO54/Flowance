'use client'

import Link from 'next/link'
import {ChevronUp, LogOut, Settings} from 'lucide-react'
import {useEffect, useRef, useState} from 'react'
import {useAuthSession} from '@/presentation/providers/AuthSessionProvider'
import styles from './SidebarProfile.module.css'

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length > 1) {
    return parts.slice(0, 2)
      .map(part => Array.from(part)[0] ?? '')
      .join('')
      .toUpperCase()
  }
  return Array.from(parts[0] ?? '').slice(0, 2).join('').toUpperCase()
}

export function SidebarProfile() {
  const {context, failed, refresh, logout} = useAuthSession()
  const rootRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  useEffect(() => {
    if (!isOpen) return

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setLogoutError('')
    try {
      await logout()
    } catch (cause) {
      setLogoutError(cause instanceof Error ? cause.message : 'ログアウトできませんでした。')
      setIsLoggingOut(false)
    }
  }

  return (
    <div ref={rootRef} className={`profile ${styles.root}`} aria-busy={!context && !failed}>
      {context && isOpen && (
        <div className={styles.menu} role="menu" aria-label="アカウントメニュー">
          <Link href="/setting" role="menuitem" onClick={() => setIsOpen(false)}>
            <Settings size="1rem" aria-hidden="true"/>
            <span>設定</span>
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
          >
            <LogOut size="1rem" aria-hidden="true"/>
            <span>{isLoggingOut ? 'ログアウト中…' : 'ログアウト'}</span>
          </button>
          {logoutError && <p className={styles.error} role="alert">{logoutError}</p>}
        </div>
      )}

      {context ? (
        <button
          type="button"
          className={styles.trigger}
          onClick={() => setIsOpen(current => !current)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <span className="avatar">{initials(context.user.displayName)}</span>
          <span className={styles.details}>
            <strong title={context.user.displayName}>{context.user.displayName}</strong>
            <small>{`${context.organization.name} · ${context.organization.role}`}</small>
          </span>
          <ChevronUp className={styles.chevron} size="1rem" aria-hidden="true"/>
        </button>
      ) : failed ? (
        <button type="button" className="profile-retry" onClick={() => void refresh()}>
          再読み込み
        </button>
      ) : null}
    </div>
  )
}
