import { Ionicons } from "@expo/vector-icons"
import { router, useFocusEffect } from "expo-router"
import { useFollow } from "@/context/FollowContext"
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppTheme } from "@/constants/colors"
import { useAppTheme } from "@/context/AppThemeContext"
import { useFlavors } from "@/context/FlavorContext"
import { useMixes } from "@/context/MixContext"

type SortOption =
  | "newest"
  | "popular"
  | "trending"
  | "following"

  function getTrendingScore(mix: {
  likeCount: number
  averageRating: number
  ratingCount: number
  createdAt: string
}) {
  const ageMs =
    Date.now() -
    new Date(mix.createdAt).getTime()

  const ageDays =
    ageMs / (1000 * 60 * 60 * 24)

  // Newer mixes get a temporary boost.
  // Boost disappears after 7 days.
  const recencyBoost =
    Math.max(0, 7 - ageDays) * 2

  const likeScore =
    mix.likeCount * 3

  const ratingCountScore =
    mix.ratingCount * 2

  const ratingQualityScore =
    mix.ratingCount > 0
      ? mix.averageRating * 3
      : 0

  return (
    likeScore +
    ratingCountScore +
    ratingQualityScore +
    recencyBoost
  )
}



export default function ExploreScreen() {
  const sortButtonRef = useRef<View>(null)

const [sortMenuPosition, setSortMenuPosition] =
  useState({
    top: 0,
    right: 18,
  })
  const { theme } = useAppTheme()
  const [sortMenuVisible, setSortMenuVisible] =
  useState(false)
  const styles = useMemo(() => getStyles(theme), [theme])
const { followingIds } = useFollow()
  const {
    publicMixes,
    isLoadingPublic,
    refreshPublicMixes,
    toggleLike,
  } = useMixes()

  const {
    topFlavors,
    topBrands,
    isLoading: isLoadingFlavors,
    refreshFlavors,
  } = useFlavors()

  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] =
    useState<SortOption>("newest")
  const [updatingLikeIds, setUpdatingLikeIds] = useState<
    string[]
  >([])

  useFocusEffect(
    useCallback(() => {
      Promise.all([refreshPublicMixes(), refreshFlavors()]).catch(
        (error) => {
          console.error("Could not load Explore data:", error)
        }
      )
    }, [refreshFlavors, refreshPublicMixes])
  )

  const displayedMixes = useMemo(() => {
  const normalizedSearch =
    searchQuery.trim().toLowerCase()

  let filteredMixes = publicMixes.filter(
    (mix) => {
      if (!normalizedSearch) {
        return true
      }

      const matchesName =
        mix.name
          .toLowerCase()
          .includes(normalizedSearch)

      const matchesCreator =
        mix.creatorUsername
          ?.toLowerCase()
          .includes(normalizedSearch)

      const matchesFlavor =
        mix.ingredients.some(
          (ingredient) =>
            ingredient.flavorName
              .toLowerCase()
              .includes(normalizedSearch) ||
            ingredient.brand
              ?.toLowerCase()
              .includes(normalizedSearch)
        )

      return (
        matchesName ||
        matchesCreator ||
        matchesFlavor
      )
    }
  )

  if (sortOption === "following") {
    filteredMixes =
      filteredMixes.filter((mix) =>
        followingIds.includes(
          mix.userId
        )
      )
  }

return [...filteredMixes].sort(
  (a, b) => {
    if (sortOption === "popular") {
      return (
        b.likeCount -
        a.likeCount
      )
    }

    if (sortOption === "trending") {
      return (
        getTrendingScore(b) -
        getTrendingScore(a)
      )
    }

    return (
      new Date(
        b.updatedAt
      ).getTime() -
      new Date(
        a.updatedAt
      ).getTime()
    )
  }
)
}, [
  publicMixes,
  searchQuery,
  sortOption,
  followingIds,
])

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
              Promise.all([
                refreshPublicMixes(),
                refreshFlavors(),
              ]).catch((error) => {
                console.error(
                  "Could not refresh Explore data:",
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
                Explore KloudIt
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

            <View style={styles.discoverySection}>
              <View style={styles.discoveryHeader}>
                <View style={styles.discoveryHeaderText}>
                  <Text style={styles.discoveryEyebrow}>
                    FLAVOR CATALOG
                  </Text>

                  <Text style={styles.discoveryTitle}>
                    Top Flavors
                  </Text>

                  <Text style={styles.discoverySubtitle}>
                    Discover popular flavors from the community.
                  </Text>
                </View>

                <View style={styles.discoveryIcon}>
                  <Ionicons
                    name="star"
                    size={18}
                    color="#F4B740"
                  />
                </View>
              </View>

              {isLoadingFlavors && topFlavors.length === 0 ? (
                <View style={styles.discoveryLoading}>
                  <ActivityIndicator
                    size="small"
                    color={theme.primary}
                  />
                </View>
              ) : (
                <FlatList
                  horizontal
                  data={topFlavors}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalListContent}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.flavorCard}
                      activeOpacity={0.85}
                      onPress={() =>
                        router.push({
                          pathname: "/flavor/[id]",
                          params: { id: item.id },
                        })
                      }
                    >
                      <View style={styles.flavorImageContainer}>
                        {item.imageUrl ? (
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.flavorImage}
                          />
                        ) : (
                          <Ionicons
                            name="leaf-outline"
                            size={29}
                            color={theme.primary}
                          />
                        )}
                      </View>

                      <Text
                        style={styles.flavorName}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>

                      <Text
                        style={styles.flavorBrand}
                        numberOfLines={1}
                      >
                        {item.brandName}
                      </Text>

                      <View style={styles.flavorStatsRow}>
                        <Ionicons
                          name="star"
                          size={13}
                          color="#F4B740"
                        />

                        <Text style={styles.flavorRating}>
                          {item.ratingCount > 0
                            ? item.averageRating.toFixed(1)
                            : "New"}
                        </Text>

                        {item.ratingCount > 0 ? (
                          <Text style={styles.flavorRatingCount}>
                            ({item.ratingCount})
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>

            <View style={styles.discoverySection}>
              <View style={styles.discoveryHeader}>
                <View style={styles.discoveryHeaderText}>
                  <Text style={styles.discoveryEyebrow}>
                    BROWSE BY MAKER
                  </Text>

                  <Text style={styles.discoveryTitle}>
                    Popular Brands
                  </Text>

                  <Text style={styles.discoverySubtitle}>
                    Explore the flavor catalog by brand.
                  </Text>
                </View>

                <View style={styles.discoveryIcon}>
                  <Ionicons
                    name="business-outline"
                    size={19}
                    color={theme.primary}
                  />
                </View>
              </View>

              {isLoadingFlavors && topBrands.length === 0 ? (
                <View style={styles.discoveryLoading}>
                  <ActivityIndicator
                    size="small"
                    color={theme.primary}
                  />
                </View>
              ) : (
                <FlatList
                  horizontal
                  data={topBrands}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalListContent}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.brandCard}
                      activeOpacity={0.85}
                      onPress={() =>
                        router.push({
                          pathname: "/brand/[id]",
                          params: { id: item.id },
                        })
                      }
                    >
                      <View style={styles.brandLogoContainer}>
                        {item.logoUrl ? (
                          <Image
                            source={{ uri: item.logoUrl }}
                            style={styles.brandLogo}
                          />
                        ) : (
                          <Text style={styles.brandInitial}>
                            {item.name.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>

                      <Text
                        style={styles.brandName}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>

                      <Text style={styles.brandFlavorCount}>
                        {item.flavorCount}{" "}
                        {item.flavorCount === 1
                          ? "flavor"
                          : "flavors"}
                      </Text>

                      <View style={styles.brandRatingRow}>
                        <Ionicons
                          name="star"
                          size={12}
                          color="#F4B740"
                        />

                        <Text style={styles.brandRatingText}>
                          {item.ratingCount > 0
                            ? item.averageRating.toFixed(1)
                            : "New"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
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

             <TouchableOpacity
  ref={sortButtonRef}
  style={styles.sortDropdownButton}
  activeOpacity={0.8}
  onPress={() => {
    sortButtonRef.current?.measureInWindow(
      (x, y, width, height) => {
        setSortMenuPosition({
          top: y + height + 6,
          right: 18,
        })

        setSortMenuVisible(true)
      }
    )
  }}
>
  <Ionicons
    name={
      sortOption === "newest"
        ? "time-outline"
        : sortOption === "popular"
        ? "heart-outline"
        : sortOption === "trending"
        ? "flame"
        : "people-outline"
    }
    size={16}
    color={theme.primary}
  />

  <Text style={styles.sortDropdownText}>
    {sortOption === "newest"
      ? "Newest"
      : sortOption === "popular"
      ? "Popular"
      : sortOption === "trending"
      ? "Trending"
      : "Following"}
  </Text>

  <Ionicons
    name={
      sortMenuVisible
        ? "chevron-up"
        : "chevron-down"
    }
    size={16}
    color={theme.textSecondary}
  />
</TouchableOpacity>
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
            : sortOption === "following"
              ? "people-outline"
              : "flask-outline"
        }
        size={40}
        color={theme.primary}
      />
    </View>

    <Text style={styles.emptyTitle}>
      {searchQuery
        ? "No matching mixes"
        : sortOption === "following"
          ? "Nothing from people you follow"
          : "No public mixes yet"}
    </Text>

    <Text style={styles.emptyText}>
      {searchQuery
        ? "Try searching for a different mix, creator, flavor, or brand."
        : sortOption === "following"
          ? followingIds.length === 0
            ? "Follow creators from Explore to see their public mixes here."
            : "The creators you follow haven't published any public mixes yet."
          : "Publish one of your mixes to help start the KloudIt community."}
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
            item.creatorUsername?.trim() || "KloudIt user"

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.88}
              onPress={() => openMix(item.id)}
            >
              <View style={styles.cardAccent} />

              <TouchableOpacity
  style={styles.creatorRow}
  activeOpacity={0.75}
  onPress={(event) => {
    event.stopPropagation()

    router.push({
      pathname: "/user/[id]",
      params: {
        id: item.userId,
      },
    })
  }}
>
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
</TouchableOpacity>

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
 sortOption === "trending" &&
 (item.likeCount > 0 ||
  item.ratingCount > 0) ? (
                  <View style={styles.trendingBadge}>
                    <Ionicons
                      name="flame"
                      size={13}
                      color="#E97930"
                    />

                   <Text style={styles.trendingText}>
  Trending
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

                <View style={styles.communityFooter}>
                  <View style={styles.ratingRow}>
                    <Ionicons
                      name="star"
                      size={16}
                      color="#F4B740"
                    />

                    <Text style={styles.ratingText}>
                      {item.ratingCount > 0
                        ? item.averageRating.toFixed(1)
                        : "New"}
                    </Text>

                    {item.ratingCount > 0 ? (
                      <Text style={styles.ratingCount}>
                        ({item.ratingCount})
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.openMixHint}>
                    <Text style={styles.openMixHintText}>
                      View Mix
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={15}
                      color={theme.primary}
                    />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )
        }}
      />
      <Modal
  visible={sortMenuVisible}
  transparent
  animationType="fade"
  onRequestClose={() =>
    setSortMenuVisible(false)
  }
>
  <Pressable
    style={styles.sortModalOverlay}
    onPress={() =>
      setSortMenuVisible(false)
    }
  >
    <Pressable
  style={[
    styles.sortModalCard,
    {
      top: sortMenuPosition.top,
      right: sortMenuPosition.right,
    },
  ]}
  onPress={(e) =>
    e.stopPropagation()
  }
>
      <View style={styles.sortModalHeader}>
        <Text style={styles.sortModalTitle}>
          Sort Community Mixes
        </Text>
      </View>

      {[
        {
          key: "newest",
          label: "Newest",
          icon: "time-outline",
        },
        {
          key: "popular",
          label: "Popular",
          icon: "heart-outline",
        },
        {
          key: "trending",
          label: "Trending",
          icon: "flame",
        },
        {
          key: "following",
          label: "Following",
          icon: "people-outline",
        },
      ].map((option, index) => (
        <View key={option.key}>
          <TouchableOpacity
            style={[
              styles.sortOption,
              sortOption === option.key &&
                styles.sortOptionActive,
            ]}
            onPress={() => {
              setSortOption(
                option.key as SortOption
              )
              setSortMenuVisible(false)
            }}
          >
            <Ionicons
              name={option.icon as any}
              size={20}
              color={
                sortOption === option.key
                  ? theme.primary
                  : theme.textSecondary
              }
            />

            <Text
              style={[
                styles.sortOptionText,
                sortOption === option.key &&
                  styles.sortOptionTextActive,
              ]}
            >
              {option.label}
            </Text>

            {sortOption === option.key && (
              <Ionicons
                name="checkmark"
                size={20}
                color={theme.primary}
              />
            )}
          </TouchableOpacity>

          {index < 3 && (
            <View style={styles.sortDivider} />
          )}
        </View>
      ))}

    
    </Pressable>
  </Pressable>
</Modal>
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

    discoverySection: {
      marginTop: 26,
    },

    discoveryHeader: {
      marginBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    discoveryHeaderText: {
      flex: 1,
      paddingRight: 14,
    },

    discoveryEyebrow: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.2,
      color: theme.primary,
    },

    discoveryTitle: {
      marginTop: 3,
      fontSize: 19,
      fontWeight: "800",
      color: theme.text,
    },

    discoverySubtitle: {
      marginTop: 3,
      fontSize: 12,
      color: theme.textSecondary,
    },

    discoveryIcon: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: theme.card,
    },

    discoveryLoading: {
      height: 130,
      alignItems: "center",
      justifyContent: "center",
    },

    horizontalListContent: {
      paddingRight: 18,
      gap: 12,
    },

    flavorCard: {
      width: 150,
      padding: 13,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.card,
    },

    flavorImageContainer: {
      width: "100%",
      height: 88,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderRadius: 15,
      backgroundColor: theme.primaryLight,
    },

    flavorImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },

    flavorName: {
      marginTop: 11,
      fontSize: 14,
      fontWeight: "800",
      color: theme.text,
    },

    flavorBrand: {
      marginTop: 3,
      fontSize: 11,
      color: theme.textSecondary,
    },

    flavorStatsRow: {
      marginTop: 9,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },

    flavorRating: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.text,
    },

    flavorRatingCount: {
      fontSize: 10,
      color: theme.textSecondary,
    },

    brandCard: {
      width: 132,
      padding: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.card,
    },

    brandLogoContainer: {
      width: 58,
      height: 58,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderRadius: 19,
      backgroundColor: theme.primaryLight,
    },

    brandLogo: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },

    brandInitial: {
      fontSize: 22,
      fontWeight: "900",
      color: theme.primaryDark,
    },

    brandName: {
      marginTop: 11,
      width: "100%",
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
      color: theme.text,
    },

    brandFlavorCount: {
      marginTop: 3,
      fontSize: 10,
      color: theme.textSecondary,
    },

    brandRatingRow: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },

    brandRatingText: {
      fontSize: 10,
      fontWeight: "800",
      color: theme.text,
    },

    sectionHeader: {
      marginTop: 28,
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
  paddingHorizontal: 8,
  paddingVertical: 8,
  flexDirection: "row",
  alignItems: "center",
  gap: 3,
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

    communityFooter: {
      flex: 1,
      marginLeft: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: "rgba(244,183,64,0.12)",
    },

    ratingText: {
      marginLeft: 4,
      fontSize: 13,
      fontWeight: "800",
      color: theme.text,
    },

    ratingCount: {
      marginLeft: 3,
      fontSize: 11,
      color: theme.textSecondary,
    },

    openMixHint: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 0,
    },

    openMixHintText: {
      marginRight: 5,
      fontSize: 12,
      fontWeight: "800",
      color: theme.primary,
    },

    sortDropdownButton: {
  height: 44,
  paddingHorizontal: 14,
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "flex-start",

  borderWidth: 1,
  borderColor: theme.border,
  borderRadius: 14,

  backgroundColor: theme.card,

  gap: 8,
},

