import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import type { Session, User } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase"

type AuthContextValue = {
  session: Session | null
  user: User | null
  isLoading: boolean
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>
  signOut: () => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error("Could not load session:", error.message)
        }

        setSession(data.session)
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("Could not load session:", error)
        setIsLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  })

  if (error) {
    throw error
  }

  if (data.user && !data.session) {
    return {
      requiresEmailConfirmation: true,
      message:
        "Account created! Check your email and confirm your account before signing in.",
    }
  }

  return {
    requiresEmailConfirmation: false,
    message: "Account created successfully!",
  }
}

  const signIn = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        error:
          "Please check your inbox and confirm your email before signing in.",
      }
    }

    return { error: error.message }
  }

  return { error: null }
}

  async function signOut() {
    const { error } = await supabase.auth.signOut()

    return {
      error: error?.message ?? null,
    }
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      signUp,
      signIn,
      signOut,
    }),
    [session, isLoading]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider")
  }

  return context
}