import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

export type MixVisibility = "private" | "public"

export type SavedMixIngredient = {
  id?: string
  flavorId: string
  flavorName: string
  brand?: string
  image?: string
  percentage: number
}

export type SavedMix = {
  id: string
  userId: string
  name: string
  notes: string
  visibility: MixVisibility
  sourceMixId?: string | null
  recipeKey?: string | null
  ingredients: SavedMixIngredient[]
  likeCount: number
  likedByMe: boolean
  creatorUsername?: string
  creatorAvatarUrl?: string | null
  createdAt: string
  updatedAt: string
}

type NewMix = {
  name: string
  notes: string
  ingredients: SavedMixIngredient[]
  visibility?: MixVisibility
  sourceMixId?: string | null
}

type MixUpdates = Partial<{
  name: string
  notes: string
  visibility: MixVisibility
  ingredients: SavedMixIngredient[]
}>

type MixContextValue = {
  savedMixes: SavedMix[]
  publicMixes: SavedMix[]
  isLoading: boolean
  isLoadingPublic: boolean

  saveMix: (mix: NewMix) => Promise<SavedMix>
  deleteMix: (mixId: string) => Promise<void>
  updateMix: (
    mixId: string,
    updates: MixUpdates
  ) => Promise<void>
  setMixVisibility: (
    mixId: string,
    visibility: MixVisibility
  ) => Promise<void>

  getMixById: (
    mixId: string
  ) => SavedMix | undefined
  refreshMixes: () => Promise<void>
  refreshPublicMixes: () => Promise<void>
  clearMixes: () => Promise<void>

  likeMix: (mixId: string) => Promise<void>
  unlikeMix: (mixId: string) => Promise<void>
  toggleLike: (mixId: string) => Promise<void>
}

type ProfileRow = {
  id: string
  username: string | null
  avatar_url: string | null
}

type MixRow = {
  id: string
  user_id: string
  name: string
  notes: string | null
  visibility: MixVisibility
  source_mix_id: string | null
  recipe_key: string | null
  created_at: string
  updated_at: string
  mix_ingredients?: MixIngredientRow[] | null
  mix_likes?: MixLikeRow[] | null
}

type MixIngredientRow = {
  id: string
  mix_id: string
  flavor_id: string
  flavor_name: string
  brand: string | null
  image: string | null
  percentage: number
}

type MixLikeRow = {
  user_id: string
}

type MixFilter = {
  userId?: string
  visibility?: MixVisibility
}

type MixProviderProps = {
  children: ReactNode
}

const MixContext =
  createContext<MixContextValue | undefined>(
    undefined
  )

const MIX_SELECT = `
  id,
  user_id,
  name,
  notes,
  visibility,
  source_mix_id,
  recipe_key,
  created_at,
  updated_at,
  mix_ingredients (
    id,
    mix_id,
    flavor_id,
    flavor_name,
    brand,
    image,
    percentage
  ),
  mix_likes (
    user_id
  )
`

function buildRecipeKey(
  ingredients: SavedMixIngredient[]
): string {
  const combined = new Map<string, number>()

  for (const ingredient of ingredients) {
    const flavorId = ingredient.flavorId
      .trim()
      .toLowerCase()

    combined.set(
      flavorId,
      (combined.get(flavorId) ?? 0) +
        Number(ingredient.percentage)
    )
  }

  return [...combined.entries()]
    .sort(([firstId], [secondId]) =>
      firstId.localeCompare(secondId)
    )
    .map(([flavorId, percentage]) => {
      const normalizedPercentage =
        Math.round(percentage * 100) / 100

      return `${flavorId}:${normalizedPercentage}`
    })
    .join("|")
}

function mapIngredientRow(
  ingredient: MixIngredientRow
): SavedMixIngredient {
  return {
    id: ingredient.id,
    flavorId: ingredient.flavor_id,
    flavorName: ingredient.flavor_name,
    brand: ingredient.brand ?? undefined,
    image: ingredient.image ?? undefined,
    percentage: Number(ingredient.percentage),
  }
}

