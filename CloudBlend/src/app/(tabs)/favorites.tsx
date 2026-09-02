import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useMemo } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppTheme } from "@/constants/colors"
import { useAppTheme } from "@/context/AppThemeContext"
import {
  type SavedMix,
  useMixes,
} from "@/context/MixContext"

type MixListItem =
  | {
      type: "section"
      id: string
      title: string
      eyebrow: string
      count: number
    }
  | {
      type: "mix"
      id: string
      mix: SavedMix
      isCommunity: boolean
    }

export default function FavoritesScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(
    () => getStyles(theme),
    [theme]
  )

  const {
    savedMixes,
    isLoading,
    deleteMix,
  } = useMixes()

  const personalMixes = useMemo(
    () =>
      savedMixes.filter(
        (mix) => !mix.sourceMixId
      ),
    [savedMixes]
  )

  const communityMixes = useMemo(
    () =>
      savedMixes.filter((mix) =>
        Boolean(mix.sourceMixId)
      ),
    [savedMixes]
  )

  const listData = useMemo<MixListItem[]>(() => {
    const items: MixListItem[] = []

    if (personalMixes.length > 0) {
      items.push({
        type: "section",
        id: "personal-section",
        title: "My Combinations",
        eyebrow: "YOUR COLLECTIONS",
        count: personalMixes.length,
      })

      personalMixes.forEach((mix) => {
        items.push({
          type: "mix",
          id: `personal-${mix.id}`,
          mix,
          isCommunity: false,
        })
      })
    }

    if (communityMixes.length > 0) {
      items.push({
        type: "section",
        id: "community-section",
        title: "Community Collection",
        eyebrow: "SAVED FROM KLOUDIT",
        count: communityMixes.length,
      })

      communityMixes.forEach((mix) => {
        items.push({
          type: "mix",
          id: `community-${mix.id}`,
          mix,
          isCommunity: true,
        })
      })
    }

    return items
  }, [communityMixes, personalMixes])

  function openMix(mixId: string) {
    router.push({
      pathname: "/mix/[id]",
      params: {
        id: mixId,
      },
    })
  }

  function confirmDelete(mix: SavedMix) {
    const isCommunityMix = Boolean(
      mix.sourceMixId
    )

    Alert.alert(
      isCommunityMix
        ? "Remove Saved Combination"
        : "Delete Combination",
      isCommunityMix
        ? `Remove "${mix.name}" from your community collection?`
        : `Are you sure you want to delete "${mix.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: isCommunityMix
            ? "Remove"
            : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMix(mix.id)
            } catch (error) {
              console.error(
                "Could not delete combination:",
                error
              )

              Alert.alert(
                isCommunityMix
                  ? "Could Not Remove Combination"
                  : "Could Not Delete Combination",
                "Something went wrong. Please try again."
              )
            }
          },
        },
      ]
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={["top"]}
      >
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons
              name="sparkles"
              size={26}
              color="#FFFFFF"
            />
          </View>

          <ActivityIndicator
            size="large"
            color={theme.primary}
            style={styles.loadingIndicator}
          />

          <Text style={styles.loadingTitle}>
            Loading your combinations
          </Text>

          <Text style={styles.loadingText}>
            Getting your saved flavor combinations
            ready...
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
        data={listData}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          savedMixes.length === 0 &&
            styles.emptyListContent,
        ]}
        ListHeaderComponent={
          <View style={styles.hero}>
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />

            <View style={styles.heroTopRow}>
              <View style={styles.heroIcon}>
                <Ionicons
                  name="bookmark"
                  size={23}
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
                  {savedMixes.length}{" "}
                  {savedMixes.length === 1
                    ? "combination"
                    : "combinations"}
                </Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>
              Your flavor library
            </Text>

            <Text style={styles.heroSubtitle}>
              Keep your personal flavor combinations
              and saved community favorites together in
              one place.
            </Text>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  {personalMixes.length}
                </Text>

                <Text style={styles.heroStatLabel}>
                  My Mixes
                </Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  {communityMixes.length}
                </Text>

                <Text style={styles.heroStatLabel}>
                  Community
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.heroCreateButton}
              onPress={() =>
                router.push("/(tabs)/builder")
              }
            >
              <Ionicons
                name="add-circle-outline"
                size={19}
                color={theme.primary}
              />

              <Text
                style={
                  styles.heroCreateButtonText
                }
              >
                Create a new combination
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === "section") {
            return (
              <SectionHeader
                eyebrow={item.eyebrow}
                title={item.title}
                count={item.count}
                styles={styles}
              />
            )
          }

          return (
            <SavedMixCard
              mix={item.mix}
              isCommunity={item.isCommunity}
              onPress={() =>
                openMix(item.mix.id)
              }
              onDelete={() =>
                confirmDelete(item.mix)
              }
              theme={theme}
              styles={styles}
            />
          )
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="sparkles-outline"
                size={40}
                color={theme.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              Your flavor library is empty
            </Text>

            <Text style={styles.emptyText}>
              Create your first flavor combination or
              save a community favorite with KloudIt Pro.
            </Text>

            <TouchableOpacity
              style={styles.createButton}
              onPress={() =>
                router.push("/(tabs)/builder")
              }
            >
              <Ionicons
                name="add"
                size={20}
                color="#FFFFFF"
              />

              <Text
                style={styles.createButtonText}
              >
                Create your first combination
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  )
}

type SectionHeaderProps = {
  eyebrow: string
  title: string
  count: number
  styles: ReturnType<typeof getStyles>
}

function SectionHeader({
  eyebrow,
  title,
  count,
  styles,
}: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionEyebrow}>
          {eyebrow}
        </Text>

        <Text style={styles.sectionTitle}>
          {title}
        </Text>
      </View>

      <View style={styles.countBadge}>
        <Text style={styles.countBadgeText}>
          {count}
        </Text>
      </View>
    </View>
  )
}

type SavedMixCardProps = {
  mix: SavedMix
  isCommunity: boolean
  onPress: () => void
  onDelete: () => void
  theme: AppTheme
  styles: ReturnType<typeof getStyles>
}

function SavedMixCard({
  mix,
  isCommunity,
  onPress,
  onDelete,
  theme,
  styles,
}: SavedMixCardProps) {
  const createdDate = new Date(
    mix.createdAt
  ).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })


  return (
    <TouchableOpacity
      style={[
        styles.mixCard,
        isCommunity &&
          styles.communityMixCard,
      ]}
      activeOpacity={0.87}
      onPress={onPress}
    >
      <View
        style={[
          styles.cardAccent,
          isCommunity &&
            styles.communityCardAccent,
        ]}
      />

      <View style={styles.mixCardHeader}>
        <View
          style={[
            styles.mixIcon,
            isCommunity &&
              styles.communityMixIcon,
          ]}
        >
          <Ionicons
            name={
              isCommunity
                ? "people"
                : "sparkles"
            }
            size={22}
            color="#FFFFFF"
          />
        </View>

        <View
          style={styles.mixTitleContainer}
        >
          <View style={styles.titleRow}>
            <Text
              style={styles.mixName}
              numberOfLines={1}
            >
              {mix.name}
            </Text>

            {isCommunity ? (
              <View
                style={
                  styles.communityBadge
                }
              >
                <Ionicons
                  name="people-outline"
                  size={11}
                  color={theme.primary}
                />

                <Text
                  style={
                    styles.communityBadgeText
                  }
                >
                  Community
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.mixMetaRow}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={theme.textSecondary}
            />

            <Text style={styles.mixDate}>
              {createdDate}
            </Text>

            <View style={styles.metaDot} />

            <Text style={styles.mixDate}>
              {mix.ingredients.length}{" "}
              {mix.ingredients.length === 1
                ? "flavor"
                : "flavors"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(event) => {
            event.stopPropagation()
            onDelete()
          }}
        >
          <Ionicons
            name={
              isCommunity
                ? "bookmark-outline"
                : "trash-outline"
            }
            size={18}
            color={theme.danger}
          />
        </TouchableOpacity>
      </View>

      {isCommunity &&
      mix.creatorUsername ? (
        <View style={styles.creatorRow}>
          <Ionicons
            name="person-circle-outline"
            size={15}
            color={theme.primary}
          />

          <Text style={styles.creatorText}>
            Originally shared by @
            {mix.creatorUsername}
          </Text>
        </View>
      ) : null}

      <View style={styles.blendSummary}>
        <View>
          <Text style={styles.blendSummaryLabel}>
            FLAVOR COMBINATION
          </Text>

          <Text style={styles.blendSummaryValue}>
            {mix.ingredients.length}{" "}
            {mix.ingredients.length === 1
              ? "flavor"
              : "flavors"}
          </Text>
        </View>

        <View style={styles.readyBadge}>
          <Ionicons
            name="sparkles-outline"
            size={15}
            color={theme.primary}
          />

          <Text
            style={[
              styles.readyBadgeText,
              { color: theme.primary },
            ]}
          >
            Saved
          </Text>
        </View>
      </View>

      <View style={styles.ingredientList}>
        {mix.ingredients.map(
          (ingredient, index) => (
            <View
              key={`${ingredient.flavorId}-${index}`}
              style={styles.ingredientRow}
            >
              <View
                style={styles.ingredientInfo}
              >
                {ingredient.image ? (
                  <Image
                    source={{
                      uri: ingredient.image,
                    }}
                    style={
                      styles.ingredientImage
                    }
                  />
                ) : (
                  <View
                    style={
                      styles.ingredientImagePlaceholder
                    }
                  >
                    <Ionicons
                      name="color-palette-outline"
                      size={17}
                      color={theme.primary}
                    />
                  </View>
                )}

                <View
                  style={
                    styles.ingredientTextContainer
                  }
                >
                  <Text
                    style={
                      styles.ingredientName
                    }
                    numberOfLines={1}
                  >
                    {ingredient.flavorName}
                  </Text>
                </View>
              </View>
            </View>
          )
        )}
      </View>

      {mix.notes ? (
        <View style={styles.notesContainer}>
          <Ionicons
            name="document-text-outline"
            size={15}
            color={theme.textSecondary}
          />

          <Text
            style={styles.notes}
            numberOfLines={2}
          >
            {mix.notes}
          </Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.viewText}>
          View combination
        </Text>

        <View style={styles.arrowButton}>
          <Ionicons
            name="arrow-forward"
            size={17}
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
      paddingBottom: 36,
    },

    emptyListContent: {
      flexGrow: 1,
    },

    hero: {
      marginTop: 14,
      marginBottom: 28,
      padding: 22,
      overflow: "hidden",
      borderRadius: 28,
      backgroundColor: theme.primary,
    },

    heroGlowOne: {
      position: "absolute",
      top: -45,
      right: -34,
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor:
        "rgba(255,255,255,0.12)",
    },

    heroGlowTwo: {
      position: "absolute",
      bottom: -58,
      left: -34,
      width: 145,
      height: 145,
      borderRadius: 73,
      backgroundColor:
        "rgba(255,255,255,0.07)",
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
      backgroundColor:
        "rgba(255,255,255,0.17)",
    },

    heroCountBadge: {
      paddingHorizontal: 11,
      paddingVertical: 7,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 20,
      backgroundColor:
        "rgba(255,255,255,0.15)",
    },

    heroCountText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    heroTitle: {
      marginTop: 20,
      maxWidth: 320,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "900",
      letterSpacing: -0.7,
      color: "#FFFFFF",
    },

    heroSubtitle: {
      marginTop: 8,
      maxWidth: 325,
      fontSize: 14,
      lineHeight: 21,
      color: "rgba(255,255,255,0.82)",
    },

    heroStats: {
      marginTop: 20,
      paddingVertical: 15,
      flexDirection: "row",
      alignItems: "center",
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor:
        "rgba(255,255,255,0.15)",
    },

    heroStat: {
      flex: 1,
      alignItems: "center",
    },

    heroStatDivider: {
      width: 1,
      height: 34,
      backgroundColor:
        "rgba(255,255,255,0.18)",
    },

    heroStatValue: {
      fontSize: 21,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    heroStatLabel: {
      marginTop: 3,
      fontSize: 10,
      fontWeight: "700",
      color: "rgba(255,255,255,0.74)",
    },

    heroCreateButton: {
      alignSelf: "flex-start",
      marginTop: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderRadius: 14,
      backgroundColor: "#FFFFFF",
    },

    heroCreateButtonText: {
      fontSize: 12,
      fontWeight: "900",
      color: theme.primary,
    },

    sectionHeader: {
      marginTop: 4,
      marginBottom: 14,
      paddingHorizontal: 2,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },

    sectionEyebrow: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.4,
      color: theme.primary,
    },

    sectionTitle: {
      marginTop: 4,
      fontSize: 21,
      fontWeight: "900",
      color: theme.text,
    },

    countBadge: {
      minWidth: 42,
      height: 32,
      paddingHorizontal: 10,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
    },

    countBadgeText: {
      fontSize: 13,
      fontWeight: "900",
      color: theme.primaryDark,
    },

    loadingContainer: {
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
      fontWeight: "900",
      color: theme.text,
    },

    loadingText: {
      marginTop: 7,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
      color: theme.textSecondary,
    },

    emptyContainer: {
      flex: 1,
      paddingHorizontal: 30,
      paddingBottom: 30,
      alignItems: "center",
      justifyContent: "center",
    },

    emptyIcon: {
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

    createButton: {
      height: 52,
      marginTop: 22,
      paddingHorizontal: 22,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      borderRadius: 15,
      backgroundColor: theme.primary,
    },

    createButtonText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    mixCard: {
      position: "relative",
      marginBottom: 14,
      padding: 17,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },

    communityMixCard: {
      borderColor: `${theme.primary}35`,
    },

    cardAccent: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: 4,
      backgroundColor: theme.primary,
    },

    communityCardAccent: {
      width: 5,
      backgroundColor: theme.primaryDark,
    },

    mixCardHeader: {
      flexDirection: "row",
      alignItems: "center",
    },

    mixIcon: {
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.primary,
    },

    communityMixIcon: {
      backgroundColor: theme.primaryDark,
    },

    mixTitleContainer: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
    },

    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    mixName: {
      flexShrink: 1,
      fontSize: 17,
      fontWeight: "900",
      color: theme.text,
    },

    communityBadge: {
      paddingHorizontal: 7,
      paddingVertical: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      borderRadius: 9,
      backgroundColor: theme.primaryLight,
    },

    communityBadgeText: {
      fontSize: 8,
      fontWeight: "900",
      color: theme.primary,
    },

    creatorRow: {
      marginTop: 13,
      paddingHorizontal: 11,
      paddingVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 11,
      backgroundColor: theme.primaryLight,
    },

    creatorText: {
      flex: 1,
      fontSize: 11,
      fontWeight: "700",
      color: theme.primaryDark,
    },

    mixMetaRow: {
      marginTop: 5,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    mixDate: {
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

    deleteButton: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: `${theme.danger}18`,
    },

    blendSummary: {
      marginTop: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    blendSummaryLabel: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.1,
      color: theme.textSecondary,
    },

    blendSummaryValue: {
      marginTop: 2,
      fontSize: 23,
      fontWeight: "900",
      color: theme.text,
    },

    readyBadge: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 13,
      backgroundColor: `${theme.success}16`,
    },

    readyBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      color: theme.success,
    },

    readyBadgeTextWarning: {
      color: theme.warning,
    },

    progressTrack: {
      height: 7,
      marginTop: 11,
      overflow: "hidden",
      borderRadius: 4,
      backgroundColor: theme.divider,
    },

    progressFill: {
      height: "100%",
      borderRadius: 4,
      backgroundColor: theme.success,
    },

    progressFillWarning: {
      backgroundColor: theme.warning,
    },

    ingredientList: {
      marginTop: 17,
      padding: 13,
      gap: 11,
      borderRadius: 16,
      backgroundColor: theme.background,
    },

    ingredientRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    ingredientInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },

    ingredientImage: {
      width: 43,
      height: 43,
      borderRadius: 12,
      backgroundColor: theme.surface,
    },

    ingredientImagePlaceholder: {
      width: 43,
      height: 43,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
    },

    ingredientTextContainer: {
      flex: 1,
      marginLeft: 10,
      paddingRight: 10,
    },

    ingredientName: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.text,
    },

    ingredientBrand: {
      marginTop: 2,
      fontSize: 11,
      color: theme.textSecondary,
    },

    percentageBadge: {
      minWidth: 50,
      paddingHorizontal: 9,
      paddingVertical: 6,
      alignItems: "center",
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
    },

    percentageText: {
      fontSize: 12,
      fontWeight: "900",
      color: theme.primaryDark,
    },

    notesContainer: {
      marginTop: 14,
      padding: 12,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      borderRadius: 14,
      backgroundColor: theme.surface,
    },

    notes: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      color: theme.textSecondary,
    },

    cardFooter: {
      marginTop: 15,
      paddingTop: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },

    viewText: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.primary,
    },

    arrowButton: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      backgroundColor: theme.primaryLight,
    },
  })
}