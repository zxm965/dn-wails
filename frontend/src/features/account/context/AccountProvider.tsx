import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import {
  getAccountErrorMessage,
  getAuthState,
  loginUser,
  logoutUser,
  registerUser,
  type LoginInput,
  type Profile,
  type RegistrationInput,
} from '../api/accountApi'

interface AccountContextValue {
  loading: boolean
  errorMessage: string
  user: Profile | null
  refresh: () => Promise<Profile | null>
  login: (input: LoginInput) => Promise<Profile>
  register: (input: RegistrationInput) => Promise<Profile>
  logout: () => Promise<void>
  setUser: (user: Profile) => void
}

const AccountContext = createContext<AccountContextValue | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [user, setUserState] = useState<Profile | null>(null)

  const refresh = useCallback(async () => {
    try {
      const state = await getAuthState()
      const nextUser = state.authenticated ? state.user : null
      setUserState(nextUser)
      setErrorMessage('')
      return nextUser
    } catch (error) {
      setUserState(null)
      setErrorMessage(getAccountErrorMessage(error, '账号服务当前不可用，请稍后重试。'))
      throw error
    }
  }, [])

  useEffect(() => {
    void refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [refresh])

  const login = useCallback(async (input: LoginInput) => {
    const nextUser = await loginUser(input)
    setUserState(nextUser)
    setErrorMessage('')
    return nextUser
  }, [])

  const register = useCallback(async (input: RegistrationInput) => {
    const nextUser = await registerUser(input)
    setUserState(nextUser)
    setErrorMessage('')
    return nextUser
  }, [])

  const logout = useCallback(async () => {
    await logoutUser()
    setUserState(null)
  }, [])

  const setUser = useCallback((nextUser: Profile) => {
    setUserState(nextUser)
  }, [])

  const value = useMemo<AccountContextValue>(
    () => ({ loading, errorMessage, user, refresh, login, register, logout, setUser }),
    [errorMessage, loading, login, logout, refresh, register, setUser, user],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext)
  if (!value) throw new Error('useAccount must be used inside AccountProvider.')
  return value
}
