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
import { SavedMix, useMixes } from "@/context/MixContext"

export default function FavoritesScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => getStyles(theme), [theme])
  const { savedMixes, isLoading, deleteMix } = useMixes()

  function openMix(mixId: string) {
    router.push({
      pathname: "/mix/[id]",
      params: {
        id: mixId,
      },
    })
  }

  function confirmDelete(mix: SavedMix) {
    Alert.alert(
      "Delete Mix",
      `Are you sure you want to delete "${mix.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMix(mix.id)
            } catch (error) {
              console.error("Could not delete mix:", error)

              Alert.alert(
                "Could Not Delete",
                "Something went wrong while deleting this mix."
              )
            }
          },
        },
      ]
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons
              name="flask"
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
            Loading your mixes
          </Text>

          <Text style={styles.loadingText}>
            Getting your saved CloudBlend recipes ready...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        data={savedMixes}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          savedMixes.length === 0 && styles.emptyListContent,
        ]}
        ListHeaderComponent={
          <>
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
                    name="flask-outline"
                    size={14}
                    color="#FFFFFF"
                  />

                  <Text style={styles.heroCountText}>
                    {savedMixes.length}{" "}
                    {savedMixes.length === 1 ? "mix" : "mixes"}
                  </Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>
                Your saved flavor collection
              </Text>

              <Text style={styles.heroSubtitle}>
                Revisit your favorite recipes, fine-tune percentages,
                and keep building better blends.
              </Text>

              <TouchableOpacity
                style={styles.heroCreateButton}
                onPress={() => router.push("/(tabs)/builder")}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={19}
                  color={theme.primary}
                />

                <Text style={styles.heroCreateButtonText}>
                  Create a new mix
                </Text>
              </TouchableOpacity>
            </View>

            {savedMixes.length > 0 ? (
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>
                    YOUR COLLECTION
                  </Text>

                  <Text style={styles.sectionTitle}>
                    Saved Mixes
                  </Text>
                </View>

                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {savedMixes.length}
                  </Text>
                </View>
              </View>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <SavedMixCard
            mix={item}
            onPress={() => openMix(item.id)}
            onDelete={() => confirmDelete(item)}
            theme={theme}
            styles={styles}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="flask-outline"
                size={40}
                color={theme.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No saved mixes yet
            </Text>

            <Text style={styles.emptyText}>
              Create your first blend and it will appear here for
              quick access later.
            </Text>

            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push("/(tabs)/builder")}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />

              <Text style={styles.createButtonText}>
                Build your first mix
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  )
}

type SavedMixCardProps = {
  mix: SavedMix
  onPress: () => void
  onDelete: () => void
  theme: AppTheme
  styles: ReturnType<typeof getStyles>
}

function SavedMixCard({
  mix,
  onPress,
  onDelete,
  theme,
  styles,
}: SavedMixCardProps) {
  const createdDate = new Date(mix.createdAt).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  )

  const totalPercentage = mix.ingredients.reduce(
    (total, ingredient) => total + ingredient.percentage,
    0
  )

  return (
    <TouchableOpacity
      style={styles.mixCard}
      activeOpacity={0.87}
      onPress={onPress}
    >
      <View style={styles.cardAccent} />

      <View style={styles.mixCardHeader}>
        <View style={styles.mixIcon}>
          <Ionicons name="flask" size={22} color="#FFFFFF" />
        </View>

        <View style={styles.mixTitleContainer}>
          <Text style={styles.mixName} numberOfLines={1}>
            {mix.name}
          </Text>

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
            name="trash-outline"
            size={18}
            color={theme.danger}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.blendSummary}>
        <View>
          <Text style={styles.blendSummaryLabel}>
            BLEND TOTAL
          </Text>

          <Text style={styles.blendSummaryValue}>
            {totalPercentage}%
          </Text>
        </View>

        <View style={styles.readyBadge}>
          <Ionicons
            name={
              totalPercentage === 100
                ? "checkmark-circle"
                : "alert-circle"
            }
            size={15}
            color={
              totalPercentage === 100
                ? theme.success
                : theme.warning
            }
          />

          <Text
            style={[
              styles.readyBadgeText,
              totalPercentage !== 100 &&
                styles.readyBadgeTextWarning,
            ]}
          >
            {totalPercentage === 100 ? "Balanced" : "Review mix"}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(totalPercentage, 100)}%`,
            },
            totalPercentage !== 100 &&
              styles.progressFillWarning,
          ]}
        />
      </View>

      <View style={styles.ingredientList}>
        {mix.ingredients.map((ingredient) => (
          <View
            key={ingredient.flavorId}
            style={styles.ingredientRow}
          >
            <View style={styles.ingredientInfo}>
              {ingredient.image ? (
                <Image
                  source={{ uri: ingredient.image }}
                  style={styles.ingredientImage}
                />
              ) : (
                <View style={styles.ingredientImagePlaceholder}>
                  <Ionicons
                    name="leaf-outline"
                    size={17}
                    color={theme.primary}
                  />
                </View>
              )}

              <View style={styles.ingredientTextContainer}>
                <Text
                  style={styles.ingredientName}
                  numberOfLines={1}
                >
                  {ingredient.flavorName}
                </Text>

                {ingredient.brand ? (
                  <Text
                    style={styles.ingredientBrand}
                    numberOfLines={1}
                  >
                    {ingredient.brand}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.percentageBadge}>
              <Text style={styles.percentageText}>
                {ingredient.percentage}%
              </Text>
            </View>
          </View>
        ))}
      </View>

      {mix.notes ? (
        <View style={styles.notesContainer}>
          <Ionicons
            name="document-text-outline"
            size={15}
            color={theme.textSecondary}
          />

          <Text style={styles.notes} numberOfLines={2}>
            {mix.notes}
          </Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.viewText}>
          Open recipe
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
      marginBottom: 22,
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
      backgroundColor: "rgba(255,255,255,0.12)",
    },

    heroGlowTwo: {
      position: "absolute",
      bottom: -58,
      left: -34,
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
      maxWidth: 320,
      fontSize: 14,
      lineHeight: 21,
      color: "rgba(255,255,255,0.82)",
    },

    heroCreateButton: {
      alignSelf: "flex-start",
      marginTop: 20,
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

    cardAccent: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: 4,
      backgroundColor: theme.primary,
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

    mixTitleContainer: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
    },

    mixName: {
      fontSize: 17,
      fontWeight: "900",
      color: theme.text,
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