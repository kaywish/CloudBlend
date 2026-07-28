import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams , router } from "expo-router"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
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
import { fetchFlavorStatistics } from "@/services/flavorService"
import type { Flavor } from "@/types/flavor"

const categoryIcons: Record<
  string,
  keyof typeof Ionicons.glyphMap
> = {
  All: "grid-outline",
  Fruity: "nutrition-outline",
  Fruit: "nutrition-outline",
  Minty: "leaf-outline",
  Mint: "leaf-outline",
  Sweet: "ice-cream-outline",
  Citrus: "sunny-outline",
  Creamy: "water-outline",
  Cream: "water-outline",
  Spiced: "flame-outline",
  Spice: "flame-outline",
}


  
export default function FlavorsScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => getStyles(theme), [theme])
  const params = useLocalSearchParams<{
    category?: string | string[]
  }>()

  const requestedCategory = Array.isArray(params.category)
    ? params.category[0]
    : params.category
  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] =
    useState("All")

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null)



  const loadFlavors = useCallback(
    async (isRefresh = false) => {
      try {
        setErrorMessage(null)

        if (isRefresh) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }

        const databaseFlavors =
          await fetchFlavorStatistics()

        setFlavors(databaseFlavors)
      } catch (error) {
        console.error("Could not load flavors:", error)

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load the flavor library."
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    []
  )

 useEffect(() => {
  loadFlavors()
}, [loadFlavors])

const categories = useMemo(() => {
  const availableCategories = flavors
    .map((flavor) => flavor.category?.trim())
    .filter(
      (category): category is string =>
        Boolean(category)
    )

  return [
    "All",
    ...Array.from(
      new Set(availableCategories)
    ).sort((first, second) =>
      first.localeCompare(second)
    ),
  ]
}, [flavors])

useEffect(() => {
  if (!requestedCategory || loading) return

  const matchingCategory = categories.find(
    (category) =>
      category.toLowerCase() ===
      requestedCategory.toLowerCase()
  )

  if (matchingCategory) {
    setSelectedCategory(matchingCategory)
  }
}, [requestedCategory, categories, loading])

useEffect(() => {
  if (loading || flavors.length === 0) return

  const categoryExists = categories.some(
    (category) =>
      category.toLowerCase() ===
      selectedCategory.toLowerCase()
  )

  if (
    selectedCategory !== "All" &&
    !categoryExists
  ) {
    setSelectedCategory("All")
  }
}, [
  categories,
  selectedCategory,
  loading,
  flavors.length,
])

  const filteredFlavors = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return flavors.filter((flavor) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        flavor.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        flavor.brandName
          .toLowerCase()
          .includes(normalizedSearch) ||
        flavor.category
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        flavor.description
          ?.toLowerCase()
          .includes(normalizedSearch)

      const matchesCategory =
  selectedCategory === "All" ||
  flavor.category?.toLowerCase() ===
    selectedCategory.toLowerCase()

      return matchesSearch && matchesCategory
    })
  }, [flavors, search, selectedCategory])

  function openFlavor(flavor: Flavor) {
    router.push({
      pathname: "/flavor/[id]",
      params: {
        id: flavor.id,
      },
    })
  }

  function clearFilters() {
    setSearch("")
    setSelectedCategory("All")
  }

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={["top"]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.primary}
          />

          <Text style={styles.loadingTitle}>
            Loading flavors
          </Text>

          <Text style={styles.loadingText}>
            Getting the latest flavors and brands.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (errorMessage && flavors.length === 0) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={["top"]}
      >
        <View style={styles.loadingContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={36}
              color={theme.primary}
            />
          </View>

          <Text style={styles.emptyTitle}>
            Could not load flavors
          </Text>

          <Text style={styles.emptyText}>
            {errorMessage}
          </Text>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => loadFlavors()}
          >
            <Text style={styles.resetButtonText}>
              Try again
            </Text>
          </TouchableOpacity>
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
        data={filteredFlavors}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadFlavors(true)}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          filteredFlavors.length === 0 &&
            styles.emptyListContent,
        ]}
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <View style={styles.heroGlowOne} />
              <View style={styles.heroGlowTwo} />

              <View style={styles.heroTopRow}>
                <View style={styles.heroIcon}>
                  <Ionicons
                    name="leaf"
                    size={24}
                    color="#FFFFFF"
                  />
                </View>

                <View style={styles.heroCountBadge}>
                  <Ionicons
                    name="sparkles-outline"
                    size={14}
                    color="#FFFFFF"
                  />

                  <Text style={styles.heroCountText}>
                    {flavors.length}{" "}
                    {flavors.length === 1
                      ? "flavor"
                      : "flavors"}
                  </Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>
                Discover your next favorite flavor
              </Text>

              <Text style={styles.heroSubtitle}>
                Browse the CloudBlend library and find
                the perfect combination for your next mix.
              </Text>
            </View>

            <View style={styles.searchCard}>
              <View style={styles.searchContainer}>
                <View style={styles.searchIcon}>
                  <Ionicons
                    name="search-outline"
                    size={19}
                    color={theme.primary}
                  />
                </View>

                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  style={styles.searchInput}
                  placeholder="Search flavors or brands"
                  placeholderTextColor={theme.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />

                {search.length > 0 ? (
                  <TouchableOpacity
                    style={styles.clearSearchButton}
                    onPress={() => setSearch("")}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>

              <FlatList
                horizontal
                data={categories}
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={
                  styles.categoryList
                }
                style={styles.categoryScroll}
                renderItem={({ item }) => {
                  const isSelected =
                    item === selectedCategory

                  return (
                    <TouchableOpacity
                      onPress={() =>
                        setSelectedCategory(item)
                      }
                      style={[
                        styles.categoryChip,
                        isSelected &&
                          styles.categoryChipSelected,
                      ]}
                    >
                      <Ionicons
                        name={
                          categoryIcons[item] ??
                          "pricetag-outline"
                        }
                        size={15}
                        color={
                          isSelected
                            ? "#FFFFFF"
                            : theme.textSecondary
                        }
                      />

                      <Text
                        style={[
                          styles.categoryChipText,
                          isSelected &&
                            styles.categoryChipTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )
                }}
              />
            </View>

            <View style={styles.resultsHeader}>
              <View>
                <Text style={styles.resultsEyebrow}>
                  FLAVOR LIBRARY
                </Text>

                <Text style={styles.resultsTitle}>
                  {selectedCategory === "All"
                    ? "All Flavors"
                    : `${selectedCategory} Flavors`}
                </Text>
              </View>

              <View style={styles.resultsCountBadge}>
                <Text style={styles.resultsCount}>
                  {filteredFlavors.length}
                </Text>
              </View>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <FlavorCard
            flavor={item}
            onPress={() => openFlavor(item)}
            theme={theme}
            styles={styles}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="search-outline"
                size={36}
                color={theme.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No flavors found
            </Text>

            <Text style={styles.emptyText}>
              Try another search term or choose a
              different category.
            </Text>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={clearFilters}
            >
              <Text style={styles.resetButtonText}>
                Reset filters
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  )
}

type FlavorCardProps = {
  flavor: Flavor
  onPress: () => void
  theme: AppTheme
  styles: ReturnType<typeof getStyles>
}

function FlavorCard({
  flavor,
  onPress,
  theme,
  styles,
}: FlavorCardProps) {
  return (
    <TouchableOpacity
      style={styles.flavorCard}
      activeOpacity={0.86}
      onPress={onPress}
    >
      <View style={styles.imageWrap}>
        {flavor.imageUrl ? (
          <Image
            source={{ uri: flavor.imageUrl }}
            style={styles.flavorImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.flavorImagePlaceholder}>
            <Ionicons
              name="leaf-outline"
              size={34}
              color={theme.primary}
            />
          </View>
        )}

        <View style={styles.ratingPill}>
          <Ionicons
            name="star"
            size={12}
            color={theme.warning}
          />

          <Text style={styles.ratingValue}>
            {flavor.averageRating.toFixed(1)}
          </Text>
        </View>
      </View>

      <View style={styles.flavorContent}>
        <View style={styles.flavorTopRow}>
          <View style={styles.flavorTitleContainer}>
            <Text
              style={styles.flavorName}
              numberOfLines={1}
            >
              {flavor.name}
            </Text>

            <View style={styles.brandRow}>
              {flavor.brandLogoUrl ? (
                <Image
                  source={{ uri: flavor.brandLogoUrl }}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
              ) : null}

              <Text
                style={styles.flavorBrand}
                numberOfLines={1}
              >
                {flavor.brandName}
              </Text>
            </View>
          </View>

          <View style={styles.chevronButton}>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.primary}
            />
          </View>
        </View>

        <View style={styles.tagContainer}>
          {flavor.category ? (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>
                {flavor.category}
              </Text>
            </View>
          ) : null}

          {flavor.strength ? (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>
                {formatStrength(flavor.strength)}
              </Text>
            </View>
          ) : null}

          {flavor.isDarkLeaf ? (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>
                Dark leaf
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.ratingCount}>
            {flavor.ratingCount}{" "}
            {flavor.ratingCount === 1
              ? "rating"
              : "ratings"}
          </Text>

          <Text style={styles.viewDetailsText}>
            View details
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function formatStrength(
  strength: "light" | "medium" | "strong"
) {
  return (
    strength.charAt(0).toUpperCase() +
    strength.slice(1)
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
      paddingBottom: 34,
    },

    emptyListContent: {
      flexGrow: 1,
    },

    hero: {
      marginTop: 14,
      marginBottom: 16,
      padding: 22,
      overflow: "hidden",
      borderRadius: 28,
      backgroundColor: theme.primary,
    },

    heroGlowOne: {
      position: "absolute",
      top: -42,
      right: -35,
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: "rgba(255,255,255,0.12)",
    },

    heroGlowTwo: {
      position: "absolute",
      bottom: -55,
      left: -30,
      width: 145,
      height: 145,
      borderRadius: 73,
      backgroundColor: "rgba(255,255,255,0.07)",
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

    heroCountBadge: {
      paddingHorizontal: 11,
      paddingVertical: 7,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.15)",
    },

    heroCountText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#FFFFFF",
    },

    heroTitle: {
      marginTop: 20,
      maxWidth: 315,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "900",
      letterSpacing: -0.7,
      color: "#FFFFFF",
    },

    heroSubtitle: {
      marginTop: 8,
      maxWidth: 320,
      fontSize: 14,
      lineHeight: 21,
      color: "rgba(255,255,255,0.82)",
    },

    searchCard: {
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },

    searchContainer: {
      height: 54,
      marginHorizontal: 14,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 16,
      backgroundColor: theme.surface,
    },

    searchIcon: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
    },

    searchInput: {
      flex: 1,
      height: "100%",
      marginLeft: 10,
      fontSize: 14,
      color: theme.text,
    },

    clearSearchButton: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.background,
    },

    categoryScroll: {
      flexGrow: 0,
      marginTop: 13,
    },

    categoryList: {
      paddingHorizontal: 14,
      gap: 8,
    },

    categoryChip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      backgroundColor: theme.background,
    },

    categoryChipSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },

    categoryChipText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.textSecondary,
    },

    categoryChipTextSelected: {
      color: "#FFFFFF",
    },

    resultsHeader: {
      marginTop: 24,
      marginBottom: 14,
      paddingHorizontal: 2,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },

    resultsEyebrow: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.4,
      color: theme.primary,
    },

    resultsTitle: {
      marginTop: 4,
      fontSize: 21,
      fontWeight: "900",
      color: theme.text,
    },

    resultsCountBadge: {
      minWidth: 42,
      height: 32,
      paddingHorizontal: 10,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
    },

    resultsCount: {
      fontSize: 13,
      fontWeight: "900",
      color: theme.primaryDark,
    },

    flavorCard: {
      minHeight: 132,
      marginBottom: 13,
      padding: 11,
      flexDirection: "row",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },

    imageWrap: {
      position: "relative",
    },

    flavorImage: {
      width: 106,
      height: 110,
      borderRadius: 17,
      backgroundColor: theme.surface,
    },

    ratingPill: {
      position: "absolute",
      left: 8,
      bottom: 8,
      paddingHorizontal: 7,
      paddingVertical: 5,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 10,
      backgroundColor: "rgba(19,15,12,0.78)",
    },

    ratingValue: {
      fontSize: 10,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    flavorContent: {
      flex: 1,
      marginLeft: 14,
      paddingVertical: 4,
      justifyContent: "space-between",
    },

    flavorTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },

    flavorTitleContainer: {
      flex: 1,
      paddingRight: 8,
    },

    flavorName: {
      fontSize: 17,
      fontWeight: "900",
      color: theme.text,
    },

    flavorBrand: {
      marginTop: 3,
      fontSize: 12,
      fontWeight: "600",
      color: theme.textSecondary,
    },

    chevronButton: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
    },

    tagContainer: {
      marginTop: 10,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },

    categoryTag: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: theme.surface,
    },

    categoryTagText: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.textSecondary,
    },

    cardFooter: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    ratingCount: {
      fontSize: 10,
      color: theme.muted,
    },

    viewDetailsText: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.primary,
    },

    emptyContainer: {
      flex: 1,
      paddingTop: 72,
      paddingHorizontal: 28,
      alignItems: "center",
    },

    emptyIcon: {
      width: 78,
      height: 78,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 26,
      backgroundColor: theme.primaryLight,
    },

    emptyTitle: {
      marginTop: 20,
      fontSize: 20,
      fontWeight: "900",
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
      fontWeight: "800",
      color: "#FFFFFF",
    },
    loadingContainer: {
  flex: 1,
  paddingHorizontal: 30,
  alignItems: "center",
  justifyContent: "center",
},

loadingTitle: {
  marginTop: 18,
  fontSize: 20,
  fontWeight: "900",
  color: theme.text,
},

loadingText: {
  marginTop: 7,
  fontSize: 14,
  textAlign: "center",
  color: theme.textSecondary,
},

flavorImagePlaceholder: {
  width: 106,
  height: 110,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 17,
  backgroundColor: theme.primaryLight,
},

brandRow: {
  maxWidth: "100%",
  marginTop: 4,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},

brandLogo: {
  width: 18,
  height: 18,
  borderRadius: 5,
},
  })
}