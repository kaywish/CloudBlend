import "react-native-url-polyfill/auto"

import AsyncStorage from "@react-native-async-storage/async-storage"
import { createClient } from "@supabase/supabase-js"
import { Platform } from "react-native"

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL in the project .env file."
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_ANON_KEY in the project .env file."
  )
}

/**
 * Safe storage for Expo Router web rendering.
 *
 * During server/static rendering, `window` does not exist, so this
 * temporarily returns null instead of trying to access browser storage.
 */
const webStorage = {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === "undefined") {
      return null
    }

    return window.localStorage.getItem(key)
  },

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === "undefined") {
      return
    }

    window.localStorage.setItem(key, value)
  },

  async removeItem(key: string): Promise<void> {
    if (typeof window === "undefined") {
      return
    }

    window.localStorage.removeItem(key)
  },
}

const storage =
  Platform.OS === "web"
    ? webStorage
    : AsyncStorage

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)