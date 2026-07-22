import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

const MIX_STORAGE_KEY = "@cloudblend_saved_mixes"

export type SavedMixIngredient = {
  flavorId: string
  flavorName: string
  brand?: string
  image?: string
  percentage: number
}

export type SavedMix = {
  id: string
  name: string
  notes: string
  ingredients: SavedMixIngredient[]
  createdAt: string
  updatedAt: string
}

type NewMix = Omit<SavedMix, "id" | "createdAt" | "updatedAt">

type MixContextValue = {
  savedMixes: SavedMix[]
  isLoading: boolean
  saveMix: (mix: NewMix) => Promise<SavedMix>
  deleteMix: (mixId: string) => Promise<void>
  updateMix: (
    mixId: string,
    updates: Partial<Omit<SavedMix, "id" | "createdAt">>
  ) => Promise<void>
  getMixById: (mixId: string) => SavedMix | undefined
  clearMixes: () => Promise<void>
}

const MixContext = createContext<MixContextValue | undefined>(undefined)

type MixProviderProps = {
  children: ReactNode
}

export function MixProvider({ children }: MixProviderProps) {
  const [savedMixes, setSavedMixes] = useState<SavedMix[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMixes()
  }, [])

  async function loadMixes() {
    try {
      const storedMixes = await AsyncStorage.getItem(MIX_STORAGE_KEY)

      if (!storedMixes) {
        setSavedMixes([])
        return
      }

      const parsedMixes: SavedMix[] = JSON.parse(storedMixes)

      setSavedMixes(Array.isArray(parsedMixes) ? parsedMixes : [])
    } catch (error) {
      console.error("Failed to load saved mixes:", error)
      setSavedMixes([])
    } finally {
      setIsLoading(false)
    }
  }

  async function persistMixes(mixes: SavedMix[]) {
    try {
      await AsyncStorage.setItem(MIX_STORAGE_KEY, JSON.stringify(mixes))
    } catch (error) {
      console.error("Failed to save mixes:", error)
      throw error
    }
  }

  async function saveMix(mix: NewMix) {
    const now = new Date().toISOString()

    const newMix: SavedMix = {
      ...mix,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    }

    const updatedMixes = [newMix, ...savedMixes]

    setSavedMixes(updatedMixes)
    await persistMixes(updatedMixes)

    return newMix
  }

  async function deleteMix(mixId: string) {
    const updatedMixes = savedMixes.filter((mix) => mix.id !== mixId)

    setSavedMixes(updatedMixes)
    await persistMixes(updatedMixes)
  }

  async function updateMix(
    mixId: string,
    updates: Partial<Omit<SavedMix, "id" | "createdAt">>
  ) {
    const updatedMixes = savedMixes.map((mix) => {
      if (mix.id !== mixId) {
        return mix
      }

      return {
        ...mix,
        ...updates,
        id: mix.id,
        createdAt: mix.createdAt,
        updatedAt: new Date().toISOString(),
      }
    })

    setSavedMixes(updatedMixes)
    await persistMixes(updatedMixes)
  }

  function getMixById(mixId: string) {
    return savedMixes.find((mix) => mix.id === mixId)
  }

  async function clearMixes() {
    setSavedMixes([])
    await AsyncStorage.removeItem(MIX_STORAGE_KEY)
  }

  const value = useMemo(
    () => ({
      savedMixes,
      isLoading,
      saveMix,
      deleteMix,
      updateMix,
      getMixById,
      clearMixes,
    }),
    [savedMixes, isLoading]
  )

  return <MixContext.Provider value={value}>{children}</MixContext.Provider>
}

export function useMixes() {
  const context = useContext(MixContext)

  if (!context) {
    throw new Error("useMixes must be used inside a MixProvider")
  }

  return context
}