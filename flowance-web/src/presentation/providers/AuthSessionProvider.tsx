'use client'

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {useRouter} from 'next/navigation'
import type {CurrentAuthContext} from '@/domain/auth'
import {ApiError} from '@/infrastructure/api/apiClient'
import {authApi} from '@/infrastructure/api/authApi'

type AuthSessionValue = {
  context: CurrentAuthContext | null
  failed: boolean
  refresh: () => Promise<void>
  setContext: Dispatch<SetStateAction<CurrentAuthContext | null>>
}

const AuthSessionContext = createContext<AuthSessionValue | null>(null)

export function AuthSessionProvider({children}: {children: ReactNode}) {
  const router = useRouter()
  const [context, setContext] = useState<CurrentAuthContext | null>(null)
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(async () => {
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
    void refresh()
  }, [refresh])

  const value = useMemo(
    () => ({context, failed, refresh, setContext}),
    [context, failed, refresh],
  )
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}

export function useAuthSession(): AuthSessionValue {
  const value = useContext(AuthSessionContext)
  if (!value) throw new Error('useAuthSession must be used inside AuthSessionProvider.')
  return value
}

