import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  fetchApprovedFlavorImages,
  fetchUserFlavorImageSubmissions,
  submitFlavorImage,
} from "@/services/flavorImageService"
import { useAuth } from "@/context/AuthContext"

import {
  deleteFlavorRating,
  favoriteFlavor,
  fetchBrands,
  fetchBrandStatistics,
  fetchFavoriteFlavorIds,
  fetchFlavorById,
  fetchFlavorRatings,
  fetchFlavorStatistics,
  saveFlavorRating,
  unfavoriteFlavor,
} from "@/services/flavorService"

import type {
  Brand,
  BrandStatistics,
  CreateFlavorRatingInput,
  Flavor,
  FlavorImageSubmission,
  FlavorRating,
  SubmitFlavorImageInput,
} from "@/types/flavor"

type FlavorContextValue = {
  brands: Brand[]
  brandStatistics: BrandStatistics[]
  flavors: Flavor[]

  topFlavors: Flavor[]
  trendingFlavors: Flavor[]
  topBrands: BrandStatistics[]

  favoriteFlavorIds: string[]

  isLoading: boolean
  isRefreshing: boolean
  error: string | null

  refreshFlavors: () => Promise<void>
  getFlavorById: (flavorId: string) => Flavor | undefined
  loadFlavorById: (flavorId: string) => Promise<Flavor | null>
  loadFlavorRatings: (
    flavorId: string
  ) => Promise<FlavorRating[]>
  

  isFlavorFavorite: (flavorId: string) => boolean
  toggleFavoriteFlavor: (flavorId: string) => Promise<void>

  submitFlavorRating: (
    input: Omit<CreateFlavorRatingInput, "userId">
  ) => Promise<void>

  removeFlavorRating: (flavorId: string) => Promise<void>
}

const FlavorContext = createContext<
  FlavorContextValue | undefined
>(undefined)

type FlavorProviderProps = {
  children: ReactNode
}

export function FlavorProvider({
  children,
}: FlavorProviderProps) {
  const { user } = useAuth()

  const [brands, setBrands] = useState<Brand[]>([])
  const [brandStatistics, setBrandStatistics] = useState<
    BrandStatistics[]
  >([])
  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [favoriteFlavorIds, setFavoriteFlavorIds] = useState<
    string[]
  >([])

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCatalog = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const [
          brandsData,
          brandStatisticsData,
          flavorsData,
          favoriteIdsData,
        ] = await Promise.all([
          fetchBrands(),
          fetchBrandStatistics(),
          fetchFlavorStatistics(),
          user
            ? fetchFavoriteFlavorIds(user.id)
            : Promise.resolve([]),
        ])

        setBrands(brandsData)
        setBrandStatistics(brandStatisticsData)
        setFlavors(flavorsData)
        setFavoriteFlavorIds(favoriteIdsData)
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Could not load the flavor catalog."

        console.error("Could not load flavor catalog:", loadError)
        setError(message)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [user]
  )

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  const refreshFlavors = useCallback(async () => {
    await loadCatalog(true)
  }, [loadCatalog])

  const getFlavorById = useCallback(
    (flavorId: string) =>
      flavors.find((flavor) => flavor.id === flavorId),
    [flavors]
  )

  const loadFlavorById = useCallback(
    async (flavorId: string) => {
      const existingFlavor = flavors.find(
        (flavor) => flavor.id === flavorId
      )

      if (existingFlavor) {
        return existingFlavor
      }

      return fetchFlavorById(flavorId)
    },
    [flavors]
  )

  const loadFlavorRatings = useCallback(
    async (flavorId: string) => {
      return fetchFlavorRatings(flavorId)
    },
    []
  )

  const loadApprovedFlavorImages = useCallback(
  async (flavorId: string) => {
    return fetchApprovedFlavorImages(flavorId)
  },
  []
)

const loadMyFlavorImageSubmissions = useCallback(
  async (flavorId?: string) => {
    if (!user) {
      return []
    }

    return fetchUserFlavorImageSubmissions(
      user.id,
      flavorId
    )
  },
  [user]
)

