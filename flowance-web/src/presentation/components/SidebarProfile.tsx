'use client'

import {useAuthSession} from '@/presentation/providers/AuthSessionProvider'

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
  const {context, failed, refresh} = useAuthSession()
  return (
    <div className="profile" aria-busy={!context && !failed}>
      <div className="avatar">{context ? initials(context.user.displayName) : ''}</div>
      <div>
        <strong>{context?.user.displayName ?? ''}</strong>
        <small>
          {context
            ? `${context.organization.name} · ${context.organization.role}`
            : ''}
        </small>
        {failed && (
          <button
            type="button"
            className="profile-retry"
            onClick={() => void refresh()}
          >
            再読み込み
          </button>
        )}
      </div>
    </div>
  )
}
