import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useColorScheme } from "react-native"

import {
  AppTheme,
  colors,
} from "@/constants/colors"

export type ThemeMode = "light" | "dark" | "system"

type AppThemeContextValue = {
  theme: AppTheme
  themeMode: ThemeMode
  resolvedTheme: "light" | "dark"
  isThemeLoading: boolean
  setThemeMode: (mode: ThemeMode) => Promise<void>
}

const THEME_STORAGE_KEY = "cloudblend_theme_mode"

const AppThemeContext =
  createContext<AppThemeContextValue | undefined>(undefined)

function isThemeMode(value: string | null): value is ThemeMode {
  return (
    value === "light" ||
    value === "dark" ||
    value === "system"
  )
}

export function AppThemeProvider({
  children,
}: {
  children: ReactNode
}) {
  const systemColorScheme = useColorScheme()

  const [themeMode, setThemeModeState] =
    useState<ThemeMode>("system")
  const [isThemeLoading, setIsThemeLoading] =
    useState(true)

  useEffect(() => {
    async function loadThemeMode() {
      try {
        const savedMode = await AsyncStorage.getItem(
          THEME_STORAGE_KEY
        )

        if (isThemeMode(savedMode)) {
          setThemeModeState(savedMode)
        }
      } catch (error) {
        console.error(
          "Could not load theme preference:",
          error
        )
      } finally {
        setIsThemeLoading(false)
      }
    }

    loadThemeMode()
  }, [])

  const setThemeMode = useCallback(
    async (mode: ThemeMode) => {
      setThemeModeState(mode)

      try {
        await AsyncStorage.setItem(
          THEME_STORAGE_KEY,
          mode
        )
      } catch (error) {
        console.error(
          "Could not save theme preference:",
          error
        )
      }
    },
    []
  )

  const resolvedTheme: "light" | "dark" =
    themeMode === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : themeMode

  const theme =
    resolvedTheme === "dark"
      ? colors.dark
      : colors.light

  const value = useMemo<AppThemeContextValue>(
    () => ({
      theme,
      themeMode,
      resolvedTheme,
      isThemeLoading,
      setThemeMode,
    }),
    [
      theme,
      themeMode,
      resolvedTheme,
      isThemeLoading,
      setThemeMode,
    ]
  )

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  )
}

export function useAppTheme() {
  const context = useContext(AppThemeContext)

  if (!context) {
    throw new Error(
      "useAppTheme must be used inside AppThemeProvider"
    )
  }

  return context
}