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

export type UserProfile = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string
  createdAt: string
  updatedAt: string
}

type ProfileUpdates = {
  username: string
  displayName: string
  bio: string
  avatarUrl?: string | null
}

type ProfileContextValue = {
  profile: UserProfile | null
  isLoadingProfile: boolean
  isSavingProfile: boolean
  refreshProfile: () => Promise<void>
  updateProfile: (
    updates: ProfileUpdates
  ) => Promise<{ error: string | null }>
  uploadAvatar: (
    uri: string,
    mimeType?: string | null
  ) => Promise<{ url: string | null; error: string | null }>
  removeAvatar: () => Promise<{ error: string | null }>
}

type ProfileRow = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

const ProfileContext =
  createContext<ProfileContextValue | undefined>(undefined)

function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? "",
    avatarUrl: row.avatar_url,
    bio: row.bio ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase()
}

function getAvatarExtension(
  uri: string,
  mimeType?: string | null
) {
  if (mimeType?.includes("png")) return "png"
  if (mimeType?.includes("webp")) return "webp"
  if (mimeType?.includes("heic")) return "heic"

  const pathExtension = uri
    .split("?")[0]
    .split(".")
    .pop()
    ?.toLowerCase()

  if (
    pathExtension &&
    ["jpg", "jpeg", "png", "webp", "heic"].includes(
      pathExtension
    )
  ) {
    return pathExtension
  }

  return "jpg"
}

function getContentType(extension: string) {
  if (extension === "png") return "image/png"
  if (extension === "webp") return "image/webp"
  if (extension === "heic") return "image/heic"
  return "image/jpeg"
}