function mapMixRow(
  row: MixRow,
  currentUserId?: string,
  profile?: ProfileRow
): SavedMix {
  const likes = row.mix_likes ?? []

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    notes: row.notes ?? "",
    visibility: row.visibility,
    sourceMixId: row.source_mix_id,
    recipeKey: row.recipe_key,
    ingredients: (row.mix_ingredients ?? []).map(
      mapIngredientRow
    ),
    likeCount: likes.length,
    likedByMe: Boolean(
      currentUserId &&
        likes.some(
          (like) =>
            like.user_id === currentUserId
        )
    ),
    creatorUsername:
      profile?.username?.trim() ||
      "CloudBlend user",
    creatorAvatarUrl:
      profile?.avatar_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function buildIngredientRows(
  mixId: string,
  ingredients: SavedMixIngredient[]
) {
  return ingredients.map((ingredient) => ({
    mix_id: mixId,
    flavor_id: ingredient.flavorId,
    flavor_name: ingredient.flavorName,
    brand: ingredient.brand ?? null,
    image: ingredient.image ?? null,
    percentage: ingredient.percentage,
  }))
}

function getFriendlyDatabaseError(
  error: { code?: string; message?: string }
): Error {
  if (error.code === "23505") {
    return new Error(
      "This exact recipe has already been published."
    )
  }

  if (error.code === "23514") {
    return new Error(
      "Saved community mixes must remain private."
    )
  }

  return new Error(
    error.message ||
      "Something went wrong while saving the mix."
  )
}

async function fetchCreatorProfiles(
  userIds: string[]
): Promise<Map<string, ProfileRow>> {
  const uniqueUserIds = [
    ...new Set(userIds.filter(Boolean)),
  ]

  const profilesById = new Map<
    string,
    ProfileRow
  >()

  if (uniqueUserIds.length === 0) {
    return profilesById
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", uniqueUserIds)

  if (error) {
    console.error(
      "Failed to fetch mix creator profiles:",
      error
    )

    return profilesById
  }

  for (const profile of (data ??
    []) as ProfileRow[]) {
    profilesById.set(profile.id, profile)
  }

  return profilesById
}

async function fetchCreatorProfile(
  userId: string
): Promise<ProfileRow | undefined> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.error(
      "Failed to load mix creator profile:",
      error
    )

    return undefined
  }

  return (
    (data as ProfileRow | null) ?? undefined
  )
}

async function fetchMixes(
  filter: MixFilter,
  currentUserId?: string
): Promise<SavedMix[]> {
  let query = supabase
    .from("mixes")
    .select(MIX_SELECT)
    .order("updated_at", {
      ascending: false,
    })

  if (filter.userId) {
    query = query.eq(
      "user_id",
      filter.userId
    )
  }

  if (filter.visibility) {
    query = query.eq(
      "visibility",
      filter.visibility
    )
  }

  const { data, error } = await query

  if (error) {
    console.error(
      "Failed to fetch mixes:",
      error
    )
    throw error
  }

  const mixRows = (data ??
    []) as unknown as MixRow[]

  if (mixRows.length === 0) {
    return []
  }

  const profilesById =
    await fetchCreatorProfiles(
      mixRows.map((row) => row.user_id)
    )

  return mixRows.map((row) =>
    mapMixRow(
      row,
      currentUserId,
      profilesById.get(row.user_id)
    )
  )
}

