import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePro } from "@/context/ProContext"
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppTheme } from "@/constants/colors"
import { useAppTheme } from "@/context/AppThemeContext"
import { useAuth } from "@/context/AuthContext"
import { useMixes } from "@/context/MixContext"
import { supabase } from "@/lib/supabase"

type MixReview = {
  id: string
  mixId: string
  userId: string
  rating: number
  review: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

type MixReviewRow = {
  id: string
  mix_id: string
  user_id: string
  rating: number
  review: string | null
  created_at: string
  updated_at: string
}

type ReviewProfileRow = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

export default function MixDetailScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => getStyles(theme), [theme])
  const { user } = useAuth()
  const { hasPro, isLoadingPro } = usePro()

  const { id, autoSave } = useLocalSearchParams<{
    id: string
    viewOnly?: string
    autoSave?: string
  }>()

  const {
    getMixById,
    deleteMix,
    setMixVisibility,
    saveMix,
  } = useMixes()

  const [isDeleting, setIsDeleting] = useState(false)
  const autoSaveAttemptedRef = useRef(false)
  const [isUpdatingVisibility, setIsUpdatingVisibility] =
    useState(false)
  const [isSavingCopy, setIsSavingCopy] = useState(false)

  const [reviews, setReviews] = useState<MixReview[]>([])
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [ratingModalVisible, setRatingModalVisible] = useState(false)
  const [selectedRating, setSelectedRating] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  const mix = getMixById(id)

  const myReview = useMemo(
    () =>
      reviews.find(
        (review) => review.userId === user?.id
      ) ?? null,
    [reviews, user?.id]
  )

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0

    return (
      reviews.reduce(
        (total, review) => total + review.rating,
        0
      ) / reviews.length
    )
  }, [reviews])

  const ratingCount = reviews.length

  async function loadMixReviews() {
    if (!id) {
      setReviews([])
      return
    }

    try {
      setIsLoadingReviews(true)

      const { data, error } = await supabase
        .from("mix_reviews")
        .select(`
          id,
          mix_id,
          user_id,
          rating,
          review,
          created_at,
          updated_at
        `)
        .eq("mix_id", id)
        .order("created_at", {
          ascending: false,
        })

      if (error) {
        throw error
      }

      const rows = (data ?? []) as MixReviewRow[]

      const userIds = [
        ...new Set(
          rows.map((row) => row.user_id)
        ),
      ]

      const profilesById =
        new Map<string, ReviewProfileRow>()

      if (userIds.length > 0) {
        const {
          data: profiles,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, username, display_name, avatar_url"
          )
          .in("id", userIds)

        if (profileError) {
          console.error(
            "Could not load review profiles:",
            profileError
          )
        } else {
          for (const profile of
            (profiles ?? []) as ReviewProfileRow[]) {
            profilesById.set(
              profile.id,
              profile
            )
          }
        }
      }

      setReviews(
        rows.map((row) => {
          const profile =
            profilesById.get(row.user_id)

          return {
            id: row.id,
            mixId: row.mix_id,
            userId: row.user_id,
            rating: Number(row.rating),
            review: row.review ?? "",
            username:
              profile?.username?.trim() ||
              "KloudIt user",
            displayName:
              profile?.display_name?.trim() ||
              null,
            avatarUrl:
              profile?.avatar_url ?? null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }
        })
      )
    } catch (error) {
      console.error(
        "Could not load mix reviews:",
        error
      )
    } finally {
      setIsLoadingReviews(false)
    }
  }

  useEffect(() => {
    void loadMixReviews()
  }, [id])


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
        message: `Check out the mix "${mix.name}" on KloudIt.\n\nDownload KloudIt to discover flavors and create your own mixes:\n\n${appStoreUrl}`,
        url: appStoreUrl,
      })
    } catch (error) {
      console.error(
        "Could not share KloudIt:",
        error
      )

      showMessage(
        "Could Not Share",
        "Something went wrong while sharing this mix."
      )
    }
  }

