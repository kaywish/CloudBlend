import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppTheme } from "@/constants/colors"
import { useAppTheme } from "@/context/AppThemeContext"
import { useAuth } from "@/context/AuthContext"
import { useMixes } from "@/context/MixContext"

export default function MixDetailScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => getStyles(theme), [theme])
  const { user } = useAuth()

  const { id } = useLocalSearchParams<{
    id: string
    viewOnly?: string
  }>()

  const {
    getMixById,
    deleteMix,
    setMixVisibility,
    saveMix,
  } = useMixes()

  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingVisibility, setIsUpdatingVisibility] =
    useState(false)
  const [isSavingCopy, setIsSavingCopy] = useState(false)

  const mix = getMixById(id)

  if (!mix) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Ionicons
            name="flask-outline"
            size={52}
            color={theme.primary}
          />

          <Text style={styles.notFoundTitle}>
            Mix not found
          </Text>

          <Text style={styles.notFoundText}>
            This mix may have been removed or made private.
          </Text>

          <TouchableOpacity
            style={styles.backToFavoritesButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToFavoritesText}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const isOwner = Boolean(
    user?.id && mix.userId === user.id
  )

  const isSavedCommunityMix = Boolean(
    mix.sourceMixId
  )

  // Replace this with your RevenueCat entitlement later.
  const hasPro = false

  const totalPercentage = mix.ingredients.reduce(
    (total, ingredient) =>
      total + ingredient.percentage,
    0
  )

  const createdDate = new Date(
    mix.createdAt
  ).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  function showMessage(
    title: string,
    message: string
  ) {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`)
      return
    }

    Alert.alert(title, message)
  }

  async function handleShare() {
    const appStoreUrl =
      "https://apps.apple.com/app/cloudblend/idYOUR_APP_ID"

    try {
      await Share.share({
        title: `Check out ${mix.name}`,
        message: `Check out the mix "${mix.name}" on CloudBlend.\n\nDownload CloudBlend to discover flavors and create your own mixes:\n\n${appStoreUrl}`,
        url: appStoreUrl,
      })
    } catch (error) {
      console.error(
        "Could not share CloudBlend:",
        error
      )

      showMessage(
        "Could Not Share",
        "Something went wrong while sharing this mix."
      )
    }
  }

  async function handleSaveCommunityMix() {
    if (isOwner || isSavingCopy) {
      return
    }

    if (!user) {
      router.push("/login")
      return
    }

    if (!hasPro) {
      router.push("/pro")
      return
    }

    try {
      setIsSavingCopy(true)

      const attribution =
        mix.creatorUsername &&
        mix.creatorUsername !== "CloudBlend user"
          ? `Originally shared by @${mix.creatorUsername}`
          : "Originally shared on CloudBlend"

      const notes = [mix.notes, attribution]
        .filter(Boolean)
        .join("\n\n")

      const savedCopy = await saveMix({
        name: mix.name,
        notes,
        visibility: "private",
        sourceMixId: mix.id,
        ingredients: mix.ingredients.map(
          (ingredient) => ({
            flavorId: ingredient.flavorId,
            flavorName: ingredient.flavorName,
            brand: ingredient.brand,
            image: ingredient.image,
            percentage: ingredient.percentage,
          })
        ),
      })

      showMessage(
        "Mix Saved",
        "This mix was added to My Mixes and will remain private."
      )

      router.replace({
        pathname: "/mix/[id]",
        params: {
          id: savedCopy.id,
        },
      })
    } catch (error) {
      console.error(
        "Could not save community mix:",
        error
      )

      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while saving this mix."

      showMessage("Could Not Save Mix", message)
    } finally {
      setIsSavingCopy(false)
    }
  }

  async function performDelete() {
    if (!isOwner || isDeleting) {
      return
    }

    try {
      setIsDeleting(true)
      await deleteMix(mix.id)
      router.replace("/(tabs)/favorites")
    } catch (error) {
      console.error("Could not delete mix:", error)

      showMessage(
        "Could Not Delete",
        "Something went wrong while deleting this mix."
      )
    } finally {
      setIsDeleting(false)
    }
  }

  function confirmDelete() {
    if (!isOwner || isDeleting) {
      return
    }

    const message =
      `Are you sure you want to delete "${mix.name}"?`

    if (Platform.OS === "web") {
      const confirmed = window.confirm(message)

      if (confirmed) {
        void performDelete()
      }

      return
    }

    Alert.alert("Delete Mix", message, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void performDelete()
        },
      },
    ])
  }

  async function performVisibilityChange() {
    if (
      !isOwner ||
      isSavedCommunityMix ||
      isUpdatingVisibility
    ) {
      return
    }

    const newVisibility =
      mix.visibility === "public"
        ? "private"
        : "public"

    try {
      setIsUpdatingVisibility(true)

      await setMixVisibility(
        mix.id,
        newVisibility
      )

      const successMessage =
        newVisibility === "public"
          ? "Your mix is now visible to the CloudBlend community."
          : "Your mix is now private."

      showMessage(
        newVisibility === "public"
          ? "Mix Published"
          : "Mix Made Private",
        successMessage
      )
    } catch (error) {
      console.error(
        "Could not update mix visibility:",
        error
      )

      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."

      showMessage(
        "Could Not Update Mix",
        message
      )
    } finally {
      setIsUpdatingVisibility(false)
    }
  }

  function confirmVisibilityChange() {
    if (
      !isOwner ||
      isSavedCommunityMix ||
      isUpdatingVisibility
    ) {
      return
    }

    const makingPublic =
      mix.visibility !== "public"

    const title = makingPublic
      ? "Publish Mix"
      : "Make Mix Private"

    const message = makingPublic
      ? "This mix will be visible to everyone on CloudBlend."
      : "This mix will only be visible to you."

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `${title}\n\n${message}`
      )

      if (confirmed) {
        void performVisibilityChange()
      }

      return
    }

    Alert.alert(title, message, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: makingPublic
          ? "Publish"
          : "Make Private",
        onPress: () => {
          void performVisibilityChange()
        },
      },
    ])
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color={theme.text}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Mix Details
          </Text>

          {isOwner ? (
            <TouchableOpacity
              style={[
                styles.headerButton,
                isDeleting &&
                  styles.disabledButton,
              ]}
              onPress={confirmDelete}
              disabled={isDeleting}
            >
              <Ionicons
                name={
                  isDeleting
                    ? "hourglass-outline"
                    : "trash-outline"
                }
                size={21}
                color={theme.danger}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="flask"
                size={28}
                color="#FFFFFF"
              />
            </View>

            <View
              style={[
                styles.heroVisibilityBadge,
                mix.visibility === "public"
                  ? styles.heroVisibilityPublic
                  : styles.heroVisibilityPrivate,
              ]}
            >
              <Ionicons
                name={
                  mix.visibility === "public"
                    ? "earth"
                    : "lock-closed"
                }
                size={14}
                color="#FFFFFF"
              />

              <Text
                style={styles.heroVisibilityText}
              >
                {mix.visibility === "public"
                  ? "Public"
                  : "Private"}
              </Text>
            </View>
          </View>

          <Text style={styles.mixName}>
            {mix.name}
          </Text>

          {!isOwner && mix.creatorUsername ? (
            <View style={styles.creatorRow}>
              <Ionicons
                name="person-circle-outline"
                size={16}
                color="rgba(255,255,255,0.82)"
              />

              <Text style={styles.creatorText}>
                Mixed by @{mix.creatorUsername}
              </Text>
            </View>
          ) : null}

          <View style={styles.createdRow}>
            <Ionicons
              name="calendar-outline"
              size={13}
              color="rgba(255,255,255,0.76)"
            />

            <Text style={styles.createdDate}>
              Created {createdDate}
            </Text>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>
                {mix.ingredients.length}
              </Text>

              <Text style={styles.heroStatLabel}>
                {mix.ingredients.length === 1
                  ? "Flavor"
                  : "Flavors"}
              </Text>
            </View>

            <View style={styles.heroStatDivider} />

            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>
                {totalPercentage}%
              </Text>

              <Text style={styles.heroStatLabel}>
                Blend total
              </Text>
            </View>

            <View style={styles.heroStatDivider} />

            <View style={styles.heroStatItem}>
              <Ionicons
                name={
                  totalPercentage === 100
                    ? "checkmark-circle"
                    : "alert-circle"
                }
                size={22}
                color="#FFFFFF"
              />

              <Text style={styles.heroStatLabel}>
                {totalPercentage === 100
                  ? "Balanced"
                  : "Review"}
              </Text>
            </View>
          </View>

          {isOwner ? (
            isSavedCommunityMix ? (
              <View style={styles.savedPrivateBadge}>
                <Ionicons
                  name="bookmark"
                  size={17}
                  color="#FFFFFF"
                />

                <View style={styles.savedPrivateContent}>
                  <Text
                    style={styles.savedPrivateTitle}
                  >
                    Saved to My Mixes
                  </Text>

                  <Text
                    style={styles.savedPrivateText}
                  >
                    Community copies always remain private
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.visibilityButton,
                  isUpdatingVisibility &&
                    styles.disabledButton,
                ]}
                onPress={confirmVisibilityChange}
                disabled={isUpdatingVisibility}
              >
                <Ionicons
                  name={
                    isUpdatingVisibility
                      ? "hourglass-outline"
                      : mix.visibility === "public"
                        ? "lock-closed-outline"
                        : "earth-outline"
                  }
                  size={19}
                  color={theme.primary}
                />

                <Text
                  style={styles.visibilityButtonText}
                >
                  {isUpdatingVisibility
                    ? "Updating..."
                    : mix.visibility === "public"
                      ? "Make Private"
                      : "Publish Mix"}
                </Text>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.communityActions}>
              <View style={styles.publicViewerBadge}>
                <Ionicons
                  name="earth-outline"
                  size={16}
                  color="#FFFFFF"
                />

                <Text style={styles.publicViewerText}>
                  Community mix
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveCommunityButton,
                  isSavingCopy &&
                    styles.disabledButton,
                ]}
                onPress={() => {
                  void handleSaveCommunityMix()
                }}
                disabled={isSavingCopy}
              >
                {isSavingCopy ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.primary}
                  />
                ) : (
                  <Ionicons
                    name="bookmark-outline"
                    size={18}
                    color={theme.primary}
                  />
                )}

                <Text
                  style={styles.saveCommunityButtonText}
                >
                  {isSavingCopy
                    ? "Saving..."
                    : "Save Mix"}
                </Text>

                {!hasPro ? (
                  <View style={styles.proBadge}>
                    <Ionicons
                      name="sparkles"
                      size={11}
                      color="#FFFFFF"
                    />

                    <Text style={styles.proBadgeText}>
                      PRO
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              RECIPE
            </Text>

            <Text style={styles.sectionTitle}>
              Flavor Blend
            </Text>
          </View>

          <Text style={styles.flavorCount}>
            {mix.ingredients.length}{" "}
            {mix.ingredients.length === 1
              ? "flavor"
              : "flavors"}
          </Text>
        </View>

        <View style={styles.ingredientCard}>
          {mix.ingredients.map(
            (ingredient, index) => (
              <View
                key={`${ingredient.flavorId}-${index}`}
                style={[
                  styles.ingredientRow,
                  index <
                    mix.ingredients.length - 1 &&
                    styles.ingredientRowBorder,
                ]}
              >
                <View style={styles.ingredientInfo}>
                  {ingredient.image ? (
                    <Image
                      source={{
                        uri: ingredient.image,
                      }}
                      style={styles.ingredientImage}
                    />
                  ) : (
                    <View
                      style={
                        styles.ingredientPlaceholder
                      }
                    >
                      <Ionicons
                        name="leaf-outline"
                        size={20}
                        color={theme.primary}
                      />
                    </View>
                  )}

                  <View style={styles.ingredientText}>
                    <Text
                      style={styles.ingredientName}
                      numberOfLines={1}
                    >
                      {ingredient.flavorName}
                    </Text>

                    {ingredient.brand ? (
                      <Text
                        style={styles.ingredientBrand}
                      >
                        {ingredient.brand}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.percentageBadge}>
                  <Text
                    style={styles.percentageText}
                  >
                    {ingredient.percentage}%
                  </Text>
                </View>
              </View>
            )
          )}
        </View>

        {mix.notes ? (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text
                  style={styles.sectionEyebrow}
                >
                  DETAILS
                </Text>

                <Text style={styles.sectionTitle}>
                  Notes
                </Text>
              </View>
            </View>

            <View style={styles.notesCard}>
              <View style={styles.notesIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={19}
                  color={theme.primary}
                />
              </View>

              <Text style={styles.notesText}>
                {mix.notes}
              </Text>
            </View>
          </>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              PERCENTAGES
            </Text>

            <Text style={styles.sectionTitle}>
              Blend Breakdown
            </Text>
          </View>
        </View>

        <View style={styles.breakdownCard}>
          {mix.ingredients.map(
            (ingredient, index) => (
              <View
                key={`${ingredient.flavorId}-breakdown-${index}`}
                style={styles.breakdownItem}
              >
                <View style={styles.breakdownHeader}>
                  <Text
                    style={styles.breakdownName}
                    numberOfLines={1}
                  >
                    {ingredient.flavorName}
                  </Text>

                  <Text
                    style={
                      styles.breakdownPercentage
                    }
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
                          Math.max(
                            ingredient.percentage,
                            0
                          ),
                          100
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            )
          )}
        </View>

        <View style={styles.actionRow}>
          {isOwner ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/builder",
                  params: {
                    editMixId: mix.id,
                  },
                })
              }
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={theme.primary}
              />

              <Text
                style={styles.secondaryButtonText}
              >
                Edit
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleShare}
          >
            <Ionicons
              name="share-outline"
              size={20}
              color="#FFFFFF"
            />

            <Text style={styles.primaryButtonText}>
              Share
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function getStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },

    scrollContent: {
      paddingBottom: 35,
    },

    header: {
      height: 58,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    headerButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
    },

    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
    },

    heroCard: {
      marginHorizontal: 18,
      padding: 22,
      overflow: "hidden",
      borderRadius: 28,
      backgroundColor: theme.primary,
    },

    heroGlowOne: {
      position: "absolute",
      top: -48,
      right: -35,
      width: 155,
      height: 155,
      borderRadius: 78,
      backgroundColor:
        "rgba(255,255,255,0.12)",
    },

    heroGlowTwo: {
      position: "absolute",
      bottom: -58,
      left: -35,
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor:
        "rgba(255,255,255,0.07)",
    },

    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    heroIcon: {
      width: 52,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 17,
      backgroundColor:
        "rgba(255,255,255,0.17)",
    },

    heroVisibilityBadge: {
      paddingHorizontal: 11,
      paddingVertical: 7,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 18,
    },

    heroVisibilityPublic: {
      backgroundColor:
        "rgba(91,154,88,0.30)",
    },

    heroVisibilityPrivate: {
      backgroundColor:
        "rgba(240,165,26,0.28)",
    },

    heroVisibilityText: {
      fontSize: 11,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    mixName: {
      marginTop: 20,
      maxWidth: 320,
      fontSize: 29,
      lineHeight: 35,
      fontWeight: "900",
      letterSpacing: -0.7,
      color: "#FFFFFF",
    },

    creatorRow: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    creatorText: {
      fontSize: 12,
      fontWeight: "700",
      color: "rgba(255,255,255,0.82)",
    },

    createdRow: {
      marginTop: 7,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    createdDate: {
      fontSize: 12,
      color: "rgba(255,255,255,0.76)",
    },

    heroStatsRow: {
      marginTop: 22,
      paddingTop: 18,
      flexDirection: "row",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor:
        "rgba(255,255,255,0.16)",
    },

    heroStatItem: {
      flex: 1,
      alignItems: "center",
    },

    heroStatValue: {
      fontSize: 21,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    heroStatLabel: {
      marginTop: 4,
      fontSize: 10,
      fontWeight: "700",
      color: "rgba(255,255,255,0.72)",
    },

    heroStatDivider: {
      width: 1,
      height: 34,
      backgroundColor:
        "rgba(255,255,255,0.17)",
    },

    visibilityButton: {
      alignSelf: "flex-start",
      marginTop: 20,
      paddingHorizontal: 15,
      paddingVertical: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderRadius: 14,
      backgroundColor: "#FFFFFF",
    },

    visibilityButtonText: {
      fontSize: 12,
      fontWeight: "900",
      color: theme.primary,
    },

    communityActions: {
      marginTop: 20,
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 10,
    },

    publicViewerBadge: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 14,
      backgroundColor:
        "rgba(255,255,255,0.16)",
    },

    publicViewerText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    saveCommunityButton: {
      minHeight: 40,
      paddingHorizontal: 13,
      paddingVertical: 9,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderRadius: 14,
      backgroundColor: "#FFFFFF",
    },

    saveCommunityButtonText: {
      fontSize: 12,
      fontWeight: "900",
      color: theme.primary,
    },

    proBadge: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      borderRadius: 7,
      backgroundColor: theme.primary,
    },

    proBadgeText: {
      fontSize: 8,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    savedPrivateBadge: {
      alignSelf: "flex-start",
      marginTop: 20,
      maxWidth: "100%",
      paddingHorizontal: 13,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      borderRadius: 14,
      backgroundColor:
        "rgba(255,255,255,0.16)",
    },

    savedPrivateContent: {
      flexShrink: 1,
    },

    savedPrivateTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    savedPrivateText: {
      marginTop: 2,
      fontSize: 10,
      color: "rgba(255,255,255,0.72)",
    },

    sectionHeader: {
      marginTop: 27,
      marginBottom: 13,
      paddingHorizontal: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    sectionEyebrow: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.3,
      color: theme.primary,
    },

    sectionTitle: {
      marginTop: 4,
      fontSize: 20,
      fontWeight: "900",
      color: theme.text,
    },

    flavorCount: {
      fontSize: 12,
      color: theme.textSecondary,
    },

    ingredientCard: {
      marginHorizontal: 18,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },

    ingredientRow: {
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    ingredientRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },

    ingredientInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },

    ingredientImage: {
      width: 52,
      height: 52,
      borderRadius: 13,
      backgroundColor: theme.surface,
    },

    ingredientPlaceholder: {
      width: 52,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: theme.primaryLight,
    },

    ingredientText: {
      flex: 1,
      marginLeft: 12,
      paddingRight: 10,
    },

    ingredientName: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.text,
    },

    ingredientBrand: {
      marginTop: 3,
      fontSize: 12,
      color: theme.textSecondary,
    },

    percentageBadge: {
      minWidth: 54,
      paddingHorizontal: 10,
      paddingVertical: 7,
      alignItems: "center",
      borderRadius: 13,
      backgroundColor: theme.primaryLight,
    },

    percentageText: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.primaryDark,
    },

    notesCard: {
      marginHorizontal: 18,
      padding: 17,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.card,
    },

    notesIcon: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
    },

    notesText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 22,
      color: theme.textSecondary,
    },

    breakdownCard: {
      marginHorizontal: 18,
      padding: 18,
      gap: 17,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },

    breakdownItem: {
      gap: 8,
    },

    breakdownHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    breakdownName: {
      flex: 1,
      paddingRight: 10,
      fontSize: 13,
      fontWeight: "600",
      color: theme.text,
    },

    breakdownPercentage: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.primary,
    },

    progressTrack: {
      height: 7,
      overflow: "hidden",
      borderRadius: 4,
      backgroundColor: theme.divider,
    },

    progressFill: {
      height: "100%",
      borderRadius: 4,
      backgroundColor: theme.primary,
    },

    actionRow: {
      marginHorizontal: 18,
      marginTop: 29,
      flexDirection: "row",
      gap: 12,
    },

    secondaryButton: {
      flex: 1,
      height: 54,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 16,
      backgroundColor: theme.background,
    },

    secondaryButtonText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.primary,
    },

    primaryButton: {
      flex: 1,
      height: 54,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      borderRadius: 16,
      backgroundColor: theme.primary,
    },

    primaryButtonText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#FFFFFF",
    },

    disabledButton: {
      opacity: 0.55,
    },

    notFoundContainer: {
      flex: 1,
      paddingHorizontal: 30,
      alignItems: "center",
      justifyContent: "center",
    },

    notFoundTitle: {
      marginTop: 16,
      fontSize: 21,
      fontWeight: "700",
      color: theme.text,
    },

    notFoundText: {
      marginTop: 7,
      fontSize: 14,
      textAlign: "center",
      color: theme.textSecondary,
    },

    backToFavoritesButton: {
      marginTop: 23,
      paddingHorizontal: 20,
      paddingVertical: 13,
      borderRadius: 14,
      backgroundColor: theme.primary,
    },

    backToFavoritesText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#FFFFFF",
    },
  })
}