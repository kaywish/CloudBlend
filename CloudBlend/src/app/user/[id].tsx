import { Ionicons } from "@expo/vector-icons"
import { router, useFocusEffect, useLocalSearchParams } from "expo-router"
import { useCallback, useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppTheme } from "@/constants/colors"
import { useAppTheme } from "@/context/AppThemeContext"
import { useAuth } from "@/context/AuthContext"
import { SavedMix, useMixes } from "@/context/MixContext"
import { supabase } from "@/lib/supabase"
import { useFollow } from "@/context/FollowContext"

type PublicProfile = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string
  createdAt: string | null
}

type ProfileRow = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string | null
}

function formatJoinedDate(date?: string | null) {
  if (!date) {
    return "Recently"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(date))
}

function getInitials(
  displayName?: string,
  username?: string
) {
  const source =
    displayName?.trim() ||
    username?.trim() ||
    "K"

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("")
}

export default function PublicUserProfileScreen() {
    const {
  isFollowing,
  toggleFollow,
  getFollowersCount,
  getFollowingCount,
} = useFollow()

const [followersCount, setFollowersCount] =
  useState(0)

const [followingCount, setFollowingCount] =
  useState(0)

const [isUpdatingFollow, setIsUpdatingFollow] =
  useState(false)

  const { id } = useLocalSearchParams<{
    id: string
  }>()

  const userId = Array.isArray(id)
    ? id[0]
    : id

  const { theme } = useAppTheme()
  const styles = useMemo(
    () => getStyles(theme),
    [theme]
  )

  const { user } = useAuth()

  const {
    publicMixes,
    isLoadingPublic,
    refreshPublicMixes,
  } = useMixes()

  const [profile, setProfile] =
    useState<PublicProfile | null>(null)

  const [isLoadingProfile, setIsLoadingProfile] =
    useState(true)

  const [isRefreshing, setIsRefreshing] =
    useState(false)

  const [profileError, setProfileError] =
    useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      setProfileError("Profile not found.")
      setIsLoadingProfile(false)
      return
    }

    try {
      setIsLoadingProfile(true)
      setProfileError(null)

      const { data, error } =
        await supabase
          .from("profiles")
          .select(`
            id,
            username,
            display_name,
            avatar_url,
            bio,
            created_at
          `)
          .eq("id", userId)
          .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        setProfile(null)
        setProfileError(
          "This KloudIt profile could not be found."
        )
        return
      }

      const row = data as ProfileRow

      setProfile({
        id: row.id,
        username:
          row.username?.trim() ||
          "kloudit_user",
        displayName:
          row.display_name?.trim() ||
          row.username?.trim() ||
          "KloudIt User",
        avatarUrl:
          row.avatar_url ?? null,
        bio: row.bio?.trim() || "",
        createdAt:
          row.created_at ?? null,
      })
    } catch (error) {
      console.error(
        "Could not load public profile:",
        error
      )

      setProfile(null)
      setProfileError(
        "Something went wrong while loading this profile."
      )
    } finally {
      setIsLoadingProfile(false)
    }
  }, [userId])

    const loadFollowCounts = useCallback(
  async () => {
    if (!userId) {
      return
    }

    try {
      const [
        followers,
        following,
      ] = await Promise.all([
        getFollowersCount(userId),
        getFollowingCount(userId),
      ])

      setFollowersCount(followers)
      setFollowingCount(following)
    } catch (error) {
      console.error(
        "Could not load follow counts:",
        error
      )
    }
  },
  [
    getFollowersCount,
    getFollowingCount,
    userId,
  ]
)