async function saveCommunityMixCopy() {
  if (isOwner || isSavingCopy) {
    return
  }

  try {
    setIsSavingCopy(true)

    const attribution =
      mix.creatorUsername &&
      mix.creatorUsername !== "KloudIt user"
        ? `Originally shared by @${mix.creatorUsername}`
        : "Originally shared on KloudIt"

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
      "This community mix was added to My Mixes and will remain private."
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

async function handleSaveCommunityMix() {
  if (
    isOwner ||
    isSavingCopy ||
    isLoadingPro
  ) {
    return
  }

  if (!user) {
    router.push("/auth")
    return
  }

  if (!hasPro) {
    router.push({
      pathname: "/pro",
      params: {
        returnMixId: mix.id,
      },
    })

    return
  }

  await saveCommunityMixCopy()
}

useEffect(() => {
  if (
    autoSave !== "true" ||
    autoSaveAttemptedRef.current ||
    isLoadingPro ||
    !hasPro ||
    !user ||
    isOwner ||
    isSavedCommunityMix ||
    isSavingCopy
  ) {
    return
  }

  autoSaveAttemptedRef.current = true

  void saveCommunityMixCopy()
}, [
  autoSave,
  hasPro,
  isLoadingPro,
  isOwner,
  isSavedCommunityMix,
  isSavingCopy,
  user,
])

  function openRatingModal() {
    if (!mix) return

    if (!user) {
      if (Platform.OS === "web") {
        const shouldSignIn = window.confirm(
          "Sign in to rate and review community mixes."
        )

        if (shouldSignIn) {
          router.push("/auth")
        }

        return
      }

      Alert.alert(
        "Sign In Required",
        "Sign in to rate and review community mixes.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Sign In",
            onPress: () => router.push("/auth"),
          },
        ]
      )

      return
    }

    if (mix.userId === user.id) {
      showMessage(
        "Your Mix",
        "You can't rate your own mix."
      )
      return
    }

    if (mix.visibility !== "public") {
      showMessage(
        "Public Mixes Only",
        "Only public community mixes can be rated."
      )
      return
    }

    setSelectedRating(myReview?.rating ?? 0)
    setReviewText(myReview?.review ?? "")
    setRatingModalVisible(true)
  }

  async function handleSubmitReview() {
    if (!mix || selectedRating < 1) {
      showMessage(
        "Choose a Rating",
        "Select between 1 and 5 stars."
      )
      return
    }

    if (!user) {
      router.push("/auth")
      return
    }

    try {
      setIsSubmittingReview(true)

      const cleanReview = reviewText.trim()

      const { error } = await supabase
        .from("mix_reviews")
        .upsert(
          {
            mix_id: mix.id,
            user_id: user.id,
            rating: selectedRating,
            review: cleanReview || null,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "mix_id,user_id",
          }
        )

      if (error) {
        throw error
      }

      await loadMixReviews()

      setRatingModalVisible(false)

      showMessage(
        myReview
          ? "Review Updated"
          : "Review Submitted",
        "Thanks for sharing your feedback with the KloudIt community."
      )
    } catch (error) {
      console.error(
        "Could not submit mix review:",
        error
      )

      showMessage(
        "Could Not Save Review",
        error instanceof Error
          ? error.message
          : "Something went wrong while saving your review."
      )
    } finally {
      setIsSubmittingReview(false)
    }
  }

  async function handleDeleteReview() {
    if (!user || !myReview) return

    const performDeleteReview = async () => {
      try {
        const { error } = await supabase
          .from("mix_reviews")
          .delete()
          .eq("id", myReview.id)
          .eq("user_id", user.id)

        if (error) {
          throw error
        }

        await loadMixReviews()
        setSelectedRating(0)
        setReviewText("")

        showMessage(
          "Review Removed",
          "Your rating and review were removed."
        )
      } catch (error) {
        console.error(
          "Could not delete mix review:",
          error
        )

        showMessage(
          "Could Not Remove Review",
          "Please try again."
        )
      }
    }

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Remove your rating and review?"
      )

      if (confirmed) {
        await performDeleteReview()
      }

      return
    }

    Alert.alert(
      "Remove Review",
      "Remove your rating and review?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void performDeleteReview()
          },
        },
      ]
    )
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
          ? "Your mix is now visible to the KloudIt community."
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
      ? "This mix will be visible to everyone on KloudIt."
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
  (isSavingCopy || isLoadingPro) &&
    styles.disabledButton,
]}
                onPress={() => {
                  void handleSaveCommunityMix()
                }}
                disabled={isSavingCopy || isLoadingPro}
              >
                {isSavingCopy || isLoadingPro ? (
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

                <Text style={styles.saveCommunityButtonText}>
  {isSavingCopy
    ? "Saving..."
    : isLoadingPro
      ? "Checking Pro..."
      : "Save Mix"}
</Text>

              {!isLoadingPro && !hasPro ? (
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

        {mix.visibility === "public" ? (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>
                  COMMUNITY FEEDBACK
                </Text>

                <Text style={styles.sectionTitle}>
                  Ratings & Reviews
                </Text>
              </View>

              {!isOwner ? (
                <TouchableOpacity
                  style={styles.rateMixButton}
                  onPress={openRatingModal}
                >
                  <Ionicons
                    name={
                      myReview
                        ? "create-outline"
                        : "star-outline"
                    }
                    size={17}
                    color="#FFFFFF"
                  />

                  <Text style={styles.rateMixButtonText}>
                    {myReview
                      ? "Edit Rating"
                      : "Rate Mix"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.ratingSummaryCard}>
              <View style={styles.ratingSummaryScore}>
                <Text style={styles.ratingSummaryValue}>
                  {ratingCount > 0
                    ? averageRating.toFixed(1)
                    : "—"}
                </Text>

                <View style={styles.ratingSummaryStars}>
                  {[1, 2, 3, 4, 5].map(
                    (star) => (
                      <Ionicons
                        key={star}
                        name={
                          star <=
                          Math.round(averageRating)
                            ? "star"
                            : "star-outline"
                        }
                        size={18}
                        color={theme.warning}
                      />
                    )
                  )}
                </View>

                <Text style={styles.ratingSummaryCount}>
                  {ratingCount}{" "}
                  {ratingCount === 1
                    ? "rating"
                    : "ratings"}
                </Text>
              </View>

              <View style={styles.ratingSummaryDivider} />

              <View style={styles.ratingSummaryInfo}>
                <Text style={styles.ratingSummaryTitle}>
                  Community score
                </Text>

                <Text style={styles.ratingSummaryText}>
                  {ratingCount === 0
                    ? "Be the first community member to rate this mix."
                    : "Ratings are submitted by KloudIt community members."}
                </Text>

                {!isOwner ? (
                  <TouchableOpacity
                    style={styles.ratingSummaryAction}
                    onPress={openRatingModal}
                  >
                    <Ionicons
                      name={
                        myReview
                          ? "create-outline"
                          : "star-outline"
                      }
                      size={15}
                      color={theme.primary}
                    />

                    <Text
                      style={
                        styles.ratingSummaryActionText
                      }
                    >
                      {myReview
                        ? "Update your review"
                        : "Share your rating"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.ownerRatingNote}>
                    You can read community feedback
                    on your mix here.
                  </Text>
                )}
              </View>
            </View>

            {isLoadingReviews ? (
              <View style={styles.reviewsLoadingCard}>
                <ActivityIndicator
                  color={theme.primary}
                />

                <Text style={styles.reviewsLoadingText}>
                  Loading community reviews...
                </Text>
              </View>
            ) : reviews.length === 0 ? (
              <View style={styles.noReviewsCard}>
                <View style={styles.noReviewsIcon}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={28}
                    color={theme.primary}
                  />
                </View>

                <Text style={styles.noReviewsTitle}>
                  No reviews yet
                </Text>

                <Text style={styles.noReviewsText}>
                  This mix hasn't received any
                  community ratings yet.
                </Text>

                {!isOwner ? (
                  <TouchableOpacity
                    style={styles.writeFirstReviewButton}
                    onPress={openRatingModal}
                  >
                    <Ionicons
                      name="star-outline"
                      size={17}
                      color={theme.primary}
                    />

                    <Text
                      style={
                        styles.writeFirstReviewText
                      }
                    >
                      Write the first review
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <View style={styles.reviewsList}>
                {reviews.map((review) => {
                  const reviewerName =
                    review.displayName ||
                    review.username

                  const reviewDate =
                    new Date(
                      review.updatedAt ||
                        review.createdAt
                    ).toLocaleDateString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )

                  return (
                    <View
                      key={review.id}
                      style={styles.reviewCard}
                    >
                      <View style={styles.reviewHeader}>
                        <View
                          style={styles.reviewerInfo}
                        >
                          {review.avatarUrl ? (
                            <Image
                              source={{
                                uri: review.avatarUrl,
                              }}
                              style={
                                styles.reviewerAvatar
                              }
                            />
                          ) : (
                            <View
                              style={
                                styles.reviewerAvatarFallback
                              }
                            >
                              <Text
                                style={
                                  styles.reviewerInitial
                                }
                              >
                                {reviewerName
                                  .charAt(0)
                                  .toUpperCase()}
                              </Text>
                            </View>
                          )}

                          <View
                            style={
                              styles.reviewerText
                            }
                          >
                            <Text
                              style={
                                styles.reviewerName
                              }
                            >
                              {reviewerName}
                            </Text>

                            <Text
                              style={
                                styles.reviewDate
                              }
                            >
                              @{review.username} •{" "}
                              {reviewDate}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={
                            styles.reviewScoreBadge
                          }
                        >
                          <Ionicons
                            name="star"
                            size={13}
                            color={theme.warning}
                          />

                          <Text
                            style={
                              styles.reviewScoreText
                            }
                          >
                            {review.rating.toFixed(1)}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={styles.reviewStars}
                      >
                        {[1, 2, 3, 4, 5].map(
                          (star) => (
                            <Ionicons
                              key={star}
                              name={
                                star <=
                                review.rating
                                  ? "star"
                                  : "star-outline"
                              }
                              size={15}
                              color={
                                theme.warning
                              }
                            />
                          )
                        )}
                      </View>

                      {review.review ? (
                        <Text
                          style={styles.reviewBody}
                        >
                          {review.review}
                        </Text>
                      ) : (
                        <Text
                          style={
                            styles.reviewBodyMuted
                          }
                        >
                          Rating only
                        </Text>
                      )}

                      {review.userId ===
                      user?.id ? (
                        <View
                          style={
                            styles.myReviewActions
                          }
                        >
                          <TouchableOpacity
                            style={
                              styles.reviewActionButton
                            }
                            onPress={
                              openRatingModal
                            }
                          >
                            <Ionicons
                              name="create-outline"
                              size={15}
                              color={
                                theme.primary
                              }
                            />

                            <Text
                              style={
                                styles.reviewActionText
                              }
                            >
                              Edit
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={
                              styles.reviewActionButton
                            }
                            onPress={() => {
                              void handleDeleteReview()
                            }}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={15}
                              color={theme.danger}
                            />

                            <Text
                              style={[
                                styles.reviewActionText,
                                {
                                  color:
                                    theme.danger,
                                },
                              ]}
                            >
                              Remove
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  )
                })}
              </View>
            )}
          </>
        ) : null}

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

      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isSubmittingReview) {
            setRatingModalVisible(false)
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              if (!isSubmittingReview) {
                setRatingModalVisible(false)
              }
            }}
          />

          <View style={styles.ratingModalCard}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>
                  {myReview
                    ? "Update your review"
                    : "Rate this mix"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  {mix.name}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                disabled={isSubmittingReview}
                onPress={() =>
                  setRatingModalVisible(false)
                }
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.starPicker}>
              {[1, 2, 3, 4, 5].map(
                (star) => (
                  <TouchableOpacity
                    key={star}
                    style={styles.starButton}
                    activeOpacity={0.7}
                    onPress={() =>
                      setSelectedRating(star)
                    }
                  >
                    <Ionicons
                      name={
                        star <= selectedRating
                          ? "star"
                          : "star-outline"
                      }
                      size={38}
                      color={theme.warning}
                    />
                  </TouchableOpacity>
                )
              )}
            </View>

            <Text
              style={styles.selectedRatingText}
            >
              {selectedRating === 0
                ? "Tap a star to rate"
                : `${selectedRating} out of 5`}
            </Text>

            <Text style={styles.reviewInputLabel}>
              Review{" "}
              <Text
                style={styles.optionalLabel}
              >
                (optional)
              </Text>
            </Text>

            <TextInput
              style={styles.reviewInput}
              value={reviewText}
              onChangeText={setReviewText}
              placeholder="What did you think about this mix?"
              placeholderTextColor={
                theme.textSecondary
              }
              multiline
              maxLength={500}
              textAlignVertical="top"
            />

            <Text
              style={styles.reviewCharacterCount}
            >
              {reviewText.length}/500
            </Text>

            <TouchableOpacity
              style={[
                styles.submitReviewButton,
                (selectedRating === 0 ||
                  isSubmittingReview) &&
                  styles.disabledButton,
              ]}
              disabled={
                selectedRating === 0 ||
                isSubmittingReview
              }
              onPress={() => {
                void handleSubmitReview()
              }}
            >
              {isSubmittingReview ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.submitReviewText
                    }
                  >
                    {myReview
                      ? "Update Review"
                      : "Submit Review"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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

    rateMixButton: {
      paddingHorizontal: 13,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 13,
      backgroundColor: theme.primary,
    },

    rateMixButtonText: {
      fontSize: 11,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    ratingSummaryCard: {
      marginHorizontal: 18,
      padding: 18,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },

    ratingSummaryScore: {
      width: 112,
      alignItems: "center",
    },

    ratingSummaryValue: {
      fontSize: 34,
      lineHeight: 40,
      fontWeight: "900",
      color: theme.text,
    },

    ratingSummaryStars: {
      marginTop: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },

    ratingSummaryCount: {
      marginTop: 6,
      fontSize: 11,
      fontWeight: "700",
      color: theme.textSecondary,
    },

    ratingSummaryDivider: {
      width: 1,
      alignSelf: "stretch",
      marginHorizontal: 16,
      backgroundColor: theme.border,
    },

    ratingSummaryInfo: {
      flex: 1,
    },

    ratingSummaryTitle: {
      fontSize: 14,
      fontWeight: "900",
      color: theme.text,
    },

    ratingSummaryText: {
      marginTop: 5,
      fontSize: 12,
      lineHeight: 18,
      color: theme.textSecondary,
    },

    ratingSummaryAction: {
      alignSelf: "flex-start",
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    ratingSummaryActionText: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.primary,
    },

    ownerRatingNote: {
      marginTop: 10,
      fontSize: 11,
      fontWeight: "700",
      color: theme.textSecondary,
    },

    reviewsLoadingCard: {
      marginHorizontal: 18,
      marginTop: 12,
      paddingVertical: 26,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.card,
    },

    reviewsLoadingText: {
      fontSize: 12,
      color: theme.textSecondary,
    },

    noReviewsCard: {
      marginHorizontal: 18,
      marginTop: 12,
      padding: 24,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },

    noReviewsIcon: {
      width: 60,
      height: 60,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 20,
      backgroundColor: theme.primaryLight,
    },

    noReviewsTitle: {
      marginTop: 13,
      fontSize: 17,
      fontWeight: "900",
      color: theme.text,
    },

    noReviewsText: {
      marginTop: 6,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      color: theme.textSecondary,
    },

    writeFirstReviewButton: {
      marginTop: 16,
      paddingHorizontal: 15,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 13,
    },

    writeFirstReviewText: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.primary,
    },

    reviewsList: {
      marginHorizontal: 18,
      marginTop: 12,
      gap: 12,
    },

    reviewCard: {
      padding: 17,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.card,
    },

    reviewHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    reviewerInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },

    reviewerAvatar: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: theme.surface,
    },

    reviewerAvatarFallback: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.primaryLight,
    },

    reviewerInitial: {
      fontSize: 16,
      fontWeight: "900",
      color: theme.primaryDark,
    },

    reviewerText: {
      flex: 1,
      marginLeft: 10,
    },

    reviewerName: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.text,
    },

    reviewDate: {
      marginTop: 3,
      fontSize: 10,
      color: theme.textSecondary,
    },

    reviewScoreBadge: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 999,
      backgroundColor:
        "rgba(244,183,64,0.12)",
    },

    reviewScoreText: {
      fontSize: 11,
      fontWeight: "900",
      color: theme.text,
    },

    reviewStars: {
      marginTop: 12,
      flexDirection: "row",
      gap: 3,
    },

    reviewBody: {
      marginTop: 10,
      fontSize: 13,
      lineHeight: 20,
      color: theme.text,
    },

    reviewBodyMuted: {
      marginTop: 10,
      fontSize: 12,
      fontStyle: "italic",
      color: theme.textSecondary,
    },

    myReviewActions: {
      marginTop: 14,
      paddingTop: 12,
      flexDirection: "row",
      gap: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },

    reviewActionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    reviewActionText: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.primary,
    },

    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
    },

    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.48)",
    },

    ratingModalCard: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom:
        Platform.OS === "ios" ? 34 : 22,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: theme.card,
    },

    modalHandle: {
      width: 42,
      height: 5,
      alignSelf: "center",
      marginBottom: 18,
      borderRadius: 3,
      backgroundColor: theme.border,
    },

    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    modalHeaderText: {
      flex: 1,
    },

    modalTitle: {
      fontSize: 20,
      fontWeight: "900",
      color: theme.text,
    },

    modalSubtitle: {
      marginTop: 4,
      fontSize: 12,
      color: theme.textSecondary,
    },

    modalCloseButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: theme.background,
    },

    starPicker: {
      marginTop: 25,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },

    starButton: {
      paddingHorizontal: 4,
      paddingVertical: 4,
    },

    selectedRatingText: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "center",
      color: theme.textSecondary,
    },

    reviewInputLabel: {
      marginTop: 23,
      marginBottom: 8,
      fontSize: 12,
      fontWeight: "800",
      color: theme.text,
    },

    optionalLabel: {
      fontWeight: "500",
      color: theme.textSecondary,
    },

    reviewInput: {
      minHeight: 112,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      fontSize: 13,
      lineHeight: 20,
      color: theme.text,
      backgroundColor: theme.background,
    },

    reviewCharacterCount: {
      marginTop: 6,
      fontSize: 10,
      textAlign: "right",
      color: theme.textSecondary,
    },

    submitReviewButton: {
      height: 52,
      marginTop: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      borderRadius: 16,
      backgroundColor: theme.primary,
    },

    submitReviewText: {
      fontSize: 13,
      fontWeight: "900",
      color: "#FFFFFF",
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