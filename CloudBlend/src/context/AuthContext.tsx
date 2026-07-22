import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import * as Linking from "expo-linking"
import { router } from "expo-router"

import type { Session, User } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase"

type AuthResult = {
  error: string | null
  errorCode: string | null
  requiresEmailConfirmation?: boolean
}

type UsernameCheckResult = {
  available: boolean
  error: string | null
}

type PasswordResetResult = {
  error: string | null
  errorCode: string | null
  retryAfterSeconds?: number
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  isLoading: boolean

  signUp: (
    username: string,
    email: string,
    password: string
  ) => Promise<AuthResult>

  signIn: (
    email: string,
    password: string
  ) => Promise<AuthResult>

  signOut: () => Promise<{ error: string | null }>

  checkUsernameAvailability: (
    username: string
  ) => Promise<UsernameCheckResult>

  sendPasswordResetEmail: (
    email: string
  ) => Promise<PasswordResetResult>

  updatePassword: (
    password: string
  ) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
)

type AuthProviderProps = {
  children: ReactNode
}

const normalizeEmail = (email: string) =>
  email.trim().toLowerCase()

const normalizeUsername = (username: string) =>
  username.trim().toLowerCase()

function getFriendlyAuthError(
  message: string,
  code?: string
) {
  const normalizedMessage = message.toLowerCase()

  if (
    code === "user_already_exists" ||
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("already exists")
  ) {
    return "An account with this email already exists."
  }

  if (
    normalizedMessage.includes(
      "duplicate key value violates unique constraint"
    ) ||
    normalizedMessage.includes(
      "profiles_username_lower_unique"
    )
  ) {
    return "That username is already taken."
  }

  if (normalizedMessage.includes("invalid email")) {
    return "Please enter a valid email address."
  }

  if (
    code === "over_email_send_rate_limit" ||
    normalizedMessage.includes("email rate limit exceeded")
  ) {
    return "Too many reset emails were requested. Please wait a few minutes before trying again."
  }

  return message
}

function getTokensFromUrl(url: string) {
  const normalizedUrl = url.replace("#", "?")
  const parsedUrl = new URL(normalizedUrl)

  return {
    accessToken:
      parsedUrl.searchParams.get("access_token"),
    refreshToken:
      parsedUrl.searchParams.get("refresh_token"),
    type: parsedUrl.searchParams.get("type"),
  }
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [session, setSession] =
    useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const handleAuthUrl = useCallback(async (url: string) => {
    try {
      const {
        accessToken,
        refreshToken,
        type,
      } = getTokensFromUrl(url)

      if (!accessToken || !refreshToken) {
        return
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (error) {
        console.error(
          "Could not create recovery session:",
          error.message
        )
        return
      }

      if (type === "recovery") {
        router.replace("/reset-password")
      }
    } catch (error) {
      console.error(
        "Could not process authentication link:",
        error
      )
    }
  }, [])

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error(
            "Could not load session:",
            error.message
          )
        }

        setSession(data.session)
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("Could not load session:", error)
        setIsLoading(false)
      })

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleAuthUrl(url)
      }
    })

    const linkingSubscription =
      Linking.addEventListener("url", ({ url }) => {
        handleAuthUrl(url)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setSession(nextSession)
        setIsLoading(false)

        if (event === "PASSWORD_RECOVERY") {
          router.replace("/reset-password")
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      linkingSubscription.remove()
    }
  }, [handleAuthUrl])

  const checkUsernameAvailability = useCallback(
    async (
      username: string
    ): Promise<UsernameCheckResult> => {
      const normalizedUsername =
        normalizeUsername(username)

      if (!normalizedUsername) {
        return {
          available: false,
          error: "Username is required.",
        }
      }

      if (
        normalizedUsername.length < 3 ||
        normalizedUsername.length > 20
      ) {
        return {
          available: false,
          error:
            "Username must be between 3 and 20 characters.",
        }
      }

      if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
        return {
          available: false,
          error:
            "Username can only contain letters, numbers, and underscores.",
        }
      }

      const { data, error } = await supabase.rpc(
        "is_username_available",
        {
          candidate: normalizedUsername,
        }
      )

      if (error) {
        console.error(
          "Could not check username:",
          error.message
        )

        return {
          available: false,
          error:
            "Could not check the username right now.",
        }
      }

      return {
        available: data === true,
        error:
          data === true
            ? null
            : "That username is already taken.",
      }
    },
    []
  )

  const signIn = useCallback(
    async (
      email: string,
      password: string
    ): Promise<AuthResult> => {
      const { error } =
        await supabase.auth.signInWithPassword({
          email: normalizeEmail(email),
          password,
        })

      if (error) {
        return {
          error: getFriendlyAuthError(
            error.message,
            error.code
          ),
          errorCode: error.code ?? null,
        }
      }

      return {
        error: null,
        errorCode: null,
      }
    },
    []
  )

  const signUp = useCallback(
    async (
      username: string,
      email: string,
      password: string
    ): Promise<AuthResult> => {
      const normalizedUsername =
        normalizeUsername(username)

      const usernameCheck =
        await checkUsernameAvailability(
          normalizedUsername
        )

      if (!usernameCheck.available) {
        return {
          error:
            usernameCheck.error ??
            "That username is unavailable.",
          errorCode: "username_unavailable",
          requiresEmailConfirmation: false,
        }
      }

      const { data, error } =
        await supabase.auth.signUp({
          email: normalizeEmail(email),
          password,
          options: {
            data: {
              username: normalizedUsername,
            },
          },
        })

      if (error) {
        return {
          error: getFriendlyAuthError(
            error.message,
            error.code
          ),
          errorCode: error.code ?? null,
          requiresEmailConfirmation: false,
        }
      }

      return {
        error: null,
        errorCode: null,
        requiresEmailConfirmation: Boolean(
          data.user && !data.session
        ),
      }
    },
    [checkUsernameAvailability]
  )

  const sendPasswordResetEmail = useCallback(
    async (email: string): Promise<PasswordResetResult> => {
      const redirectTo =
        Linking.createURL("/reset-password")

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          normalizeEmail(email),
          {
            redirectTo,
          }
        )

      if (error) {
        const isRateLimited =
          error.code === "over_email_send_rate_limit" ||
          error.message
            .toLowerCase()
            .includes("email rate limit exceeded")

        return {
          error: getFriendlyAuthError(
            error.message,
            error.code
          ),
          errorCode:
            error.code ??
            (isRateLimited
              ? "over_email_send_rate_limit"
              : null),
          retryAfterSeconds: isRateLimited ? 60 : undefined,
        }
      }

      return {
        error: null,
        errorCode: null,
      }
    },
    []
  )

  const updatePassword = useCallback(
    async (password: string) => {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      return {
        error: error?.message ?? null,
      }
    },
    []
  )

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()

    return {
      error: error?.message ?? null,
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      signUp,
      signIn,
      signOut,
      checkUsernameAvailability,
      sendPasswordResetEmail,
      updatePassword,
    }),
    [
      session,
      isLoading,
      signUp,
      signIn,
      signOut,
      checkUsernameAvailability,
      sendPasswordResetEmail,
      updatePassword,
    ]
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
    throw new Error(
      "useAuth must be used inside an AuthProvider"
    )
  }

  return context
}