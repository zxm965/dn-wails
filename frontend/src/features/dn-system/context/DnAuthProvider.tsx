import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import {
  getAuthState,
  loginUser,
  logoutUser,
  registerUser,
  type LoginInput,
  type Profile,
  type RegistrationInput,
} from '../api/dnSystemApi'

interface DnAuthContextValue {
  loading: boolean
  user: Profile | null
  expiresAt: string
  refresh: () => Promise<Profile | null>
  login: (input: LoginInput) => Promise<Profile>
  register: (input: RegistrationInput) => Promise<Profile>
  logout: () => Promise<void>
  setUser: (user: Profile) => void
}

const DnAuthContext = createContext<DnAuthContextValue | null>(null)

export function DnAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUserState] = useState<Profile | null>(null)
  const [expiresAt, setExpiresAt] = useState('')

  const refresh = useCallback(async () => {
    const state = await getAuthState()
    const nextUser = state.authenticated ? state.user : null
    setUserState(nextUser)
    setExpiresAt(state.authenticated ? state.expiresAt : '')
    return nextUser
  }, [])

  useEffect(() => {
    void refresh()
      .catch(() => {
        setUserState(null)
        setExpiresAt('')
      })
      .finally(() => setLoading(false))
  }, [refresh])

  useEffect(() => {
    if (!user) return
    const timer = window.setInterval(
      () => {
        void refresh().catch(() => {
          setUserState(null)
          setExpiresAt('')
        })
      },
      5 * 60 * 1000,
    )
    return () => window.clearInterval(timer)
  }, [refresh, user?.id])

  const login = useCallback(async (input: LoginInput) => {
    const nextUser = await loginUser(input)
    setUserState(nextUser)
    const state = await getAuthState()
    setExpiresAt(state.expiresAt)
    return nextUser
  }, [])

  const register = useCallback(async (input: RegistrationInput) => {
    const nextUser = await registerUser(input)
    setUserState(nextUser)
    const state = await getAuthState()
    setExpiresAt(state.expiresAt)
    return nextUser
  }, [])

  const logout = useCallback(async () => {
    await logoutUser()
    setUserState(null)
    setExpiresAt('')
  }, [])

  const setUser = useCallback((nextUser: Profile) => {
    setUserState(nextUser)
  }, [])

  const value = useMemo<DnAuthContextValue>(
    () => ({ loading, user, expiresAt, refresh, login, register, logout, setUser }),
    [expiresAt, loading, login, logout, refresh, register, setUser, user],
  )

  return <DnAuthContext.Provider value={value}>{children}</DnAuthContext.Provider>
}

export function useDnAuth(): DnAuthContextValue {
  const value = useContext(DnAuthContext)
  if (!value) throw new Error('useDnAuth must be used inside DnAuthProvider.')
  return value
}
