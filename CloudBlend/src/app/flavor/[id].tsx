import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
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
import { useFlavors } from "@/context/FlavorContext"
import { SavedMix, useMixes } from "@/context/MixContext"
import { chooseFlavorImage } from "@/services/flavorImageService"
import type { FlavorImageSubmission } from "@/types/flavor"

type RatingItem = {
  id: string
  userId?: string
  rating: number
  review?: string | null
  username?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  createdAt?: string
  updatedAt?: string
}

export default function FlavorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const flavorId = Array.isArray(id) ? id[0] : id

  const { theme } = useAppTheme()
  const styles = useMemo(() => getStyles(theme), [theme])
  const { user } = useAuth()

  const {
    getFlavorById,
    loadFlavorById,
    loadFlavorRatings,
    favoriteFlavorIds,
    toggleFavoriteFlavor,
    submitFlavorRating,
    loadApprovedFlavorImages,
    loadMyFlavorImageSubmissions,
    submitFlavorPhoto,
  } = useFlavors()

  const {
    publicMixes,
    isLoadingPublic,
    refreshPublicMixes,
  } = useMixes()

  const cachedFlavor = flavorId ? getFlavorById(flavorId) : undefined

  const [flavor, setFlavor] = useState(cachedFlavor)
  const [ratings, setRatings] = useState<RatingItem[]>([])
  const [isLoading, setIsLoading] = useState(!cachedFlavor)
  const [isRefreshingRatings, setIsRefreshingRatings] = useState(true)
  const [isFavoriteUpdating, setIsFavoriteUpdating] = useState(false)

  const [ratingModalVisible, setRatingModalVisible] = useState(false)
  const [selectedRating, setSelectedRating] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)

  const [communityPhotos, setCommunityPhotos] = useState<
    FlavorImageSubmission[]
  >([])
  const [myPhotoSubmissions, setMyPhotoSubmissions] = useState<
    FlavorImageSubmission[]
  >([])
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true)
  const [photoModalVisible, setPhotoModalVisible] = useState(false)
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null)
  const [photoCreditName, setPhotoCreditName] = useState("")
  const [photoNotes, setPhotoNotes] = useState("")
  const [permissionConfirmed, setPermissionConfirmed] = useState(false)
  const [isSubmittingPhoto, setIsSubmittingPhoto] = useState(false)

  const isFavorite = Boolean(
    flavorId && favoriteFlavorIds.includes(flavorId)
  )

  const myRating = useMemo(
    () => ratings.find((item) => item.userId === user?.id),
    [ratings, user?.id]
  )

  const communityMixes = useMemo(() => {
    if (!flavorId) return []

    return publicMixes
      .filter((mix) =>
        mix.ingredients.some(
          (ingredient) => ingredient.flavorId === flavorId
        )
      )
      .sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
      .slice(0, 6)
  }, [flavorId, publicMixes])

  const loadPhotos = useCallback(async () => {
    if (!flavorId) {
      setIsLoadingPhotos(false)
      return
    }

    setIsLoadingPhotos(true)

    try {
      const [approvedPhotos, mySubmissions] = await Promise.all([
        loadApprovedFlavorImages(flavorId),
        user
          ? loadMyFlavorImageSubmissions(flavorId)
          : Promise.resolve([]),
      ])

      setCommunityPhotos(approvedPhotos)
      setMyPhotoSubmissions(mySubmissions)
    } catch (error) {
      console.error("Could not load flavor photos:", error)
    } finally {
      setIsLoadingPhotos(false)
    }
  }, [
    flavorId,
    loadApprovedFlavorImages,
    loadMyFlavorImageSubmissions,
    user,
  ])

  const loadPage = useCallback(async () => {
    if (!flavorId) {
      setIsLoading(false)
      setIsRefreshingRatings(false)
      return
    }

    try {
      setIsLoading((current) => current || !cachedFlavor)

      const [loadedFlavor, loadedRatings] = await Promise.all([
        cachedFlavor
          ? Promise.resolve(cachedFlavor)
          : loadFlavorById(flavorId),
        loadFlavorRatings(flavorId),
      ])

      setFlavor(loadedFlavor ?? cachedFlavor)
      setRatings((loadedRatings ?? []) as RatingItem[])
    } catch (error) {
      console.error("Could not load flavor details:", error)
      Alert.alert(
        "Could Not Load Flavor",
        "Something went wrong while loading this flavor."
      )
    } finally {
      setIsLoading(false)
      setIsRefreshingRatings(false)
    }
  }, [
    cachedFlavor,
    flavorId,
    loadFlavorById,
    loadFlavorRatings,
  ])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  useEffect(() => {
    loadPhotos()
  }, [loadPhotos])

  useEffect(() => {
    refreshPublicMixes().catch((error) => {
      console.error("Could not load community mixes:", error)
    })
  }, [refreshPublicMixes])

  function openRatingModal() {
    if (!user) {
      Alert.alert(
        "Sign In Required",
        "Sign in to rate flavors and write reviews.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign In",
            onPress: () => router.push("/auth"),
          },
        ]
      )
      return
    }

    setSelectedRating(myRating?.rating ?? 0)
    setReviewText(myRating?.review ?? "")
    setRatingModalVisible(true)
  }

  async function openPhotoModal() {
    if (!user) {
      Alert.alert(
        "Sign In Required",
        "Sign in to submit a flavor photo.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign In",
            onPress: () => router.push("/auth"),
          },
        ]
      )
      return
    }

    try {
      const image = await chooseFlavorImage()

      if (!image) {
        return
      }

      setSelectedPhotoUri(image.uri)
      setPhotoCreditName("")
      setPhotoNotes("")
      setPermissionConfirmed(false)
      setPhotoModalVisible(true)
    } catch (error) {
      console.error("Could not choose flavor photo:", error)
      Alert.alert(
        "Could Not Select Photo",
        error instanceof Error
          ? error.message
          : "Please try selecting the photo again."
      )
    }
  }

  function closePhotoModal() {
    if (isSubmittingPhoto) return

    setPhotoModalVisible(false)
    setSelectedPhotoUri(null)
    setPhotoCreditName("")
    setPhotoNotes("")
    setPermissionConfirmed(false)
  }

  async function handleSubmitPhoto() {
    if (!flavorId || !selectedPhotoUri) {
      Alert.alert("Choose a Photo", "Select a photo before submitting.")
      return
    }

    if (!permissionConfirmed) {
      Alert.alert(
        "Permission Required",
        "Confirm that you took this photo or have permission to submit it."
      )
      return
    }

    setIsSubmittingPhoto(true)

    try {
      await submitFlavorPhoto({
        flavorId,
        imageUri: selectedPhotoUri,
        creditName: photoCreditName.trim() || undefined,
        notes: photoNotes.trim() || undefined,
        permissionConfirmed: true,
      })

      setIsSubmittingPhoto(false)
      closePhotoModal()
      await loadPhotos()

      Alert.alert(
        "Photo Submitted",
        "Your photo was submitted for review. It will appear after approval."
      )
    } catch (error) {
      console.error("Could not submit flavor photo:", error)
      Alert.alert(
        "Could Not Submit Photo",
        error instanceof Error
          ? error.message
          : "Something went wrong while submitting your photo."
      )
    } finally {
      setIsSubmittingPhoto(false)
    }
  }

  async function handleFavorite() {
    if (!flavorId || isFavoriteUpdating) return

    if (!user) {
      Alert.alert(
        "Sign In Required",
        "Sign in to save flavors to your favorites.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign In",
            onPress: () => router.push("/auth"),
          },
        ]
      )
      return
    }

    setIsFavoriteUpdating(true)

    try {
      await toggleFavoriteFlavor(flavorId)
    } catch (error) {
      console.error("Could not update favorite flavor:", error)
      Alert.alert(
        "Could Not Update Favorite",
        "Please try again."
      )
    } finally {
      setIsFavoriteUpdating(false)
    }
  }

  async function handleSubmitRating() {
    if (!flavorId || selectedRating < 1) {
      Alert.alert(
        "Choose a Rating",
        "Select between 1 and 5 stars."
      )
      return
    }

    setIsSubmittingRating(true)

    try {
      await submitFlavorRating({
        flavorId,
        rating: selectedRating,
        review: reviewText.trim() || null,
      })

      const updatedRatings = await loadFlavorRatings(flavorId)
      const updatedFlavor = await loadFlavorById(flavorId)

      setRatings((updatedRatings ?? []) as RatingItem[])
      setFlavor(updatedFlavor ?? flavor)
      setRatingModalVisible(false)

      Alert.alert(
        myRating ? "Rating Updated" : "Rating Submitted",
        "Thanks for sharing your opinion."
      )
    } catch (error) {
      console.error("Could not submit flavor rating:", error)
      Alert.alert(
        "Could Not Save Rating",
        "Something went wrong while saving your rating."
      )
    } finally {
      setIsSubmittingRating(false)
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <View style={styles.loadingIcon}>
            <Ionicons
              name="leaf"
              size={28}
              color="#FFFFFF"
            />
          </View>

          <ActivityIndicator
            size="large"
            color={theme.primary}
          />

          <Text style={styles.loadingTitle}>
            Loading flavor
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!flavor) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="leaf-outline"
              size={40}
              color={theme.primary}
            />
          </View>

          <Text style={styles.notFoundTitle}>
            Flavor not found
          </Text>

          <Text style={styles.notFoundText}>
            This flavor may have been removed.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.primaryButtonText}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const categories =
    Array.isArray(flavor.categories) ? flavor.categories : []

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
              size={22}
              color={theme.text}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Flavor Details
          </Text>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleFavorite}
            disabled={isFavoriteUpdating}
          >
            {isFavoriteUpdating ? (
              <ActivityIndicator
                size="small"
                color={theme.primary}
              />
            ) : (
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={23}
                color={isFavorite ? theme.danger : theme.text}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          {flavor.imageUrl && flavor.imageApproved ? (
            <Image
              source={{ uri: flavor.imageUrl }}
              style={styles.heroImage}
            />
          ) : (
            <View style={styles.heroFallback}>
              <Ionicons
                name="leaf"
                size={70}
                color="#FFFFFF"
              />
            </View>
          )}

          <View style={styles.heroOverlay} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Ionicons
                name="sparkles-outline"
                size={14}
                color="#FFFFFF"
              />
              <Text style={styles.heroBadgeText}>
                Flavor Profile
              </Text>
            </View>

            <View style={styles.ratingPill}>
              <Ionicons
                name="star"
                size={14}
                color={theme.warning}
              />
              <Text style={styles.ratingPillText}>
                {flavor.ratingCount > 0
                  ? flavor.averageRating.toFixed(1)
                  : "New"}
              </Text>
            </View>
          </View>

          <View style={styles.heroBottom}>
            <Text style={styles.flavorName}>
              {flavor.name}
            </Text>

            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/brand/[id]",
                  params: { id: flavor.brandId },
                })
              }
            >
              <Text style={styles.brandName}>
                {flavor.brandName}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {categories.length > 0 ? (
          <View style={styles.tagRow}>
            {categories.map((category: string) => (
              <View
                key={category}
                style={styles.tag}
              >
                <Text style={styles.tagText}>
                  {category}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                COMMUNITY PHOTOS
              </Text>
              <Text style={styles.sectionTitle}>
                Real photos from users
              </Text>
            </View>

            <TouchableOpacity
              style={styles.photoUploadButton}
              onPress={openPhotoModal}
            >
              <Ionicons
                name="camera-outline"
                size={17}
                color="#FFFFFF"
              />
              <Text style={styles.photoUploadButtonText}>
                Upload
              </Text>
            </TouchableOpacity>
          </View>

          {isLoadingPhotos ? (
            <View style={styles.photoLoadingCard}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.photoLoadingText}>
                Loading community photos...
              </Text>
            </View>
          ) : communityPhotos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoGallery}
            >
              {communityPhotos.map((photo) => (
                <View key={photo.id} style={styles.photoCard}>
                  <Image
                    source={{ uri: photo.imageUrl }}
                    style={styles.communityPhoto}
                  />

                  <View style={styles.photoCreditRow}>
                    <Ionicons
                      name="person-circle-outline"
                      size={15}
                      color={theme.primary}
                    />
                    <Text
                      style={styles.photoCreditText}
                      numberOfLines={1}
                    >
                      {photo.creditName || "CloudBlend community"}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noPhotosCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="images-outline"
                  size={30}
                  color={theme.primary}
                />
              </View>

              <Text style={styles.noPhotosTitle}>
                No approved photos yet
              </Text>

              <Text style={styles.noPhotosText}>
                Be the first to submit a real photo of {flavor.name}.
              </Text>

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={openPhotoModal}
              >
                <Ionicons
                  name="camera-outline"
                  size={17}
                  color={theme.primary}
                />
                <Text style={styles.outlineButtonText}>
                  Submit a photo
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {myPhotoSubmissions.some(
            (submission) => submission.status === "pending"
          ) ? (
            <View style={styles.pendingPhotoNotice}>
              <Ionicons
                name="time-outline"
                size={18}
                color={theme.warning}
              />
              <Text style={styles.pendingPhotoText}>
                You have a photo waiting for approval.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {flavor.ratingCount > 0
                ? flavor.averageRating.toFixed(1)
                : "—"}
            </Text>
            <Text style={styles.summaryLabel}>
              Average rating
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {flavor.ratingCount}
            </Text>
            <Text style={styles.summaryLabel}>
              {flavor.ratingCount === 1
                ? "Community rating"
                : "Community ratings"}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {flavor.favoriteCount ?? 0}
            </Text>
            <Text style={styles.summaryLabel}>
              Favorites
            </Text>
          </View>
        </View>

        {flavor.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>
              ABOUT THIS FLAVOR
            </Text>
            <Text style={styles.sectionTitle}>
              Flavor notes
            </Text>

            <View style={styles.descriptionCard}>
              <Text style={styles.description}>
                {flavor.description}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                COMMUNITY CREATIONS
              </Text>
              <Text style={styles.sectionTitle}>
                Mixes using this flavor
              </Text>
            </View>

            <View style={styles.mixCountBadge}>
              <Ionicons
                name="flask-outline"
                size={14}
                color={theme.primary}
              />
              <Text style={styles.mixCountText}>
                {communityMixes.length}
              </Text>
            </View>
          </View>

          {isLoadingPublic && publicMixes.length === 0 ? (
            <View style={styles.mixesLoading}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.mixesLoadingText}>
                Loading community mixes...
              </Text>
            </View>
          ) : communityMixes.length === 0 ? (
            <View style={styles.noMixesCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="flask-outline"
                  size={30}
                  color={theme.primary}
                />
              </View>

              <Text style={styles.noMixesTitle}>
                No public mixes yet
              </Text>

              <Text style={styles.noMixesText}>
                Create a mix with {flavor.name} and publish it
                to the community.
              </Text>

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() =>
                 router.push({
  pathname: "/(tabs)/builder",
  params: {
    flavorId: flavor.id,
  },
})
                }
              >
                <Ionicons
                  name="add"
                  size={17}
                  color={theme.primary}
                />
                <Text style={styles.outlineButtonText}>
                  Create a mix
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            communityMixes.map((mix) => (
              <CommunityMixCard
                key={mix.id}
                mix={mix}
                highlightedFlavorId={flavor.id}
                theme={theme}
                styles={styles}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                COMMUNITY FEEDBACK
              </Text>
              <Text style={styles.sectionTitle}>
                Ratings & Reviews
              </Text>
            </View>

            <TouchableOpacity
              style={styles.rateButton}
              onPress={openRatingModal}
            >
              <Ionicons
                name={myRating ? "create-outline" : "star-outline"}
                size={17}
                color="#FFFFFF"
              />
              <Text style={styles.rateButtonText}>
                {myRating ? "Edit rating" : "Rate flavor"}
              </Text>
            </TouchableOpacity>
          </View>

          {isRefreshingRatings ? (
            <View style={styles.reviewsLoading}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : ratings.length === 0 ? (
            <View style={styles.noReviewsCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={30}
                  color={theme.primary}
                />
              </View>

              <Text style={styles.noReviewsTitle}>
                No reviews yet
              </Text>

              <Text style={styles.noReviewsText}>
                Be the first person to rate this flavor.
              </Text>

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={openRatingModal}
              >
                <Text style={styles.outlineButtonText}>
                  Write the first review
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            ratings.map((item) => (
              <ReviewCard
                key={item.id}
                item={item}
                theme={theme}
                styles={styles}
              />
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={photoModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closePhotoModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closePhotoModal}
          />

          <View style={styles.photoModalCard}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.photoModalTitleWrap}>
                <Text style={styles.modalTitle}>
                  Submit a flavor photo
                </Text>
                <Text style={styles.modalSubtitle}>
                  {flavor.name} by {flavor.brandName}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={closePhotoModal}
                disabled={isSubmittingPhoto}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.photoModalContent}
            >
              {selectedPhotoUri ? (
                <Image
                  source={{ uri: selectedPhotoUri }}
                  style={styles.photoPreview}
                />
              ) : null}

              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={openPhotoModal}
                disabled={isSubmittingPhoto}
              >
                <Ionicons
                  name="images-outline"
                  size={17}
                  color={theme.primary}
                />
                <Text style={styles.changePhotoButtonText}>
                  Choose a different photo
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>
                Credit name (optional)
              </Text>

              <TextInput
                style={styles.singleLineInput}
                value={photoCreditName}
                onChangeText={setPhotoCreditName}
                placeholder="Name shown under the photo"
                placeholderTextColor={theme.muted}
                maxLength={60}
              />

              <Text style={styles.inputLabel}>
                Notes (optional)
              </Text>

              <TextInput
                style={styles.photoNotesInput}
                value={photoNotes}
                onChangeText={setPhotoNotes}
                placeholder="Anything the reviewer should know?"
                placeholderTextColor={theme.muted}
                multiline
                maxLength={300}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={styles.permissionRow}
                onPress={() =>
                  setPermissionConfirmed((current) => !current)
                }
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.permissionCheckbox,
                    permissionConfirmed &&
                      styles.permissionCheckboxChecked,
                  ]}
                >
                  {permissionConfirmed ? (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color="#FFFFFF"
                    />
                  ) : null}
                </View>

                <Text style={styles.permissionText}>
                  I took this photo or have permission to submit it,
                  and I allow CloudBlend to display it publicly.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!permissionConfirmed ||
                    !selectedPhotoUri ||
                    isSubmittingPhoto) &&
                    styles.disabledButton,
                ]}
                disabled={
                  !permissionConfirmed ||
                  !selectedPhotoUri ||
                  isSubmittingPhoto
                }
                onPress={handleSubmitPhoto}
              >
                {isSubmittingPhoto ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={19}
                      color="#FFFFFF"
                    />
                    <Text style={styles.submitButtonText}>
                      Submit for Review
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setRatingModalVisible(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {myRating ? "Update your rating" : "Rate this flavor"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {flavor.name} by {flavor.brandName}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setRatingModalVisible(false)}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.starPicker}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  style={styles.starButton}
                  onPress={() => setSelectedRating(star)}
                >
                  <Ionicons
                    name={
                      star <= selectedRating
                        ? "star"
                        : "star-outline"
                    }
                    size={36}
                    color={theme.warning}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.selectedRatingText}>
              {selectedRating === 0
                ? "Tap a star to rate"
                : `${selectedRating} out of 5`}
            </Text>

            <Text style={styles.inputLabel}>
              Review (optional)
            </Text>

            <TextInput
              style={styles.reviewInput}
              value={reviewText}
              onChangeText={setReviewText}
              placeholder="What did you think about this flavor?"
              placeholderTextColor={theme.muted}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />

            <Text style={styles.characterCount}>
              {reviewText.length}/500
            </Text>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (selectedRating === 0 || isSubmittingRating) &&
                  styles.disabledButton,
              ]}
              disabled={
                selectedRating === 0 || isSubmittingRating
              }
              onPress={handleSubmitRating}
            >
              {isSubmittingRating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={19}
                    color="#FFFFFF"
                  />
                  <Text style={styles.submitButtonText}>
                    {myRating ? "Update Rating" : "Submit Rating"}
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


function CommunityMixCard({
  mix,
  highlightedFlavorId,
  theme,
  styles,
}: {
  mix: SavedMix
  highlightedFlavorId: string
  theme: AppTheme
  styles: ReturnType<typeof getStyles>
}) {
  const highlightedIngredient = mix.ingredients.find(
    (ingredient) => ingredient.flavorId === highlightedFlavorId
  )

  const previewIngredients = mix.ingredients.slice(0, 3)

  return (
    <TouchableOpacity
      style={styles.communityMixCard}
      activeOpacity={0.86}
      onPress={() =>
        router.push({
          pathname: "/mix/[id]",
          params: { id: mix.id },
        })
      }
    >
      <View style={styles.communityMixTopRow}>
        <View style={styles.communityMixIcon}>
          <Ionicons
            name="flask"
            size={21}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.communityMixTitleWrap}>
          <Text
            style={styles.communityMixName}
            numberOfLines={1}
          >
            {mix.name}
          </Text>

          <Text style={styles.communityMixMeta}>
            {mix.ingredients.length}{" "}
            {mix.ingredients.length === 1 ? "flavor" : "flavors"}
            {highlightedIngredient
              ? ` • ${highlightedIngredient.percentage}% ${highlightedIngredient.flavorName}`
              : ""}
          </Text>
        </View>

        <View style={styles.communityMixLikes}>
          <Ionicons
            name="heart"
            size={14}
            color={theme.danger}
          />
          <Text style={styles.communityMixLikesText}>
            {mix.likeCount ?? 0}
          </Text>
        </View>
      </View>

      <View style={styles.mixIngredients}>
        {previewIngredients.map((ingredient, index) => (
          <View
            key={`${mix.id}-${ingredient.flavorId}-${index}`}
            style={[
              styles.mixIngredientRow,
              index < previewIngredients.length - 1 &&
                styles.mixIngredientBorder,
            ]}
          >
            {ingredient.image ? (
              <Image
                source={{ uri: ingredient.image }}
                style={styles.mixIngredientImage}
              />
            ) : (
              <View style={styles.mixIngredientFallback}>
                <Ionicons
                  name="leaf-outline"
                  size={17}
                  color={theme.primary}
                />
              </View>
            )}

            <View style={styles.mixIngredientInfo}>
              <Text
                style={styles.mixIngredientName}
                numberOfLines={1}
              >
                {ingredient.flavorName}
              </Text>

              {ingredient.brand ? (
                <Text
                  style={styles.mixIngredientBrand}
                  numberOfLines={1}
                >
                  {ingredient.brand}
                </Text>
              ) : null}
            </View>

            <Text style={styles.mixIngredientPercentage}>
              {ingredient.percentage}%
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.communityMixFooter}>
        <Text style={styles.viewMixText}>
          View community mix
        </Text>

        <Ionicons
          name="arrow-forward"
          size={17}
          color={theme.primary}
        />
      </View>
    </TouchableOpacity>
  )
}

function ReviewCard({
  item,
  theme,
  styles,
}: {
  item: RatingItem
  theme: AppTheme
  styles: ReturnType<typeof getStyles>
}) {
  const displayName =
    item.displayName || item.username || "CloudBlend User"

  const dateText = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString()
    : ""

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewTopRow}>
        <View style={styles.reviewerRow}>
          {item.avatarUrl ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.reviewerInfo}>
            <Text style={styles.reviewerName}>
              {displayName}
            </Text>

            {dateText ? (
              <Text style={styles.reviewDate}>
                {dateText}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.reviewRating}>
          <Ionicons
            name="star"
            size={14}
            color={theme.warning}
          />
          <Text style={styles.reviewRatingText}>
            {item.rating.toFixed(1)}
          </Text>
        </View>
      </View>

      <View style={styles.smallStarsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= item.rating ? "star" : "star-outline"}
            size={15}
            color={theme.warning}
          />
        ))}
      </View>

      {item.review ? (
        <Text style={styles.reviewBody}>
          {item.review}
        </Text>
      ) : (
        <Text style={styles.reviewBodyMuted}>
          Rating only
        </Text>
      )}
    </View>
  )
}

function getStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingHorizontal: 18,
      paddingBottom: 40,
    },
    header: {
      height: 62,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.text,
    },
    heroCard: {
      height: 340,
      overflow: "hidden",
      borderRadius: 28,
      backgroundColor: theme.primary,
    },
    heroImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    heroFallback: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.30)",
    },
    heroTopRow: {
      position: "absolute",
      top: 18,
      left: 18,
      right: 18,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    heroBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: "rgba(0,0,0,0.32)",
    },
    heroBadgeText: {
      fontSize: 11,
      fontWeight: "800",
      color: "#FFFFFF",
    },
    ratingPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: "rgba(0,0,0,0.42)",
    },
    ratingPillText: {
      fontSize: 12,
      fontWeight: "900",
      color: "#FFFFFF",
    },
    heroBottom: {
      position: "absolute",
      left: 20,
      right: 20,
      bottom: 22,
    },
    flavorName: {
      fontSize: 31,
      lineHeight: 36,
      fontWeight: "900",
      color: "#FFFFFF",
    },
    brandName: {
      marginTop: 5,
      fontSize: 15,
      fontWeight: "700",
      color: "rgba(255,255,255,0.82)",
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 16,
    },
    tag: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.primaryLight,
    },
    tagText: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.primaryDark,
    },
    summaryCard: {
      marginTop: 18,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 18,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },
    summaryItem: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 5,
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: "900",
      color: theme.text,
    },
    summaryLabel: {
      marginTop: 4,
      fontSize: 9,
      textAlign: "center",
      color: theme.textSecondary,
    },
    summaryDivider: {
      width: 1,
      height: 34,
      backgroundColor: theme.border,
    },
    section: {
      marginTop: 28,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 14,
    },
    sectionEyebrow: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.3,
      color: theme.primary,
    },
    sectionTitle: {
      marginTop: 4,
      fontSize: 21,
      fontWeight: "900",
      color: theme.text,
    },
    descriptionCard: {
      marginTop: 13,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.card,
    },
    description: {
      fontSize: 14,
      lineHeight: 22,
      color: theme.textSecondary,
    },
    photoUploadButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: 13,
      backgroundColor: theme.primary,
    },
    photoUploadButtonText: {
      fontSize: 11,
      fontWeight: "800",
      color: "#FFFFFF",
    },
    photoLoadingCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 28,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.card,
    },
    photoLoadingText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    photoGallery: {
      gap: 12,
      paddingRight: 4,
    },
    photoCard: {
      width: 220,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.card,
    },
    communityPhoto: {
      width: "100%",
      height: 220,
      resizeMode: "cover",
    },
    photoCreditRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    photoCreditText: {
      flex: 1,
      fontSize: 10,
      fontWeight: "700",
      color: theme.textSecondary,
    },
    noPhotosCard: {
      alignItems: "center",
      padding: 24,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },
    noPhotosTitle: {
      marginTop: 14,
      fontSize: 17,
      fontWeight: "900",
      color: theme.text,
    },
    noPhotosText: {
      marginTop: 6,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      color: theme.textSecondary,
    },
    pendingPhotoNotice: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 13,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 15,
      backgroundColor: theme.card,
    },
    pendingPhotoText: {
      flex: 1,
      fontSize: 11,
      fontWeight: "700",
      color: theme.textSecondary,
    },
    rateButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: 13,
      backgroundColor: theme.primary,
    },
    rateButtonText: {
      fontSize: 11,
      fontWeight: "800",
      color: "#FFFFFF",
    },
    mixCountBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: theme.primaryLight,
    },
    mixCountText: {
      fontSize: 11,
      fontWeight: "900",
      color: theme.primary,
    },
    mixesLoading: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 28,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.card,
    },
    mixesLoadingText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    noMixesCard: {
      alignItems: "center",
      padding: 24,
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
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      color: theme.textSecondary,
    },
    communityMixCard: {
      marginBottom: 13,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },
    communityMixTopRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    communityMixIcon: {
      width: 43,
      height: 43,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      backgroundColor: theme.primary,
    },
    communityMixTitleWrap: {
      flex: 1,
      marginLeft: 11,
    },
    communityMixName: {
      fontSize: 15,
      fontWeight: "900",
      color: theme.text,
    },
    communityMixMeta: {
      marginTop: 4,
      fontSize: 10,
      color: theme.textSecondary,
    },
    communityMixLikes: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.background,
    },
    communityMixLikesText: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.text,
    },
    mixIngredients: {
      marginTop: 14,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
    },
    mixIngredientRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      backgroundColor: theme.background,
    },
    mixIngredientBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    mixIngredientImage: {
      width: 36,
      height: 36,
      borderRadius: 11,
    },
    mixIngredientFallback: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: theme.primaryLight,
    },
    mixIngredientInfo: {
      flex: 1,
      marginLeft: 10,
    },
    mixIngredientName: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.text,
    },
    mixIngredientBrand: {
      marginTop: 2,
      fontSize: 9,
      color: theme.textSecondary,
    },
    mixIngredientPercentage: {
      fontSize: 12,
      fontWeight: "900",
      color: theme.primary,
    },
    communityMixFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 6,
      marginTop: 13,
    },
    viewMixText: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.primary,
    },
    reviewsLoading: {
      paddingVertical: 30,
      alignItems: "center",
    },
    noReviewsCard: {
      alignItems: "center",
      padding: 25,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },
    emptyIcon: {
      width: 62,
      height: 62,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 21,
      backgroundColor: theme.primaryLight,
    },
    noReviewsTitle: {
      marginTop: 14,
      fontSize: 17,
      fontWeight: "900",
      color: theme.text,
    },
    noReviewsText: {
      marginTop: 6,
      fontSize: 12,
      textAlign: "center",
      color: theme.textSecondary,
    },
    outlineButton: {
      marginTop: 17,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 17,
      paddingVertical: 11,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 13,
    },
    outlineButtonText: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.primary,
    },
    reviewCard: {
      marginBottom: 12,
      padding: 17,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.card,
    },
    reviewTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    reviewerRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 15,
    },
    avatarFallback: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      backgroundColor: theme.primaryLight,
    },
    avatarInitial: {
      fontSize: 16,
      fontWeight: "900",
      color: theme.primaryDark,
    },
    reviewerInfo: {
      flex: 1,
      marginLeft: 11,
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
    reviewRating: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.primaryLight,
    },
    reviewRatingText: {
      fontSize: 11,
      fontWeight: "900",
      color: theme.text,
    },
    smallStarsRow: {
      flexDirection: "row",
      gap: 3,
      marginTop: 13,
    },
    reviewBody: {
      marginTop: 12,
      fontSize: 13,
      lineHeight: 20,
      color: theme.textSecondary,
    },
    reviewBodyMuted: {
      marginTop: 12,
      fontSize: 12,
      fontStyle: "italic",
      color: theme.muted,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    loadingIcon: {
      width: 62,
      height: 62,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      borderRadius: 21,
      backgroundColor: theme.primary,
    },
    loadingTitle: {
      marginTop: 14,
      fontSize: 16,
      fontWeight: "800",
      color: theme.text,
    },
    notFoundTitle: {
      marginTop: 18,
      fontSize: 22,
      fontWeight: "900",
      color: theme.text,
    },
    notFoundText: {
      marginTop: 7,
      fontSize: 13,
      textAlign: "center",
      color: theme.textSecondary,
    },
    primaryButton: {
      marginTop: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: theme.primary,
    },
    primaryButtonText: {
      fontSize: 13,
      fontWeight: "800",
      color: "#FFFFFF",
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    photoModalCard: {
      maxHeight: "92%",
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 20,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: theme.card,
    },
    photoModalTitleWrap: {
      flex: 1,
      paddingRight: 12,
    },
    photoModalContent: {
      paddingBottom: 10,
    },
    photoPreview: {
      width: "100%",
      aspectRatio: 1,
      marginTop: 20,
      borderRadius: 22,
      resizeMode: "cover",
      backgroundColor: theme.background,
    },
    changePhotoButton: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      height: 44,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 14,
    },
    changePhotoButtonText: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.primary,
    },
    singleLineInput: {
      height: 50,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 15,
      fontSize: 14,
      color: theme.text,
      backgroundColor: theme.background,
    },
    photoNotesInput: {
      minHeight: 95,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 15,
      fontSize: 14,
      lineHeight: 20,
      color: theme.text,
      backgroundColor: theme.background,
    },
    permissionRow: {
      marginTop: 18,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 11,
    },
    permissionCheckbox: {
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 7,
      backgroundColor: theme.background,
    },
    permissionCheckboxChecked: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    permissionText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 17,
      color: theme.textSecondary,
    },
    modalCard: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 30,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: theme.card,
    },
    modalHandle: {
      width: 42,
      height: 5,
      alignSelf: "center",
      marginBottom: 18,
      borderRadius: 999,
      backgroundColor: theme.border,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    modalTitle: {
      fontSize: 21,
      fontWeight: "900",
      color: theme.text,
    },
    modalSubtitle: {
      marginTop: 4,
      fontSize: 12,
      color: theme.textSecondary,
    },
    modalClose: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: theme.background,
    },
    starPicker: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      marginTop: 28,
    },
    starButton: {
      padding: 3,
    },
    selectedRatingText: {
      marginTop: 10,
      textAlign: "center",
      fontSize: 12,
      fontWeight: "700",
      color: theme.textSecondary,
    },
    inputLabel: {
      marginTop: 25,
      marginBottom: 8,
      fontSize: 12,
      fontWeight: "800",
      color: theme.text,
    },
    reviewInput: {
      minHeight: 120,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      fontSize: 14,
      lineHeight: 20,
      color: theme.text,
      backgroundColor: theme.background,
    },
    characterCount: {
      marginTop: 6,
      textAlign: "right",
      fontSize: 10,
      color: theme.muted,
    },
    submitButton: {
      height: 52,
      marginTop: 17,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 16,
      backgroundColor: theme.primary,
    },
    submitButtonText: {
      fontSize: 14,
      fontWeight: "900",
      color: "#FFFFFF",
    },
    disabledButton: {
      opacity: 0.55,
    },
  })
}