const submitFlavorPhoto = useCallback(
  async (input: SubmitFlavorImageInput) => {
    if (!user) {
      throw new Error(
        "You must be signed in to submit a photo."
      )
    }

    return submitFlavorImage(input, user.id)
  },
  [user]
)

  const isFlavorFavorite = useCallback(
    (flavorId: string) =>
      favoriteFlavorIds.includes(flavorId),
    [favoriteFlavorIds]
  )

  const toggleFavoriteFlavor = useCallback(
    async (flavorId: string) => {
      if (!user) {
        throw new Error(
          "You must be signed in to favorite a flavor."
        )
      }

      const currentlyFavorite =
        favoriteFlavorIds.includes(flavorId)

      setFavoriteFlavorIds((currentIds) =>
        currentlyFavorite
          ? currentIds.filter((id) => id !== flavorId)
          : [...currentIds, flavorId]
      )

      setFlavors((currentFlavors) =>
        currentFlavors.map((flavor) => {
          if (flavor.id !== flavorId) {
            return flavor
          }

          return {
            ...flavor,
            favoriteCount: Math.max(
              0,
              flavor.favoriteCount +
                (currentlyFavorite ? -1 : 1)
            ),
          }
        })
      )

      try {
        if (currentlyFavorite) {
          await unfavoriteFlavor(flavorId, user.id)
        } else {
          await favoriteFlavor(flavorId, user.id)
        }
      } catch (favoriteError) {
        setFavoriteFlavorIds((currentIds) =>
          currentlyFavorite
            ? [...currentIds, flavorId]
            : currentIds.filter((id) => id !== flavorId)
        )

        setFlavors((currentFlavors) =>
          currentFlavors.map((flavor) => {
            if (flavor.id !== flavorId) {
              return flavor
            }

            return {
              ...flavor,
              favoriteCount: Math.max(
                0,
                flavor.favoriteCount +
                  (currentlyFavorite ? 1 : -1)
              ),
            }
          })
        )

        throw favoriteError
      }
    },
    [favoriteFlavorIds, user]
  )

  const submitFlavorRating = useCallback(
    async (
      input: Omit<CreateFlavorRatingInput, "userId">
    ) => {
      if (!user) {
        throw new Error(
          "You must be signed in to rate a flavor."
        )
      }

      await saveFlavorRating({
        ...input,
        userId: user.id,
      })

      const updatedFlavor = await fetchFlavorById(
        input.flavorId
      )

      if (updatedFlavor) {
        setFlavors((currentFlavors) =>
          currentFlavors.map((flavor) =>
            flavor.id === updatedFlavor.id
              ? updatedFlavor
              : flavor
          )
        )
      }
    },
    [user]
  )

  const removeFlavorRating = useCallback(
    async (flavorId: string) => {
      if (!user) {
        throw new Error(
          "You must be signed in to remove a rating."
        )
      }

      await deleteFlavorRating(flavorId, user.id)

      const updatedFlavor = await fetchFlavorById(flavorId)

      if (updatedFlavor) {
        setFlavors((currentFlavors) =>
          currentFlavors.map((flavor) =>
            flavor.id === updatedFlavor.id
              ? updatedFlavor
              : flavor
          )
        )
      }
    },
    [user]
  )

  const topFlavors = useMemo(() => {
  return [...flavors]
    .sort((a, b) => {
      if (b.averageRating !== a.averageRating) {
        return b.averageRating - a.averageRating
      }

      if (b.ratingCount !== a.ratingCount) {
        return b.ratingCount - a.ratingCount
      }

      if (b.favoriteCount !== a.favoriteCount) {
        return b.favoriteCount - a.favoriteCount
      }

      return a.name.localeCompare(b.name)
    })
    .slice(0, 10)
}, [flavors])



  const trendingFlavors = useMemo(() => {
    return [...flavors]
      .sort((a, b) => {
        if (b.publicMixCount !== a.publicMixCount) {
          return b.publicMixCount - a.publicMixCount
        }

        if (b.favoriteCount !== a.favoriteCount) {
          return b.favoriteCount - a.favoriteCount
        }

        return b.ratingCount - a.ratingCount
      })
      .slice(0, 10)
  }, [flavors])

  const topBrands = useMemo(() => {
    return [...brandStatistics]
      .sort((a, b) => {
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating
        }

        return b.ratingCount - a.ratingCount
      })
      .slice(0, 10)
  }, [brandStatistics])

  const value = useMemo<FlavorContextValue>(
    () => ({
      brands,
      brandStatistics,
      flavors,

      topFlavors,
      trendingFlavors,
      topBrands,

      favoriteFlavorIds,

      isLoading,
      isRefreshing,
      error,

      refreshFlavors,
      getFlavorById,
      loadFlavorById,
      loadFlavorRatings,

      isFlavorFavorite,
      toggleFavoriteFlavor,

      submitFlavorRating,
      removeFlavorRating,
      loadApprovedFlavorImages,
loadMyFlavorImageSubmissions,
submitFlavorPhoto,

    }),
    [
      brands,
      brandStatistics,
      flavors,
      topFlavors,
      trendingFlavors,
      topBrands,
      favoriteFlavorIds,
      isLoading,
      isRefreshing,
      error,
      refreshFlavors,
      getFlavorById,
      loadFlavorById,
      loadFlavorRatings,
      isFlavorFavorite,
      toggleFavoriteFlavor,
      submitFlavorRating,
      removeFlavorRating,
    ]
  )

  return (
    <FlavorContext.Provider value={value}>
      {children}
    </FlavorContext.Provider>
  )
}

export function useFlavors(): FlavorContextValue {
  loadApprovedFlavorImages: (
  flavorId: string
) => Promise<FlavorImageSubmission[]>

loadMyFlavorImageSubmissions: (
  flavorId?: string
) => Promise<FlavorImageSubmission[]>

submitFlavorPhoto: (
  input: SubmitFlavorImageInput
) => Promise<FlavorImageSubmission>
  const context = useContext(FlavorContext)

  if (!context) {
    throw new Error(
      "useFlavors must be used inside a FlavorProvider."
    )
  }

  return context
}