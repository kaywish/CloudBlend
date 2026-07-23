import { Ionicons } from "@expo/vector-icons"
import { router, useFocusEffect } from "expo-router"
import { useCallback, useMemo, useState } from "react"
import { useFlavors } from "@/context/FlavorContext"
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppTheme } from "@/constants/colors"
import { useAppTheme } from "@/context/AppThemeContext"
import { useMixes } from "@/context/MixContext"

type SortOption = "newest" | "popular"

export default function ExploreScreen() {
  const {
  flavors,
  brands,
  topFlavors,
  topBrands,
  isLoading: isLoadingFlavors,
  error: flavorError,
} = useFlavors()

console.log("Flavors:", flavors.length)
console.log("Brands:", brands.length)
console.log("Top flavors:", topFlavors)
console.log("Top brands:", topBrands)
console.log("Flavor loading:", isLoadingFlavors)
console.log("Flavor error:", flavorError)
  const { theme } = useAppTheme()
  const styles = useMemo(() => getStyles(theme), [theme])

  const {
    publicMixes,
    isLoadingPublic,
    refreshPublicMixes,
    toggleLike,
  } = useMixes()

  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] =
    useState<SortOption>("newest")
  const [updatingLikeIds, setUpdatingLikeIds] = useState<
    string[]
  >([])

  useFocusEffect(
    useCallback(() => {
      refreshPublicMixes().catch((error) => {
        console.error("Could not load public mixes:", error)
      })
    }, [refreshPublicMixes])
  )

  const displayedMixes = useMemo(() => {
    const normalizedSearch = searchQuery
      .trim()
      .toLowerCase()

    let filteredMixes = publicMixes.filter((mix) => {
      if (!normalizedSearch) {
        return true
      }

      const matchesName = mix.name
        .toLowerCase()
        .includes(normalizedSearch)

      const matchesCreator = mix.creatorUsername
        ?.toLowerCase()
        .includes(normalizedSearch)

      const matchesFlavor = mix.ingredients.some(
        (ingredient) =>
          ingredient.flavorName
            .toLowerCase()
            .includes(normalizedSearch) ||
          ingredient.brand
            ?.toLowerCase()
            .includes(normalizedSearch)
      )

      return matchesName || matchesCreator || matchesFlavor
    })

    if (sortOption === "popular") {
      filteredMixes = filteredMixes.filter(
        (mix) => mix.likeCount > 0
      )
    }

    return [...filteredMixes].sort((a, b) => {
      if (sortOption === "popular") {
        return b.likeCount - a.likeCount
      }

      return (
        new Date(b.updatedAt).getTime() -
        new Date(a.updatedAt).getTime()
      )
    })
  }, [publicMixes, searchQuery, sortOption])

  const totalLikes = useMemo(
    () =>
      publicMixes.reduce(
        (total, mix) => total + mix.likeCount,
        0
      ),
    [publicMixes]
  )

  const handleToggleLike = useCallback(
    async (mixId: string) => {
      if (updatingLikeIds.includes(mixId)) {
        return
      }

      setUpdatingLikeIds((currentIds) => [
        ...currentIds,
        mixId,
      ])

      try {
        await toggleLike(mixId)
      } catch (error) {
        console.error("Could not update like:", error)
      } finally {
        setUpdatingLikeIds((currentIds) =>
          currentIds.filter((id) => id !== mixId)
        )
      }
    },
    [toggleLike, updatingLikeIds]
  )

  const openMix = useCallback((mixId: string) => {
    router.push({
      pathname: "/mix/[id]",
      params: {
        id: mixId,
      },
    })
  }, [])

  if (isLoadingPublic && publicMixes.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <View style={styles.loadingIcon}>
            <Ionicons
              name="flask"
              size={28}
              color="#FFFFFF"
            />
          </View>

          <ActivityIndicator
            size="large"
            color={theme.primary}
            style={styles.loadingIndicator}
          />

          <Text style={styles.loadingTitle}>
            Discovering mixes
          </Text>

          <Text style={styles.loadingText}>
            Loading creations from the community...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <FlatList
        data={displayedMixes}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingPublic}
            onRefresh={() => {
              refreshPublicMixes().catch((error) => {
                console.error(
                  "Could not refresh mixes:",
                  error
                )
              })
            }}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <View style={styles.heroDecorationOne} />
              <View style={styles.heroDecorationTwo} />

              <View style={styles.heroTopRow}>
                <View style={styles.heroIcon}>
                  <Ionicons
                    name="earth"
                    size={24}
                    color="#FFFFFF"
                  />
                </View>

                <View style={styles.heroBadge}>
                  <View style={styles.liveDot} />

                  <Text style={styles.heroBadgeText}>
                    Community
                  </Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>
                Explore CloudBlend
              </Text>

              <Text style={styles.heroSubtitle}>
                Find new flavor combinations shared by
                hookah enthusiasts.
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {publicMixes.length}
                  </Text>

                  <Text style={styles.statLabel}>
                    Public mixes
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {totalLikes}
                  </Text>

                  <Text style={styles.statLabel}>
                    Community likes
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons
                name="search-outline"
                size={20}
                color={theme.textSecondary}
              />

              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search mixes, flavors, or creators"
                placeholderTextColor={theme.textSecondary}
                returnKeyType="search"
              />

              {searchQuery.length > 0 ? (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchQuery("")}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Community Mixes
                </Text>

                <Text style={styles.resultCount}>
                  {displayedMixes.length}{" "}
                  {displayedMixes.length === 1
                    ? "result"
                    : "results"}
                </Text>
              </View>

              <View style={styles.sortContainer}>
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    sortOption === "newest" &&
                      styles.sortButtonActive,
                  ]}
                  onPress={() => setSortOption("newest")}
                >
                  <Ionicons
                    name="time-outline"
                    size={15}
                    color={
                      sortOption === "newest"
                        ? "#FFFFFF"
                        : theme.textSecondary
                    }
                  />

                  <Text
                    style={[
                      styles.sortButtonText,
                      sortOption === "newest" &&
                        styles.sortButtonTextActive,
                    ]}
                  >
                    New
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    sortOption === "popular" &&
                      styles.sortButtonActive,
                  ]}
                  onPress={() => setSortOption("popular")}
                >
                  <Ionicons
                    name="flame-outline"
                    size={15}
                    color={
                      sortOption === "popular"
                        ? "#FFFFFF"
                        : theme.textSecondary
                    }
                  />

                  <Text
                    style={[
                      styles.sortButtonText,
                      sortOption === "popular" &&
                        styles.sortButtonTextActive,
                    ]}
                  >
                    Popular
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name={
                  searchQuery
                    ? "search-outline"
                    : "flask-outline"
                }
                size={40}
                color={theme.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {searchQuery
                ? "No matching mixes"
                : "No public mixes yet"}
            </Text>

            <Text style={styles.emptyText}>
              {searchQuery
                ? "Try searching for a different mix, creator, flavor, or brand."
                : "Publish one of your mixes to help start the CloudBlend community."}
            </Text>

            {searchQuery ? (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => setSearchQuery("")}
              >
                <Text style={styles.resetButtonText}>
                  Clear search
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => {
          const totalPercentage =
            item.ingredients.reduce(
              (total, ingredient) =>
                total + ingredient.percentage,
              0
            )

          const isUpdatingLike =
            updatingLikeIds.includes(item.id)

          const topIngredients = item.ingredients
            .slice()
            .sort(
              (a, b) =>
                b.percentage - a.percentage
            )
            .slice(0, 3)

          const creatorUsername =
            item.creatorUsername?.trim() || "CloudBlend user"

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.88}
              onPress={() => openMix(item.id)}
            >
              <View style={styles.cardAccent} />

              <View style={styles.creatorRow}>
                <View style={styles.creatorAvatar}>
                  {item.creatorAvatarUrl ? (
                    <Image
                      source={{
                        uri: item.creatorAvatarUrl,
                      }}
                      style={styles.creatorAvatarImage}
                    />
                  ) : (
                    <Text style={styles.creatorInitial}>
                      {creatorUsername
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={styles.creatorInfo}>
                  <Text style={styles.creatorLabel}>
                    MIXED BY
                  </Text>

                  <Text
                    style={styles.creatorUsername}
                    numberOfLines={1}
                  >
                    @{creatorUsername}
                  </Text>
                </View>

                <View style={styles.publicBadge}>
                  <Ionicons
                    name="earth-outline"
                    size={14}
                    color={theme.primaryDark}
                  />

                  <Text style={styles.publicBadgeText}>
                    Public
                  </Text>
                </View>
              </View>

              <View style={styles.creatorDivider} />

              <View style={styles.cardHeader}>
                <View style={styles.mixIcon}>
                  <Ionicons
                    name="flask"
                    size={21}
                    color="#FFFFFF"
                  />
                </View>

                <View style={styles.cardTitleContainer}>
                  <Text
                    style={styles.mixName}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>

                  <View style={styles.mixInfoRow}>
                    <Ionicons
                      name="layers-outline"
                      size={13}
                      color={theme.textSecondary}
                    />

                    <Text style={styles.mixMeta}>
                      {item.ingredients.length} flavors
                    </Text>

                    <View style={styles.metaDot} />

                    <Text style={styles.mixMeta}>
                      {totalPercentage}%
                    </Text>
                  </View>
                </View>

                {index === 0 &&
                sortOption === "popular" &&
                item.likeCount > 0 ? (
                  <View style={styles.trendingBadge}>
                    <Ionicons
                      name="flame"
                      size={13}
                      color="#E97930"
                    />

                    <Text style={styles.trendingText}>
                      Top
                    </Text>
                  </View>
                ) : (
                  <View style={styles.chevronContainer}>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={theme.textSecondary}
                    />
                  </View>
                )}
              </View>

              <View style={styles.ingredientsContainer}>
                {topIngredients.map((ingredient) => (
                  <View
                    key={`${item.id}-${ingredient.flavorId}`}
                    style={styles.ingredientRow}
                  >
                    <View style={styles.ingredientTitleRow}>
                      <Text
                        style={styles.ingredientName}
                        numberOfLines={1}
                      >
                        {ingredient.flavorName}
                      </Text>

                      <Text
                        style={styles.ingredientPercentage}
                      >
                        {ingredient.percentage}%
                      </Text>
                    </View>

                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(
                              ingredient.percentage,
                              100
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}

                {item.ingredients.length > 3 ? (
                  <Text style={styles.moreFlavorsText}>
                    +{item.ingredients.length - 3} more{" "}
                    {item.ingredients.length - 3 === 1
                      ? "flavor"
                      : "flavors"}
                  </Text>
                ) : null}
              </View>

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={[
                    styles.likeButton,
                    item.likedByMe &&
                      styles.likeButtonActive,
                  ]}
                  activeOpacity={0.75}
                  disabled={isUpdatingLike}
                  onPress={(event) => {
                    event.stopPropagation()
                    void handleToggleLike(item.id)
                  }}
                >
                  {isUpdatingLike ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        item.likedByMe
                          ? "#E34D67"
                          : theme.textSecondary
                      }
                    />
                  ) : (
                    <Ionicons
                      name={
                        item.likedByMe
                          ? "heart"
                          : "heart-outline"
                      }
                      size={20}
                      color={
                        item.likedByMe
                          ? "#E34D67"
                          : theme.textSecondary
                      }
                    />
                  )}

                  <Text
                    style={[
                      styles.likeCount,
                      item.likedByMe &&
                        styles.likeCountActive,
                    ]}
                  >
                    {item.likeCount}
                  </Text>
                </TouchableOpacity>

                <View style={styles.openMixHint}>
                  <Text style={styles.openMixHintText}>
                    View mix
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={15}
                    color={theme.primary}
                  />
                </View>
              </View>
            </TouchableOpacity>
          )
        }}
      />
    </SafeAreaView>
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

    hero: {
      marginTop: 14,
      marginBottom: 18,
      padding: 22,
      overflow: "hidden",
      borderRadius: 26,
      backgroundColor: theme.primary,
    },

    heroDecorationOne: {
      position: "absolute",
      top: -45,
      right: -30,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: "rgba(255,255,255,0.10)",
    },

    heroDecorationTwo: {
      position: "absolute",
      bottom: -60,
      left: -35,
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: "rgba(255,255,255,0.06)",
    },

    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    heroIcon: {
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      backgroundColor: "rgba(255,255,255,0.17)",
    },

    heroBadge: {
      paddingHorizontal: 11,
      paddingVertical: 7,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.15)",
    },

    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: "#8FF1B7",
    },

    heroBadgeText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#FFFFFF",
    },

    heroTitle: {
      marginTop: 20,
      fontSize: 28,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    heroSubtitle: {
      marginTop: 7,
      maxWidth: 310,
      fontSize: 14,
      lineHeight: 21,
      color: "rgba(255,255,255,0.80)",
    },

    statsRow: {
      marginTop: 22,
      paddingTop: 18,
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: "rgba(255,255,255,0.16)",
    },

    statItem: {
      flex: 1,
    },

    statValue: {
      fontSize: 21,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    statLabel: {
      marginTop: 3,
      fontSize: 11,
      fontWeight: "600",
      color: "rgba(255,255,255,0.70)",
    },

    statDivider: {
      width: 1,
      marginHorizontal: 18,
      backgroundColor: "rgba(255,255,255,0.16)",
    },

    searchContainer: {
      height: 54,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      backgroundColor: theme.card,
    },

    searchInput: {
      flex: 1,
      height: "100%",
      marginLeft: 10,
      fontSize: 14,
      color: theme.text,
    },

    clearButton: {
      padding: 4,
    },

    sectionHeader: {
      marginTop: 24,
      marginBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    sectionTitle: {
      fontSize: 19,
      fontWeight: "800",
      color: theme.text,
    },

    resultCount: {
      marginTop: 3,
      fontSize: 12,
      color: theme.textSecondary,
    },

    sortContainer: {
      padding: 3,
      flexDirection: "row",
      borderRadius: 13,
      backgroundColor: theme.card,
    },

    sortButton: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 10,
    },

    sortButtonActive: {
      backgroundColor: theme.primary,
    },

    sortButtonText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.textSecondary,
    },

    sortButtonTextActive: {
      color: "#FFFFFF",
    },

    card: {
      marginBottom: 16,
      padding: 17,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },

    cardAccent: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: 4,
      backgroundColor: theme.primary,
    },

    creatorRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    creatorAvatar: {
      width: 40,
      height: 40,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.primaryLight,
    },

    creatorAvatarImage: {
      width: "100%",
      height: "100%",
    },

    creatorInitial: {
      fontSize: 16,
      fontWeight: "900",
      color: theme.primaryDark,
    },

    creatorInfo: {
      flex: 1,
      marginLeft: 10,
      marginRight: 10,
    },

    creatorLabel: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.1,
      color: theme.textSecondary,
    },

    creatorUsername: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: "800",
      color: theme.text,
    },

    creatorDivider: {
      height: 1,
      marginTop: 14,
      marginBottom: 15,
      backgroundColor: theme.border,
    },

    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
    },

    mixIcon: {
      width: 45,
      height: 45,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.primary,
    },

    cardTitleContainer: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
    },

    mixName: {
      fontSize: 17,
      fontWeight: "800",
      color: theme.text,
    },

    mixInfoRow: {
      marginTop: 5,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    mixMeta: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.textSecondary,
    },

    metaDot: {
      width: 3,
      height: 3,
      marginHorizontal: 2,
      borderRadius: 2,
      backgroundColor: theme.textSecondary,
    },

    chevronContainer: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.background,
    },

    trendingBadge: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 12,
      backgroundColor: "rgba(233,121,48,0.10)",
    },

    trendingText: {
      fontSize: 10,
      fontWeight: "800",
      color: "#E97930",
    },

    ingredientsContainer: {
      marginTop: 18,
      padding: 14,
      borderRadius: 16,
      backgroundColor: theme.background,
    },

    ingredientRow: {
      marginBottom: 11,
    },

    ingredientTitleRow: {
      marginBottom: 6,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    ingredientName: {
      flex: 1,
      marginRight: 10,
      fontSize: 12,
      fontWeight: "700",
      color: theme.text,
    },

    ingredientPercentage: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.primaryDark,
    },

    progressTrack: {
      height: 5,
      overflow: "hidden",
      borderRadius: 4,
      backgroundColor: theme.primaryLight,
    },

    progressFill: {
      height: "100%",
      borderRadius: 4,
      backgroundColor: theme.primary,
    },

    moreFlavorsText: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "600",
      color: theme.textSecondary,
    },

    cardFooter: {
      marginTop: 15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    likeButton: {
      minWidth: 70,
      height: 39,
      paddingHorizontal: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.background,
    },

    likeButtonActive: {
      borderColor: "rgba(227,77,103,0.22)",
      backgroundColor: "rgba(227,77,103,0.09)",
    },

    likeCount: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.textSecondary,
    },

    likeCountActive: {
      color: "#E34D67",
    },

    publicBadge: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 14,
      backgroundColor: theme.primaryLight,
    },

    publicBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.primaryDark,
    },

    openMixHint: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    openMixHintText: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.primary,
    },

    emptyState: {
      paddingTop: 55,
      paddingHorizontal: 30,
      alignItems: "center",
    },

    emptyIconContainer: {
      width: 82,
      height: 82,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 28,
      backgroundColor: theme.primaryLight,
    },

    emptyTitle: {
      marginTop: 20,
      fontSize: 20,
      fontWeight: "800",
      color: theme.text,
    },

    emptyText: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
      color: theme.textSecondary,
    },

    resetButton: {
      marginTop: 18,
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderRadius: 14,
      backgroundColor: theme.primary,
    },

    resetButtonText: {
      fontSize: 13,
      fontWeight: "700",
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
      marginTop: 22,
    },

    loadingTitle: {
      marginTop: 16,
      fontSize: 18,
      fontWeight: "800",
      color: theme.text,
    },

    loadingText: {
      marginTop: 6,
      fontSize: 13,
      textAlign: "center",
      color: theme.textSecondary,
    },
  })
}