import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

type FollowContextValue = {
  followingIds: string[]
  isLoadingFollows: boolean

  followUser: (
    userId: string
  ) => Promise<void>

  unfollowUser: (
    userId: string
  ) => Promise<void>

  toggleFollow: (
    userId: string
  ) => Promise<void>

  isFollowing: (
    userId: string
  ) => boolean

  getFollowersCount: (
    userId: string
  ) => Promise<number>

  getFollowingCount: (
    userId: string
  ) => Promise<number>

  refreshFollowing: () => Promise<void>
}

type FollowProviderProps = {
  children: ReactNode
}

type FollowRow = {
  follower_id: string
  following_id: string
}

const FollowContext =
  createContext<
    FollowContextValue | undefined
  >(undefined)

export function FollowProvider({
  children,
}: FollowProviderProps) {
  const { user } = useAuth()

  const [
    followingIds,
    setFollowingIds,
  ] = useState<string[]>([])

  const [
    isLoadingFollows,
    setIsLoadingFollows,
  ] = useState(true)

  const refreshFollowing =
    useCallback(async () => {
      if (!user) {
        setFollowingIds([])
        setIsLoadingFollows(false)
        return
      }

      try {
        setIsLoadingFollows(true)

        const { data, error } =
          await supabase
            .from("user_follows")
            .select("following_id")
            .eq(
              "follower_id",
              user.id
            )

        if (error) {
          throw error
        }

        const rows =
          (data ?? []) as Pick<
            FollowRow,
            "following_id"
          >[]

        setFollowingIds(
          rows.map(
            (row) =>
              row.following_id
          )
        )
      } catch (error) {
        console.error(
          "Could not load followed users:",
          error
        )

        setFollowingIds([])
      } finally {
        setIsLoadingFollows(false)
      }
    }, [user])

  useEffect(() => {
    void refreshFollowing()
  }, [refreshFollowing])

  const followUser =
    useCallback(
      async (
        userId: string
      ): Promise<void> => {
        if (!user) {
          throw new Error(
            "SIGN_IN_REQUIRED"
          )
        }

        if (user.id === userId) {
          throw new Error(
            "You cannot follow yourself."
          )
        }

        if (
          followingIds.includes(
            userId
          )
        ) {
          return
        }

        /*
         * Optimistic update so the UI
         * changes immediately.
         */
        setFollowingIds(
          (current) => [
            ...current,
            userId,
          ]
        )

        const { error } =
          await supabase
            .from("user_follows")
            .insert({
              follower_id:
                user.id,
              following_id:
                userId,
            })

        if (error) {
          /*
           * Roll the optimistic
           * update back.
           */
          setFollowingIds(
            (current) =>
              current.filter(
                (id) =>
                  id !== userId
              )
          )

          if (
            error.code === "23505"
          ) {
            return
          }

          console.error(
            "Could not follow user:",
            error
          )

          throw error
        }
      },
      [
        followingIds,
        user,
      ]
    )

  const unfollowUser =
    useCallback(
      async (
        userId: string
      ): Promise<void> => {
        if (!user) {
          throw new Error(
            "SIGN_IN_REQUIRED"
          )
        }

        const wasFollowing =
          followingIds.includes(
            userId
          )

        if (!wasFollowing) {
          return
        }

        /*
         * Optimistic removal.
         */
        setFollowingIds(
          (current) =>
            current.filter(
              (id) =>
                id !== userId
            )
        )

        const { error } =
          await supabase
            .from("user_follows")
            .delete()
            .eq(
              "follower_id",
              user.id
            )
            .eq(
              "following_id",
              userId
            )

        if (error) {
          /*
           * Restore if the database
           * request failed.
           */
          setFollowingIds(
            (current) =>
              current.includes(
                userId
              )
                ? current
                : [
                    ...current,
                    userId,
                  ]
          )

          console.error(
            "Could not unfollow user:",
            error
          )

          throw error
        }
      },
      [
        followingIds,
        user,
      ]
    )

  const toggleFollow =
    useCallback(
      async (
        userId: string
      ) => {
        if (
          followingIds.includes(
            userId
          )
        ) {
          await unfollowUser(
            userId
          )
          return
        }

        await followUser(
          userId
        )
      },
      [
        followUser,
        followingIds,
        unfollowUser,
      ]
    )

  const isFollowing =
    useCallback(
      (userId: string) =>
        followingIds.includes(
          userId
        ),
      [followingIds]
    )

  const getFollowersCount =
    useCallback(
      async (
        userId: string
      ): Promise<number> => {
        const {
          count,
          error,
        } = await supabase
          .from("user_follows")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq(
            "following_id",
            userId
          )

        if (error) {
          console.error(
            "Could not load follower count:",
            error
          )

          throw error
        }

        return count ?? 0
      },
      []
    )

  const getFollowingCount =
    useCallback(
      async (
        userId: string
      ): Promise<number> => {
        const {
          count,
          error,
        } = await supabase
          .from("user_follows")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq(
            "follower_id",
            userId
          )

        if (error) {
          console.error(
            "Could not load following count:",
            error
          )

          throw error
        }

        return count ?? 0
      },
      []
    )

  const value =
    useMemo<FollowContextValue>(
      () => ({
        followingIds,
        isLoadingFollows,
        followUser,
        unfollowUser,
        toggleFollow,
        isFollowing,
        getFollowersCount,
        getFollowingCount,
        refreshFollowing,
      }),
      [
        followingIds,
        isLoadingFollows,
        followUser,
        unfollowUser,
        toggleFollow,
        isFollowing,
        getFollowersCount,
        getFollowingCount,
        refreshFollowing,
      ]
    )

  return (
    <FollowContext.Provider
      value={value}
    >
      {children}
    </FollowContext.Provider>
  )
}

export function useFollow() {
  const context =
    useContext(FollowContext)

  if (!context) {
    throw new Error(
      "useFollow must be used inside FollowProvider."
    )
  }

  return context
}