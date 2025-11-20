"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

export type User = {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  image_url?: string | null
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  accessToken: string | null
  login: (email: string, password: string) => Promise<void>
  register: (args: {
    email: string
    username: string
    password: string
  }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

useEffect(() => {
  ;(async () => {
    try {
      const res = await fetch("/api/auth/me")
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setAccessToken(data.access)
      } else {
        setUser(null)
        setAccessToken(null)
      }
    } catch (e) {
      console.error("me error", e)
      setUser(null)
      setAccessToken(null)
    } finally {
      setLoading(false)
    }
  })()
}, [])

async function login(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || "Login fehlgeschlagen")
  }

  const meRes = await fetch("/api/auth/me")
  if (meRes.ok) {
    const data = await meRes.json()
    setUser(data.user)
    setAccessToken(data.access)
  }
}
  async function register({
    email,
    username,
    password,
  }: {
    email: string
    username: string
    password: string
  }) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    })

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as any
      const detail =
        data.detail ||
        data.email?.[0] ||
        data.username?.[0] ||
        data.password?.[0] ||
        "Registrierung fehlgeschlagen"
      throw new Error(detail)
    }
    await login(email, password)
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (e) {
      console.error("logout error", e)
    } finally {
      setUser(null)
      setAccessToken(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, accessToken, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth muss innerhalb eines AuthProvider verwendet werden")
  }
  return ctx
}