export function MixProvider({
  children,
}: MixProviderProps) {
  const { user } = useAuth()

  const [savedMixes, setSavedMixes] =
    useState<SavedMix[]>([])
  const [publicMixes, setPublicMixes] =
    useState<SavedMix[]>([])
  const [isLoading, setIsLoading] =
    useState(true)
  const [
    isLoadingPublic,
    setIsLoadingPublic,
  ] = useState(false)

  const refreshMixes = useCallback(async () => {
    if (!user) {
      setSavedMixes([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const mixes = await fetchMixes(
        { userId: user.id },
        user.id
      )

      setSavedMixes(mixes)
    } catch (error) {
      console.error(
        "Failed to load saved mixes:",
        error
      )
      setSavedMixes([])
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const refreshPublicMixes =
    useCallback(async () => {
      setIsLoadingPublic(true)

      try {
        const mixes = await fetchMixes(
          { visibility: "public" },
          user?.id
        )

        setPublicMixes(mixes)
      } catch (error) {
        console.error(
          "Failed to load public mixes:",
          error
        )
        setPublicMixes([])
        throw error
      } finally {
        setIsLoadingPublic(false)
      }
    }, [user?.id])

  useEffect(() => {
    refreshMixes().catch(() => {
      // Already logged.
    })
  }, [refreshMixes])

  const saveMix = useCallback(
    async (
      mix: NewMix
    ): Promise<SavedMix> => {
      if (!user) {
        throw new Error(
          "You must be signed in to save a mix."
        )
      }

      const recipeKey = buildRecipeKey(
        mix.ingredients
      )

      const visibility: MixVisibility =
        mix.sourceMixId
          ? "private"
          : mix.visibility ?? "private"

      const {
        data: insertedMix,
        error: mixError,
      } = await supabase
        .from("mixes")
        .insert({
          user_id: user.id,
          name: mix.name.trim(),
          notes: mix.notes.trim(),
          visibility,
          source_mix_id:
            mix.sourceMixId ?? null,
          recipe_key: recipeKey,
        })
        .select(`
          id,
          user_id,
          name,
          notes,
          visibility,
          source_mix_id,
          recipe_key,
          created_at,
          updated_at
        `)
        .single()

      if (mixError) {
        console.error(
          "Failed to create mix:",
          mixError
        )
        throw getFriendlyDatabaseError(
          mixError
        )
      }

      try {
        if (mix.ingredients.length > 0) {
          const {
            error: ingredientError,
          } = await supabase
            .from("mix_ingredients")
            .insert(
              buildIngredientRows(
                insertedMix.id,
                mix.ingredients
              )
            )

          if (ingredientError) {
            throw ingredientError
          }
        }
      } catch (error) {
        await supabase
          .from("mixes")
          .delete()
          .eq("id", insertedMix.id)
          .eq("user_id", user.id)

        console.error(
          "Failed to save mix ingredients:",
          error
        )

        throw error
      }

      const creatorProfile =
        await fetchCreatorProfile(user.id)

      const newMix: SavedMix = {
        id: insertedMix.id,
        userId: insertedMix.user_id,
        name: insertedMix.name,
        notes: insertedMix.notes ?? "",
        visibility:
          insertedMix.visibility,
        sourceMixId:
          insertedMix.source_mix_id,
        recipeKey:
          insertedMix.recipe_key,
        ingredients: mix.ingredients,
        likeCount: 0,
        likedByMe: false,
        creatorUsername:
          creatorProfile?.username?.trim() ||
          "CloudBlend user",
        creatorAvatarUrl:
          creatorProfile?.avatar_url ?? null,
        createdAt:
          insertedMix.created_at,
        updatedAt:
          insertedMix.updated_at,
      }

      setSavedMixes((currentMixes) => [
        newMix,
        ...currentMixes.filter(
          (savedMix) =>
            savedMix.id !== newMix.id
        ),
      ])

      if (
        newMix.visibility === "public"
      ) {
        setPublicMixes(
          (currentMixes) => [
            newMix,
            ...currentMixes.filter(
              (publicMix) =>
                publicMix.id !== newMix.id
            ),
          ]
        )
      }

      return newMix
    },
    [user]
  )

  const deleteMix = useCallback(
    async (
      mixId: string
    ): Promise<void> => {
      if (!user) {
        throw new Error(
          "You must be signed in to delete a mix."
        )
      }

      const { error } = await supabase
        .from("mixes")
        .delete()
        .eq("id", mixId)
        .eq("user_id", user.id)

      if (error) {
        console.error(
          "Failed to delete mix:",
          error
        )
        throw error
      }

      setSavedMixes((currentMixes) =>
        currentMixes.filter(
          (mix) => mix.id !== mixId
        )
      )

      setPublicMixes((currentMixes) =>
        currentMixes.filter(
          (mix) => mix.id !== mixId
        )
      )
    },
    [user]
  )

  const updateMix = useCallback(
    async (
      mixId: string,
      updates: MixUpdates
    ): Promise<void> => {
      if (!user) {
        throw new Error(
          "You must be signed in to update a mix."
        )
      }

      const currentMix =
        savedMixes.find(
          (mix) => mix.id === mixId
        ) ??
        publicMixes.find(
          (mix) => mix.id === mixId
        )

      if (!currentMix) {
        throw new Error(
          "Mix not found. Refresh your mixes and try again."
        )
      }

      if (
        updates.visibility === "public" &&
        currentMix.sourceMixId
      ) {
        throw new Error(
          "Saved community mixes cannot be published."
        )
      }

      const finalIngredients =
        updates.ingredients ??
        currentMix.ingredients

      const mixChanges: Record<
        string,
        unknown
      > = {
        updated_at:
          new Date().toISOString(),
        recipe_key:
          buildRecipeKey(
            finalIngredients
          ),
      }

      if (updates.name !== undefined) {
        mixChanges.name =
          updates.name.trim()
      }

      if (updates.notes !== undefined) {
        mixChanges.notes =
          updates.notes.trim()
      }

      if (
        updates.visibility !== undefined
      ) {
        mixChanges.visibility =
          updates.visibility
      }

      const {
        data: updatedMixRow,
        error: mixError,
      } = await supabase
        .from("mixes")
        .update(mixChanges)
        .eq("id", mixId)
        .eq("user_id", user.id)
        .select(`
          id,
          user_id,
          name,
          notes,
          visibility,
          source_mix_id,
          recipe_key,
          created_at,
          updated_at
        `)
        .single()

      if (mixError) {
        console.error(
          "Failed to update mix:",
          mixError
        )
        throw getFriendlyDatabaseError(
          mixError
        )
      }

      if (
        updates.ingredients !== undefined
      ) {
        const {
          error: deleteIngredientsError,
        } = await supabase
          .from("mix_ingredients")
          .delete()
          .eq("mix_id", mixId)

        if (deleteIngredientsError) {
          console.error(
            "Failed to remove old ingredients:",
            deleteIngredientsError
          )
          throw deleteIngredientsError
        }

        if (
          updates.ingredients.length > 0
        ) {
          const {
            error:
              insertIngredientsError,
          } = await supabase
            .from("mix_ingredients")
            .insert(
              buildIngredientRows(
                mixId,
                updates.ingredients
              )
            )

          if (
            insertIngredientsError
          ) {
            console.error(
              "Failed to insert updated ingredients:",
              insertIngredientsError
            )
            throw insertIngredientsError
          }
        }
      }

      const updatedLocalMix: SavedMix = {
        ...currentMix,
        name: updatedMixRow.name,
        notes:
          updatedMixRow.notes ?? "",
        visibility:
          updatedMixRow.visibility,
        sourceMixId:
          updatedMixRow.source_mix_id,
        recipeKey:
          updatedMixRow.recipe_key,
        ingredients: finalIngredients,
        updatedAt:
          updatedMixRow.updated_at,
      }

      setSavedMixes((currentMixes) => {
        const exists = currentMixes.some(
          (mix) => mix.id === mixId
        )

        if (!exists) {
          return [
            updatedLocalMix,
            ...currentMixes,
          ]
        }

        return currentMixes.map((mix) =>
          mix.id === mixId
            ? updatedLocalMix
            : mix
        )
      })

      setPublicMixes(
        (currentMixes) => {
          const withoutUpdatedMix =
            currentMixes.filter(
              (mix) =>
                mix.id !== mixId
            )

          if (
            updatedLocalMix.visibility ===
            "private"
          ) {
            return withoutUpdatedMix
          }

          return [
            updatedLocalMix,
            ...withoutUpdatedMix,
          ]
        }
      )
    },
    [
      user,
      savedMixes,
      publicMixes,
    ]
  )

  const setMixVisibility =
    useCallback(
      async (
        mixId: string,
        visibility: MixVisibility
      ): Promise<void> => {
        await updateMix(mixId, {
          visibility,
        })
      },
      [updateMix]
    )

  const getMixById = useCallback(
    (
      mixId: string
    ): SavedMix | undefined => {
      return (
        savedMixes.find(
          (mix) => mix.id === mixId
        ) ??
        publicMixes.find(
          (mix) => mix.id === mixId
        )
      )
    },
    [publicMixes, savedMixes]
  )

  const clearMixes =
    useCallback(async (): Promise<void> => {
      if (!user) {
        setSavedMixes([])
        return
      }

      const mixIds = savedMixes.map(
        (mix) => mix.id
      )

      if (mixIds.length === 0) {
        setSavedMixes([])
        return
      }

      const { error } = await supabase
        .from("mixes")
        .delete()
        .eq("user_id", user.id)

      if (error) {
        console.error(
          "Failed to clear mixes:",
          error
        )
        throw error
      }

      setSavedMixes([])

      setPublicMixes(
        (currentMixes) =>
          currentMixes.filter(
            (mix) =>
              !mixIds.includes(
                mix.id
              )
          )
      )
    }, [savedMixes, user])

  const updateLikeState = useCallback(
    (
      mixId: string,
      likedByMe: boolean,
      likeCountChange: number
    ) => {
      const updateMixLike = (
        mix: SavedMix
      ): SavedMix => {
        if (mix.id !== mixId) {
          return mix
        }

        return {
          ...mix,
          likedByMe,
          likeCount: Math.max(
            0,
            mix.likeCount +
              likeCountChange
          ),
        }
      }

      setSavedMixes(
        (currentMixes) =>
          currentMixes.map(
            updateMixLike
          )
      )

      setPublicMixes(
        (currentMixes) =>
          currentMixes.map(
            updateMixLike
          )
      )
    },
    []
  )

  const likeMix = useCallback(
    async (
      mixId: string
    ): Promise<void> => {
      if (!user) {
        throw new Error(
          "You must be signed in to like a mix."
        )
      }

      const currentMix =
        savedMixes.find(
          (mix) => mix.id === mixId
        ) ??
        publicMixes.find(
          (mix) => mix.id === mixId
        )

      if (
        currentMix?.likedByMe
      ) {
        return
      }

      updateLikeState(
        mixId,
        true,
        1
      )

      const { error } = await supabase
        .from("mix_likes")
        .insert({
          mix_id: mixId,
          user_id: user.id,
        })

      if (error) {
        updateLikeState(
          mixId,
          false,
          -1
        )

        if (
          error.code === "23505"
        ) {
          await Promise.all([
            refreshMixes(),
            refreshPublicMixes(),
          ])

          return
        }

        console.error(
          "Failed to like mix:",
          error
        )
        throw error
      }
    },
    [
      publicMixes,
      refreshMixes,
      refreshPublicMixes,
      savedMixes,
      updateLikeState,
      user,
    ]
  )

  const unlikeMix = useCallback(
    async (
      mixId: string
    ): Promise<void> => {
      if (!user) {
        throw new Error(
          "You must be signed in to unlike a mix."
        )
      }

      const currentMix =
        savedMixes.find(
          (mix) => mix.id === mixId
        ) ??
        publicMixes.find(
          (mix) => mix.id === mixId
        )

      if (
        currentMix &&
        !currentMix.likedByMe
      ) {
        return
      }

      updateLikeState(
        mixId,
        false,
        -1
      )

      const { error } = await supabase
        .from("mix_likes")
        .delete()
        .eq("mix_id", mixId)
        .eq("user_id", user.id)

      if (error) {
        updateLikeState(
          mixId,
          true,
          1
        )
        console.error(
          "Failed to unlike mix:",
          error
        )
        throw error
      }
    },
    [
      publicMixes,
      savedMixes,
      updateLikeState,
      user,
    ]
  )

  const toggleLike = useCallback(
    async (
      mixId: string
    ): Promise<void> => {
      if (!user) {
        throw new Error(
          "You must be signed in to like a mix."
        )
      }

      const mix =
        savedMixes.find(
          (savedMix) =>
            savedMix.id === mixId
        ) ??
        publicMixes.find(
          (publicMix) =>
            publicMix.id === mixId
        )

      if (!mix) {
        throw new Error(
          "Mix not found."
        )
      }

      if (mix.likedByMe) {
        await unlikeMix(mixId)
        return
      }

      await likeMix(mixId)
    },
    [
      likeMix,
      publicMixes,
      savedMixes,
      unlikeMix,
      user,
    ]
  )

  const value =
    useMemo<MixContextValue>(
      () => ({
        savedMixes,
        publicMixes,
        isLoading,
        isLoadingPublic,
        saveMix,
        deleteMix,
        updateMix,
        setMixVisibility,
        getMixById,
        refreshMixes,
        refreshPublicMixes,
        clearMixes,
        likeMix,
        unlikeMix,
        toggleLike,
      }),
      [
        savedMixes,
        publicMixes,
        isLoading,
        isLoadingPublic,
        saveMix,
        deleteMix,
        updateMix,
        setMixVisibility,
        getMixById,
        refreshMixes,
        refreshPublicMixes,
        clearMixes,
        likeMix,
        unlikeMix,
        toggleLike,
      ]
    )

  return (
    <MixContext.Provider value={value}>
      {children}
    </MixContext.Provider>
  )
}

export function useMixes() {
  const context =
    useContext(MixContext)

  if (!context) {
    throw new Error(
      "useMixes must be used inside a MixProvider"
    )
  }

  return context
}