sortDropdownText: {
  fontSize: 14,
  fontWeight: "700",
  color: theme.text,
},

sortModalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.20)",
},

sortModalCard: {
  position: "absolute",

  width: 230,

  borderRadius: 16,
  borderWidth: 1,
  borderColor: theme.border,

  backgroundColor: theme.card,
  overflow: "hidden",

  elevation: 8,

  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 12,
  shadowOffset: {
    width: 0,
    height: 6,
  },
},

sortModalHeader: {
  paddingHorizontal: 18,
  paddingVertical: 16,

  borderBottomWidth: 1,
  borderBottomColor: theme.border,
},

sortModalTitle: {
  fontSize: 16,
  fontWeight: "800",
  color: theme.text,
},

sortOption: {
  height: 52,
  paddingHorizontal: 16,

  flexDirection: "row",
  alignItems: "center",

  gap: 12,
},

sortOptionActive: {
  backgroundColor: theme.primaryLight,
},

sortOptionText: {
  flex: 1,

  fontSize: 15,
  fontWeight: "600",

  color: theme.text,
},

sortOptionTextActive: {
  color: theme.primary,
  fontWeight: "800",
},

sortDivider: {
  height: StyleSheet.hairlineWidth,
  backgroundColor: theme.border,
},

sortCloseButton: {
  margin: 16,

  height: 44,

  borderRadius: 12,

  alignItems: "center",
  justifyContent: "center",

  backgroundColor: theme.primary,
},

sortCloseButtonText: {
  color: "#FFFFFF",
  fontWeight: "700",
  fontSize: 15,
},
  })
}