useFocusEffect(
  useCallback(() => {
    void Promise.all([
      loadProfile(),
      refreshPublicMixes(),
      loadFollowCounts(),
    ]).catch((error) => {
      console.error(
        "Could not refresh public profile:",
        error
      )
    })
  }, [
    loadProfile,
    refreshPublicMixes,
    loadFollowCounts,
  ])
)

  const userMixes = useMemo(
    () =>
      publicMixes
        .filter(
          (mix) =>
            mix.userId === userId &&
            mix.visibility === "public"
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() -
            new Date(a.updatedAt).getTime()
        ),
    [publicMixes, userId]
  )

  const totalLikes = useMemo(
    () =>
      userMixes.reduce(
        (total, mix) =>
          total + (mix.likeCount ?? 0),
        0
      ),
    [userMixes]
  )

  const totalRatings = useMemo(
    () =>
      userMixes.reduce(
        (total, mix) =>
          total + (mix.ratingCount ?? 0),
        0
      ),
    [userMixes]
  )

  const averageRating = useMemo(() => {
    if (totalRatings === 0) {
      return 0
    }

    const ratingTotal =
      userMixes.reduce(
        (total, mix) =>
          total +
          (mix.averageRating ?? 0) *
            (mix.ratingCount ?? 0),
        0
      )

    return ratingTotal / totalRatings
  }, [totalRatings, userMixes])



async function handleRefresh() {
  setIsRefreshing(true)

  try {
    await Promise.all([
      loadProfile(),
      refreshPublicMixes(),
      loadFollowCounts(),
    ])
  } finally {
    setIsRefreshing(false)
  }
}

