import { createContext, useContext, useEffect, useState } from 'react'
import { api, errorMessage, getUserId, setUserId } from './api'
import type { User } from './types'

interface AuthState {
  user: User | null
  users: User[]
  ready: boolean
  error: string | null
  switchUser: (id: string) => void
}

const Ctx = createContext<AuthState>({ user: null, users: [], ready: false, error: null, switchUser: () => {} })
export const useAuth = () => useContext(Ctx)

// PROTOTYPE: pick a seeded demo user. Real auth would replace this provider only.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<User[]>('/demo-users')
      .then((list) => {
        setUsers(list)
        const chosen = list.find((u) => u.id === getUserId()) ?? list[0] ?? null
        setUserId(chosen?.id ?? null)
        setUser(chosen)
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setReady(true))
  }, [])

  const switchUser = (id: string) => {
    const next = users.find((u) => u.id === id)
    if (!next) return
    setUserId(next.id)
    setUser(next)
  }

  return <Ctx.Provider value={{ user, users, ready, error, switchUser }}>{children}</Ctx.Provider>
}