export function ProfileProvider({
  children,
}: {
  children: ReactNode
}) {
  const { user } = useAuth()

  const [profile, setProfile] =
    useState<UserProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] =
    useState(true)
  const [isSavingProfile, setIsSavingProfile] =
    useState(false)

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setIsLoadingProfile(false)
      return
    }

    setIsLoadingProfile(true)

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
            id,
            username,
            display_name,
            avatar_url,
            bio,
            created_at,
            updated_at
          `
        )
        .eq("id", user.id)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        const fallbackUsername =
          user.user_metadata?.username ??
          `user_${user.id.slice(0, 8)}`

        const { data: created, error: createError } =
          await supabase
            .from("profiles")
            .insert({
              id: user.id,
              username: normalizeUsername(fallbackUsername),
              display_name:
                user.user_metadata?.display_name ?? null,
            })
            .select(
              `
                id,
                username,
                display_name,
                avatar_url,
                bio,
                created_at,
                updated_at
              `
            )
            .single()

        if (createError) {
          throw createError
        }

        setProfile(mapProfile(created as ProfileRow))
        return
      }

      setProfile(mapProfile(data as ProfileRow))
    } catch (error) {
      console.error("Could not load profile:", error)
      setProfile(null)
      throw error
    } finally {
      setIsLoadingProfile(false)
    }
  }, [user])

  useEffect(() => {
    refreshProfile().catch(() => {
      // Error is logged in refreshProfile.
    })
  }, [refreshProfile])

  const updateProfile = useCallback(
    async (
      updates: ProfileUpdates
    ): Promise<{ error: string | null }> => {
      if (!user) {
        return { error: "You must be signed in." }
      }

      const username = normalizeUsername(updates.username)
      const displayName = updates.displayName.trim()
      const bio = updates.bio.trim()

      if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        return {
          error:
            "Username must be 3–20 characters and contain only letters, numbers, or underscores.",
        }
      }

      if (displayName.length > 40) {
        return {
          error:
            "Display name cannot be longer than 40 characters.",
        }
      }

      if (bio.length > 160) {
        return {
          error: "Bio cannot be longer than 160 characters.",
        }
      }

      setIsSavingProfile(true)

      try {
        if (username !== profile?.username) {
          const { data: available, error: checkError } =
            await supabase.rpc("is_username_available", {
              candidate: username,
            })

          if (checkError) {
            throw checkError
          }

          if (!available) {
            return {
              error: "That username is already taken.",
            }
          }
        }

        const changes: Record<string, unknown> = {
          username,
          display_name: displayName || null,
          bio: bio || null,
        }

        if (updates.avatarUrl !== undefined) {
          changes.avatar_url = updates.avatarUrl
        }

        const { data, error } = await supabase
          .from("profiles")
          .update(changes)
          .eq("id", user.id)
          .select(
            `
              id,
              username,
              display_name,
              avatar_url,
              bio,
              created_at,
              updated_at
            `
          )
          .single()

        if (error) {
          if (
            error.code === "23505" ||
            error.message
              .toLowerCase()
              .includes("profiles_username_lower_unique")
          ) {
            return {
              error: "That username is already taken.",
            }
          }

          throw error
        }

        setProfile(mapProfile(data as ProfileRow))

        await supabase.auth.updateUser({
          data: {
            username,
            display_name: displayName || null,
          },
        })

        return { error: null }
      } catch (error: any) {
        console.error("Could not update profile:", error)
        return {
          error:
            error?.message ??
            "Could not update your profile.",
        }
      } finally {
        setIsSavingProfile(false)
      }
    },
    [profile?.username, user]
  )

  const uploadAvatar = useCallback(
    async (
      uri: string,
      mimeType?: string | null
    ): Promise<{
      url: string | null
      error: string | null
    }> => {
      if (!user) {
        return {
          url: null,
          error: "You must be signed in.",
        }
      }

      setIsSavingProfile(true)

      try {
        const extension = getAvatarExtension(uri, mimeType)
        const filePath = `${user.id}/avatar-${Date.now()}.${extension}`

        const response = await fetch(uri)
        const arrayBuffer = await response.arrayBuffer()

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, arrayBuffer, {
            contentType:
              mimeType ?? getContentType(extension),
            upsert: true,
          })

        if (uploadError) {
          throw uploadError
        }

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath)

        const { data, error: profileError } =
          await supabase
            .from("profiles")
            .update({
              avatar_url: publicUrl,
            })
            .eq("id", user.id)
            .select(
              `
                id,
                username,
                display_name,
                avatar_url,
                bio,
                created_at,
                updated_at
              `
            )
            .single()

        if (profileError) {
          throw profileError
        }

        setProfile(mapProfile(data as ProfileRow))

        return {
          url: publicUrl,
          error: null,
        }
      } catch (error: any) {
        console.error("Could not upload avatar:", error)

        return {
          url: null,
          error:
            error?.message ??
            "Could not upload your profile picture.",
        }
      } finally {
        setIsSavingProfile(false)
      }
    },
    [user]
  )

  const removeAvatar = useCallback(async () => {
    if (!user) {
      return { error: "You must be signed in." }
    }

    setIsSavingProfile(true)

    try {
      const { data: files, error: listError } =
        await supabase.storage
          .from("avatars")
          .list(user.id)

      if (listError) {
        throw listError
      }

      if (files && files.length > 0) {
        const paths = files.map(
          (file) => `${user.id}/${file.name}`
        )

        const { error: removeError } =
          await supabase.storage
            .from("avatars")
            .remove(paths)

        if (removeError) {
          throw removeError
        }
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id)
        .select(
          `
            id,
            username,
            display_name,
            avatar_url,
            bio,
            created_at,
            updated_at
          `
        )
        .single()

      if (error) {
        throw error
      }

      setProfile(mapProfile(data as ProfileRow))

      return { error: null }
    } catch (error: any) {
      console.error("Could not remove avatar:", error)
      return {
        error:
          error?.message ??
          "Could not remove your profile picture.",
      }
    } finally {
      setIsSavingProfile(false)
    }
  }, [user])

  const value = useMemo(
    () => ({
      profile,
      isLoadingProfile,
      isSavingProfile,
      refreshProfile,
      updateProfile,
      uploadAvatar,
      removeAvatar,
    }),
    [
      profile,
      isLoadingProfile,
      isSavingProfile,
      refreshProfile,
      updateProfile,
      uploadAvatar,
      removeAvatar,
    ]
  )

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)

  if (!context) {
    throw new Error(
      "useProfile must be used inside a ProfileProvider"
    )
  }

  return context
}