async function handleToggleFollow() {
  if (!user) {
    router.push("/auth")
    return
  }

  if (!profile || isUpdatingFollow) {
    return
  }

  const wasFollowing =
    isFollowing(profile.id)

  try {
    setIsUpdatingFollow(true)

    await toggleFollow(profile.id)

    setFollowersCount((current) =>
      wasFollowing
        ? Math.max(0, current - 1)
        : current + 1
    )
  } catch (error) {
    console.error(
      "Could not update follow:",
      error
    )
  } finally {
    setIsUpdatingFollow(false)
  }
}

  function openMix(mixId: string) {
    router.push({
      pathname: "/mix/[id]",
      params: {
        id: mixId,
      },
    })
  }

  if (
    isLoadingProfile &&
    !profile
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={["top"]}
      >
        <View style={styles.center}>
          <View style={styles.loadingIcon}>
            <Ionicons
              name="person"
              size={27}
              color="#FFFFFF"
            />
          </View>

          <ActivityIndicator
            size="large"
            color={theme.primary}
            style={styles.loadingIndicator}
          />

          <Text style={styles.loadingTitle}>
            Loading profile
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={["top"]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={theme.text}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Profile
          </Text>

          <View
            style={styles.headerButton}
          />
        </View>

        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="person-outline"
              size={38}
              color={theme.primary}
            />
          </View>

          <Text style={styles.emptyTitle}>
            Profile unavailable
          </Text>

          <Text style={styles.emptyText}>
            {profileError ||
              "This profile could not be found."}
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text
              style={styles.primaryButtonText}
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const isMyProfile =
    Boolean(
      user?.id &&
      profile.id === user.id
    )

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <FlatList
        data={userMixes}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={
              isRefreshing ||
              (isLoadingPublic &&
                publicMixes.length === 0)
            }
            onRefresh={() => {
              void handleRefresh()
            }}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() =>
                  router.back()
                }
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color={theme.text}
                />
              </TouchableOpacity>

              <Text
                style={styles.headerTitle}
              >
                Community Profile
              </Text>

              {isMyProfile ? (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() =>
                    router.push(
                      "/(tabs)/profile"
                    )
                  }
                >
                  <Ionicons
                    name="create-outline"
                    size={21}
                    color={theme.text}
                  />
                </TouchableOpacity>
              ) : (
                <View
                  style={
                    styles.headerButton
                  }
                />
              )}
            </View>

            <View style={styles.heroCard}>
              <View
                style={
                  styles.heroGlowOne
                }
              />
              <View
                style={
                  styles.heroGlowTwo
                }
              />

              <View
                style={
                  styles.avatarContainer
                }
              >
                {profile.avatarUrl ? (
                  <Image
                    source={{
                      uri: profile.avatarUrl,
                    }}
                    style={styles.avatar}
                  />
                ) : (
                  <View
                    style={
                      styles.avatarFallback
                    }
                  >
                    <Text
                      style={
                        styles.avatarInitials
                      }
                    >
                      {getInitials(
                        profile.displayName,
                        profile.username
                      )}
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={styles.displayName}
              >
                {profile.displayName}
              </Text>

              <Text
                style={styles.username}
              >
                @{profile.username}
              </Text>

              {profile.bio ? (
                <Text style={styles.bio}>
                  {profile.bio}
                </Text>
              ) : (
                <Text
                  style={styles.emptyBio}
                >
                  This creator hasn't added a
                  bio yet.
                </Text>
              )}

              <View
                style={styles.joinedRow}
              >
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color="rgba(255,255,255,0.76)"
                />

                <Text
                  style={styles.joinedText}
                >
                  Joined{" "}
                  {formatJoinedDate(
                    profile.createdAt
                  )}
                </Text>
              </View>
            </View>

            {!isMyProfile ? (
  <TouchableOpacity
    style={[
      styles.followButton,
      isFollowing(profile.id) &&
        styles.followingButton,
      isUpdatingFollow &&
        styles.disabledButton,
    ]}
    activeOpacity={0.8}
    disabled={isUpdatingFollow}
    onPress={() => {
      void handleToggleFollow()
    }}
  >
    {isUpdatingFollow ? (
      <ActivityIndicator
        size="small"
        color={
          isFollowing(profile.id)
            ? theme.primary
            : "#FFFFFF"
        }
      />
    ) : (
      <Ionicons
        name={
          isFollowing(profile.id)
            ? "checkmark"
            : "person-add-outline"
        }
        size={18}
        color={
          isFollowing(profile.id)
            ? theme.primary
            : "#FFFFFF"
        }
      />
    )}

    <Text
      style={[
        styles.followButtonText,
        isFollowing(profile.id) &&
          styles.followingButtonText,
      ]}
    >
      {isUpdatingFollow
        ? "Updating..."
        : isFollowing(profile.id)
          ? "Following"
          : "Follow"}
    </Text>
  </TouchableOpacity>
) : null}

            <View style={styles.statsRow}>
  <StatCard
    icon="sparkles-outline"
    value={userMixes.length}
    label="Published"
    theme={theme}
    styles={styles}
  />

  <StatCard
    icon="people-outline"
    value={followersCount}
    label="Followers"
    theme={theme}
    styles={styles}
  />

  <StatCard
    icon="person-add-outline"
    value={followingCount}
    label="Following"
    theme={theme}
    styles={styles}
  />

  <StatCard
    icon="star-outline"
    value={
      totalRatings > 0
        ? averageRating.toFixed(1)
        : "—"
    }
    label="Rating"
    theme={theme}
    styles={styles}
  />
</View>

            <View
              style={styles.sectionHeader}
            >
              <View>
                <Text
                  style={
                    styles.sectionEyebrow
                  }
                >
                  COMMUNITY COLLECTION
                </Text>

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Public Combinations
                </Text>
              </View>

              <View
                style={styles.countBadge}
              >
                <Text
                  style={
                    styles.countBadgeText
                  }
                >
                  {userMixes.length}
                </Text>
              </View>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <PublicMixCard
            mix={item}
            onPress={() =>
              openMix(item.id)
            }
            theme={theme}
            styles={styles}
          />
        )}
        ListEmptyComponent={
          <View
            style={styles.noMixesCard}
          >
            <View style={styles.emptyIcon}>
              <Ionicons
                name="sparkles-outline"
                size={34}
                color={theme.primary}
              />
            </View>

            <Text
              style={styles.noMixesTitle}
            >
              No public combinations yet
            </Text>

            <Text
              style={styles.noMixesText}
            >
              @{profile.username} hasn't shared a
              flavor combination with the KloudIt
              community yet.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

function StatCard({
  icon,
  value,
  label,
  theme,
  styles,
}: {
  icon:
   | "sparkles-outline"
  | "heart-outline"
  | "star-outline"
  | "people-outline"
  | "person-add-outline"
  value: string | number
  label: string
  theme: AppTheme
  styles: ReturnType<typeof getStyles>
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={theme.primary}
        />
      </View>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  )
}

function PublicMixCard({
  mix,
  onPress,
  theme,
  styles,
}: {
  mix: SavedMix
  onPress: () => void
  theme: AppTheme
  styles: ReturnType<typeof getStyles>
}) {
  const topIngredients =
    mix.ingredients.slice(0, 3)

  return (
    <TouchableOpacity
      style={styles.mixCard}
      activeOpacity={0.86}
      onPress={onPress}
    >
      <View style={styles.mixCardAccent} />

      <View style={styles.mixHeader}>
        <View style={styles.mixIcon}>
          <Ionicons
            name="sparkles"
            size={21}
            color="#FFFFFF"
          />
        </View>

        <View
          style={styles.mixTitleWrap}
        >
          <Text
            style={styles.mixName}
            numberOfLines={1}
          >
            {mix.name}
          </Text>

          <Text style={styles.mixMeta}>
            {mix.ingredients.length}{" "}
            {mix.ingredients.length === 1
              ? "flavor"
              : "flavors"}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={19}
          color={theme.textSecondary}
        />
      </View>

      <View
        style={styles.ingredientPreview}
      >
        {topIngredients.map(
          (ingredient) => (
            <View
              key={`${mix.id}-${ingredient.flavorId}`}
              style={styles.ingredientRow}
            >
              <Text
                style={styles.ingredientName}
                numberOfLines={1}
              >
                {ingredient.flavorName}
              </Text>
            </View>
          )
        )}
      </View>

      <View style={styles.mixFooter}>
        <View style={styles.ratingPill}>
          <Ionicons
            name="star"
            size={14}
            color="#F4B740"
          />

          <Text
            style={styles.ratingText}
          >
            {mix.ratingCount > 0
              ? mix.averageRating.toFixed(
                  1
                )
              : "New"}
          </Text>

          {mix.ratingCount > 0 ? (
            <Text
              style={
                styles.ratingCount
              }
            >
              ({mix.ratingCount})
            </Text>
          ) : null}
        </View>

        <View style={styles.likePill}>
          <Ionicons
            name="heart"
            size={14}
            color={theme.danger}
          />

          <Text style={styles.likeText}>
            {mix.likeCount}
          </Text>
        </View>

        <View style={styles.viewHint}>
          <Text
            style={styles.viewHintText}
          >
            View Combination
          </Text>

          <Ionicons
            name="arrow-forward"
            size={14}
            color={theme.primary}
          />
        </View>
      </View>
    </TouchableOpacity>
  )
}

function getStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },

    listContent: {
      paddingHorizontal: 18,
      paddingBottom: 40,
    },

    header: {
      height: 60,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    headerButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.card,
    },

    headerTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.text,
    },

    heroCard: {
      padding: 24,
      alignItems: "center",
      overflow: "hidden",
      borderRadius: 28,
      backgroundColor: theme.primary,
    },

    heroGlowOne: {
      position: "absolute",
      top: -45,
      right: -30,
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor:
        "rgba(255,255,255,0.10)",
    },

    heroGlowTwo: {
      position: "absolute",
      bottom: -55,
      left: -30,
      width: 145,
      height: 145,
      borderRadius: 73,
      backgroundColor:
        "rgba(255,255,255,0.07)",
    },

    avatarContainer: {
      padding: 4,
      borderRadius: 42,
      backgroundColor:
        "rgba(255,255,255,0.20)",
    },

    avatar: {
      width: 78,
      height: 78,
      borderRadius: 39,
    },

    avatarFallback: {
      width: 78,
      height: 78,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 39,
      backgroundColor: "#FFFFFF",
    },

    avatarInitials: {
      fontSize: 27,
      fontWeight: "900",
      color: theme.primary,
    },

    displayName: {
      marginTop: 15,
      fontSize: 24,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    username: {
      marginTop: 3,
      fontSize: 13,
      fontWeight: "700",
      color:
        "rgba(255,255,255,0.78)",
    },

    bio: {
      maxWidth: 330,
      marginTop: 13,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      color:
        "rgba(255,255,255,0.88)",
    },

    emptyBio: {
      marginTop: 13,
      fontSize: 12,
      fontStyle: "italic",
      color:
        "rgba(255,255,255,0.66)",
    },

    joinedRow: {
      marginTop: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    joinedText: {
      fontSize: 11,
      fontWeight: "600",
      color:
        "rgba(255,255,255,0.76)",
    },

 statsRow: {
  marginTop: 16,
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 10,
},

statCard: {
  width: "48%",
  paddingVertical: 15,
  alignItems: "center",
  borderWidth: 1,
  borderColor: theme.border,
  borderRadius: 18,
  backgroundColor: theme.card,
},

    statIcon: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: theme.primaryLight,
    },

    statValue: {
      marginTop: 8,
      fontSize: 18,
      fontWeight: "900",
      color: theme.text,
    },

    statLabel: {
      marginTop: 2,
      fontSize: 9,
      fontWeight: "700",
      textAlign: "center",
      color: theme.textSecondary,
    },

    sectionHeader: {
      marginTop: 28,
      marginBottom: 14,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },

    sectionEyebrow: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.2,
      color: theme.primary,
    },

    sectionTitle: {
      marginTop: 4,
      fontSize: 21,
      fontWeight: "900",
      color: theme.text,
    },

    countBadge: {
      minWidth: 40,
      height: 31,
      paddingHorizontal: 10,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: theme.primaryLight,
    },

    countBadgeText: {
      fontSize: 12,
      fontWeight: "900",
      color: theme.primaryDark,
    },

    mixCard: {
      position: "relative",
      marginBottom: 14,
      padding: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 21,
      backgroundColor: theme.card,
    },

    mixCardAccent: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: 4,
      backgroundColor: theme.primary,
    },

    mixHeader: {
      flexDirection: "row",
      alignItems: "center",
    },

    mixIcon: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.primary,
    },

    mixTitleWrap: {
      flex: 1,
      marginLeft: 11,
      marginRight: 8,
    },

    mixName: {
      fontSize: 16,
      fontWeight: "900",
      color: theme.text,
    },

    mixMeta: {
      marginTop: 3,
      fontSize: 10,
      color: theme.textSecondary,
    },

    ingredientPreview: {
      marginTop: 14,
      padding: 12,
      gap: 9,
      borderRadius: 14,
      backgroundColor: theme.background,
    },

    ingredientRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    ingredientName: {
      flex: 1,
      fontSize: 12,
      fontWeight: "700",
      color: theme.text,
    },

    mixFooter: {
      marginTop: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    ratingPill: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 10,
      backgroundColor:
        "rgba(244,183,64,0.12)",
    },

    ratingText: {
      marginLeft: 4,
      fontSize: 11,
      fontWeight: "800",
      color: theme.text,
    },

    ratingCount: {
      marginLeft: 3,
      fontSize: 10,
      color: theme.textSecondary,
    },

    likePill: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 10,
      backgroundColor: theme.background,
    },

    likeText: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.textSecondary,
    },

    viewHint: {
      marginLeft: "auto",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },

    viewHintText: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.primary,
    },

    noMixesCard: {
      padding: 28,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },

    noMixesTitle: {
      marginTop: 14,
      fontSize: 17,
      fontWeight: "900",
      color: theme.text,
    },

    noMixesText: {
      marginTop: 6,
      maxWidth: 300,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      color: theme.textSecondary,
    },

    emptyIcon: {
      width: 70,
      height: 70,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 23,
      backgroundColor: theme.primaryLight,
    },

    emptyTitle: {
      marginTop: 17,
      fontSize: 20,
      fontWeight: "900",
      color: theme.text,
    },

    emptyText: {
      marginTop: 7,
      maxWidth: 300,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      color: theme.textSecondary,
    },

    primaryButton: {
      marginTop: 20,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: theme.primary,
    },

    primaryButtonText: {
      fontSize: 13,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    center: {
      flex: 1,
      paddingHorizontal: 30,
      alignItems: "center",
      justifyContent: "center",
    },

    loadingIcon: {
      width: 58,
      height: 58,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 19,
      backgroundColor: theme.primary,
    },

    loadingIndicator: {
      marginTop: 21,
    },

    loadingTitle: {
      marginTop: 14,
      fontSize: 18,
      fontWeight: "800",
      color: theme.text,
    },

    followButton: {
  height: 50,
  marginTop: 14,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  borderRadius: 16,
  backgroundColor: theme.primary,
},

followingButton: {
  borderWidth: 1,
  borderColor: theme.primary,
  backgroundColor: theme.card,
},

followButtonText: {
  fontSize: 14,
  fontWeight: "900",
  color: "#FFFFFF",
},

followingButtonText: {
  color: theme.primary,
},

disabledButton: {
  opacity: 0.55,
},
  })
}