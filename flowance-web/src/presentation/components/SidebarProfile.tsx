'use client'

import {useCallback, useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import type {CurrentAuthContext} from '../../domain/auth'
import {authApi} from '../../infrastructure/api/authApi'
import {ApiError} from '../../infrastructure/api/apiClient'

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length > 1) return parts.slice(0, 2).map(part => Array.from(part)[0] ?? '').join('').toUpperCase()
  return Array.from(parts[0] ?? '').slice(0, 2).join('').toUpperCase()
}

export function SidebarProfile() {
  const router = useRouter()
  const [context, setContext] = useState<CurrentAuthContext | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      setContext(await authApi.getCurrentUser())
    } catch (cause) {
      setContext(null)
      if (cause instanceof ApiError && cause.status === 401) {
        router.replace('/login')
        return
      }
      setFailed(true)
    }
  }, [router])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="profile" aria-busy={!context && !failed}>
      <div className="avatar">{context ? initials(context.user.displayName) : ''}</div>
      <div>
        <strong>{context?.user.displayName ?? ''}</strong>
        <small>{context ? `${context.organization.name} · ${context.organization.role}` : ''}</small>
        {failed && <button type="button" className="profile-retry" onClick={() => void load()}>再読み込み</button>}
      </div>
    </div>
  )
}
