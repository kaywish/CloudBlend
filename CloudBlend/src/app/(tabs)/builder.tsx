import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppTheme } from "@/constants/colors"
import { useAppTheme } from "@/context/AppThemeContext"
import { useMixes } from "@/context/MixContext"
import { useFlavors } from "@/context/FlavorContext"
import type { Flavor } from "@/types/flavor"

type SelectedFlavor = {
  flavor: Flavor
  percentage: number
}

type BuilderParams = {
  editMixId?: string | string[]
  flavorId?: string | string[]
}

function getSingleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

function getFlavorBrandName(flavor: Flavor): string {
  const value = flavor as Flavor & {
    brandName?: string | null
    brand?: string | { name?: string | null } | null
  }

  if (typeof value.brandName === "string" && value.brandName.trim()) {
    return value.brandName.trim()
  }

  if (typeof value.brand === "string" && value.brand.trim()) {
    return value.brand.trim()
  }

  if (
    value.brand &&
    typeof value.brand === "object" &&
    typeof value.brand.name === "string"
  ) {
    return value.brand.name.trim()
  }

  return ""
}

export default function BuilderScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => getStyles(theme), [theme])
  const { user } = useAuth()
const isSignedIn = Boolean(user)

  const params = useLocalSearchParams<BuilderParams>()
  const editMixId = getSingleParam(params.editMixId)
  const requestedFlavorId = getSingleParam(params.flavorId)

  const {
  saveMix,
  updateMix,
  getMixById,
  publicMixes,
  refreshPublicMixes,
} = useMixes()
  const {
    flavors: databaseFlavors,
    getFlavorById,
    loadFlavorById,
  } = useFlavors()

  const [selectedFlavors, setSelectedFlavors] = useState<SelectedFlavor[]>([])
  const [showFlavorPicker, setShowFlavorPicker] = useState(false)


  const [search, setSearch] = useState("")
  const [mixName, setMixName] = useState("")
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)

  const editingMix = editMixId ? getMixById(editMixId) : undefined
  const isEditing = Boolean(editingMix)

  // Percentages are kept internally only for backwards compatibility with
  // the existing MixContext/database shape. They are no longer shown to users.
  const isValidMix =
    selectedFlavors.length >= 2 &&
    selectedFlavors.length <= 4 &&
    mixName.trim().length > 0

    useEffect(() => {
  if (publicMixes.length > 0) {
    return
  }

  let isActive = true

  async function loadSuggestionData() {
    try {
      if (isActive) {
        setIsLoadingSuggestions(true)
      }

      await refreshPublicMixes()
    } catch (error) {
      console.error("Could not load smart suggestions:", error)
    } finally {
      if (isActive) {
        setIsLoadingSuggestions(false)
      }
    }
  }

  loadSuggestionData()

  return () => {
    isActive = false
  }
}, [publicMixes.length, refreshPublicMixes])

const smartSuggestions = useMemo(() => {
  if (
    selectedFlavors.length === 0 ||
    selectedFlavors.length >= 4
  ) {
    return []
  }

  const selectedFlavorIds = new Set(
    selectedFlavors.map((item) => item.flavor.id)
  )

  const suggestionScores = new Map<
    string,
    {
      score: number
      mixCount: number
      likeCount: number
    }
  >()

  publicMixes.forEach((mix) => {
    const mixFlavorIds = new Set(
      mix.ingredients.map(
        (ingredient) => ingredient.flavorId
      )
    )

    const matchingSelectedFlavors = Array.from(
      selectedFlavorIds
    ).filter((flavorId) =>
      mixFlavorIds.has(flavorId)
    ).length

    if (matchingSelectedFlavors === 0) {
      return
    }

    const mixLikes = Math.max(0, mix.likeCount ?? 0)

    mix.ingredients.forEach((ingredient) => {
      if (selectedFlavorIds.has(ingredient.flavorId)) {
        return
      }

      const current =
        suggestionScores.get(ingredient.flavorId) ?? {
          score: 0,
          mixCount: 0,
          likeCount: 0,
        }

      current.mixCount += 1
      current.likeCount += mixLikes

      /*
       * Flavors receive a higher score when:
       * 1. They appear with more of the currently selected flavors.
       * 2. The community mix has more likes.
       */
      current.score +=
        matchingSelectedFlavors * 10 +
        Math.min(mixLikes, 25)

      suggestionScores.set(
        ingredient.flavorId,
        current
      )
    })
  })

  return Array.from(suggestionScores.entries())
    .map(([flavorId, stats]) => {
      const flavor = databaseFlavors.find(
        (item) => item.id === flavorId
      )

      if (!flavor) {
        return null
      }

      return {
        flavor,
        score: stats.score,
        mixCount: stats.mixCount,
        likeCount: stats.likeCount,
      }
    })
    .filter(
      (
        suggestion
      ): suggestion is {
        flavor: Flavor
        score: number
        mixCount: number
        likeCount: number
      } => suggestion !== null
    )
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }

      if (b.mixCount !== a.mixCount) {
        return b.mixCount - a.mixCount
      }

      if (b.likeCount !== a.likeCount) {
        return b.likeCount - a.likeCount
      }

      return (
        (b.flavor.averageRating ?? 0) -
        (a.flavor.averageRating ?? 0)
      )
    })
    .slice(0, 4)
}, [
  databaseFlavors,
  publicMixes,
  selectedFlavors,
])

  const filteredFlavors = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return databaseFlavors.filter((flavor) => {
      const isAlreadySelected = selectedFlavors.some(
        (item) => item.flavor.id === flavor.id
      )

      const matchesSearch =
        normalizedSearch.length === 0 ||
        flavor.name.toLowerCase().includes(normalizedSearch) ||
        getFlavorBrandName(flavor)
          .toLowerCase()
          .includes(normalizedSearch)

      return !isAlreadySelected && matchesSearch
    })
  }, [databaseFlavors, search, selectedFlavors])


  /*
   * Restore an existing mix when this screen is opened in edit mode.
   * The flavorId route parameter is intentionally ignored while editing.
   */
  useEffect(() => {
    if (!editingMix) {
      return
    }

    setMixName(editingMix.name)
    setNotes(editingMix.notes ?? "")

    const restoredFlavors = editingMix.ingredients
      .map((ingredient) => {
        const flavor =
          databaseFlavors.find(
            (item) => item.id === ingredient.flavorId
          ) ?? getFlavorById(ingredient.flavorId)

        if (!flavor) {
          return null
        }

        return {
          flavor,
          percentage: ingredient.percentage,
        }
      })
      .filter(
        (
          item
        ): item is {
          flavor: Flavor
          percentage: number
        } => item !== null
      )

    setSelectedFlavors(restoredFlavors)
  }, [databaseFlavors, editingMix, getFlavorById])

  /*
   * When the user starts a combination from a Flavor Detail page,
   * automatically begin the new mix with that flavor selected.
   */
  useEffect(() => {
   if (!user || isEditing || !requestedFlavorId) {
  return
}

    let isActive = true

    async function addRequestedFlavor() {
      try {
        const cachedFlavor = getFlavorById(requestedFlavorId!)

        const requestedFlavor =
          cachedFlavor ??
          (await loadFlavorById(requestedFlavorId!))

        if (!isActive || !requestedFlavor) {
          return
        }

        setSelectedFlavors((current) => {
          const alreadySelected = current.some(
            (item) => item.flavor.id === requestedFlavor.id
          )

          if (alreadySelected || current.length >= 4) {
            return current
          }

          return [
            ...current,
            {
              flavor: requestedFlavor,
              percentage: 100,
            },
          ]
        })
      } catch (error) {
        console.error(
          "Could not add requested flavor to builder:",
          error
        )
      }
    }

    addRequestedFlavor()

    return () => {
      isActive = false
    }
  }, [
    getFlavorById,
    isEditing,
    loadFlavorById,
    requestedFlavorId,
    user,
  ])

function goToSignIn() {
  router.push("/auth")
}

function showSignInRequiredAlert() {
  const message =
    "Flavor combinations can only be saved when you are signed in. Sign in before creating one so you do not lose your selections."

  if (Platform.OS === "web") {
    const shouldSignIn = window.confirm(
      `Sign In Required\n\n${message}\n\nPress OK to sign in.`
    )

    if (shouldSignIn) {
      goToSignIn()
    }

    return
  }

  Alert.alert(
    "Sign In Required",
    message,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign In",
        onPress: goToSignIn,
      },
    ]
  )
}

function openFlavorPicker() {
  console.log("BUILDER USER:", user)
  if (!user) {
    showSignInRequiredAlert()
    return
  }

  setShowFlavorPicker(true)
}


  function rebalanceForStorage(items: SelectedFlavor[]) {
    if (items.length === 0) return []

    const basePercentage = Math.floor(100 / items.length)
    const remainder = 100 - basePercentage * items.length

    return items.map((item, index) => ({
      ...item,
      percentage: basePercentage + (index === 0 ? remainder : 0),
    }))
  }

  function addFlavor(flavor: Flavor) {
  if (!user) {
    showSignInRequiredAlert()
    return
  }


    setSelectedFlavors((current) => {
      if (
        current.length >= 4 ||
        current.some((item) => item.flavor.id === flavor.id)
      ) {
        return current
      }

      return rebalanceForStorage([
        ...current,
        { flavor, percentage: 0 },
      ])
    })

    setShowFlavorPicker(false)
    setSearch("")
  }

  function removeFlavor(flavorId: string) {
    setSelectedFlavors((current) =>
      rebalanceForStorage(
        current.filter((item) => item.flavor.id !== flavorId)
      )
    )
  }

  function resetBuilder() {
    setSelectedFlavors([])
    setMixName("")
    setNotes("")
    setSearch("")
    setShowFlavorPicker(false)
  }

  async function handleSaveMix() {
      if (!user) {
    showSignInRequiredAlert()
    return
  }
    if (isSaving) {
      return
    }

    if (selectedFlavors.length < 2 || selectedFlavors.length > 4) {
      Alert.alert(
        "Choose More Flavors",
        "A flavor combination must contain between 2 and 4 flavors."
      )
      return
    }

    if (!mixName.trim()) {
      Alert.alert(
        "Name Required",
        "Please enter a name for your flavor combination."
      )
      return
    }

    const mixData = {
      name: mixName.trim(),
      notes: notes.trim(),
      ingredients: selectedFlavors.map((item) => ({
        flavorId: item.flavor.id,
        flavorName: item.flavor.name,
        brand: getFlavorBrandName(item.flavor) || null,
        image: item.flavor.imageUrl,
        percentage: item.percentage,
      })),
    }

    setIsSaving(true)

 try {
  if (editingMix) {
    await updateMix(editingMix.id, mixData)

    resetBuilder()

    router.replace({
      pathname: "/mix/[id]",
      params: {
        id: editingMix.id,
      },
    })

    return
  }

  const newMix = await saveMix(mixData)

  resetBuilder()

  router.push({
    pathname: "/mix/[id]",
    params: {
      id: newMix.id,
    },
  })
} catch (error) {
  console.error("Could not save mix:", error)

  Alert.alert(
    "Could Not Save Combination",
    "Something went wrong while saving your flavor combination."
  )
} finally {
  setIsSaving(false)
}
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.hero}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="flask"
                size={24}
                color="#FFFFFF"
              />
            </View>

            <TouchableOpacity
              style={styles.heroResetButton}
              onPress={resetBuilder}
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.heroResetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroTitle}>
            {isEditing ? "Refine your combination" : "Create a flavor combination"}
          </Text>

          <Text style={styles.heroSubtitle}>
            Choose 2 to 4 flavors that you enjoy together and save the combination to your collection.
          </Text>

          <View style={styles.heroSteps}>
            <View style={styles.heroStep}>
              <View style={styles.heroStepNumber}>
                <Text style={styles.heroStepNumberText}>1</Text>
              </View>
              <Text style={styles.heroStepText}>Choose flavors</Text>
            </View>

            <View style={styles.heroStepDivider} />

            <View style={styles.heroStep}>
              <View style={styles.heroStepNumber}>
                <Text style={styles.heroStepNumberText}>2</Text>
              </View>
              <Text style={styles.heroStepText}>Review pairing</Text>
            </View>

            <View style={styles.heroStepDivider} />

            <View style={styles.heroStep}>
              <View style={styles.heroStepNumber}>
                <Text style={styles.heroStepNumberText}>3</Text>
              </View>
              <Text style={styles.heroStepText}>Save combination</Text>
            </View>
          </View>
        </View>

        {!isSignedIn ? (
  <View style={styles.signInWarningCard}>
    <View style={styles.signInWarningIcon}>
      <Ionicons
        name="lock-closed-outline"
        size={25}
        color={theme.primary}
      />
    </View>

    <View style={styles.signInWarningContent}>
      <Text style={styles.signInWarningTitle}>
        Sign in before creating a combination
      </Text>

      <Text style={styles.signInWarningText}>
        Flavor combinations can only be saved when you are
        signed in. Sign in now so you do not
        spend time creating a combination that cannot
        be saved.
      </Text>

      <TouchableOpacity
        style={styles.signInWarningButton}
        activeOpacity={0.85}
        onPress={goToSignIn}
      >
        <Ionicons
          name="log-in-outline"
          size={18}
          color="#FFFFFF"
        />

        <Text
          style={styles.signInWarningButtonText}
        >
          Sign In or Create Account
        </Text>
      </TouchableOpacity>
    </View>
  </View>
) : null}

        {isEditing ? (
          <View style={styles.editingBanner}>
            <Ionicons
              name="create-outline"
              size={17}
              color={theme.primary}
            />

            <Text style={styles.editingBannerText}>
              Editing {editingMix?.name}
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Selected Flavors</Text>

        </View>

        {selectedFlavors.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyFlavorCard}
            onPress={openFlavorPicker}
          >
            <View style={styles.emptyFlavorIcon}>
              <Ionicons name="add" size={29} color={theme.primary} />
            </View>

            <Text style={styles.emptyFlavorTitle}>Add your first flavor</Text>

            <Text style={styles.emptyFlavorText}>
              Choose a flavor to begin building your blend.
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.selectedFlavorList}>
            {selectedFlavors.map((item) => (
              <SelectedFlavorCard
                key={item.flavor.id}
                item={item}
                onRemove={() => removeFlavor(item.flavor.id)}
                theme={theme}
                styles={styles}
              />
            ))}
          </View>
        )}

        {selectedFlavors.length > 0 && selectedFlavors.length < 4 ? (
          <TouchableOpacity
            style={styles.addFlavorButton}
            onPress={openFlavorPicker}
          >
            <Ionicons name="add-circle-outline" size={21} color={theme.primary} />
            <Text style={styles.addFlavorButtonText}>Add another flavor</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Combination Details</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Combination name</Text>

          <TextInput
            value={mixName}
            onChangeText={setMixName}
            style={styles.textInput}
            placeholder="Example: Tropical Sunset"
            placeholderTextColor={theme.muted}
            maxLength={50}
          />

          <View style={styles.inputLabelRow}>
            <Text style={styles.inputLabel}>Notes</Text>
            <Text style={styles.characterCount}>{notes.length}/200</Text>
          </View>

          <TextInput
            value={notes}
            onChangeText={setNotes}
            style={[styles.textInput, styles.notesInput]}
            placeholder="Add personal notes about this flavor combination..."
            placeholderTextColor={theme.muted}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
        </View>

        {selectedFlavors.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Blend Preview</Text>
            </View>

            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={styles.previewIcon}>
                  <Ionicons name="flask" size={25} color="#FFFFFF" />
                </View>

                <View style={styles.previewTitleContainer}>
                  <Text style={styles.previewTitle}>
                    {mixName.trim() || "Untitled Combination"}
                  </Text>

                  <Text style={styles.previewSubtitle}>
                    {selectedFlavors.length}{" "}
                    {selectedFlavors.length === 1 ? "flavor" : "flavors"}
                  </Text>
                </View>
              </View>

              <View style={styles.previewIngredients}>
                {selectedFlavors.map((item) => (
                  <View
                    key={item.flavor.id}
                    style={styles.previewIngredientRow}
                  >
                    <View style={styles.previewFlavorInfo}>
                      <Image
                        source={{ uri: item.flavor.imageUrl }}
                        style={styles.previewFlavorImage}
                      />

                      <View>
                        <Text style={styles.previewFlavorName}>
                          {item.flavor.name}
                        </Text>
                      </View>
                    </View>

                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}

       <TouchableOpacity
  style={[
    styles.saveButton,
    (isSignedIn &&
      (!isValidMix || isSaving)) &&
      styles.saveButtonDisabled,

    !isSignedIn &&
      styles.signInSaveButton,
  ]}
  activeOpacity={0.85}
  onPress={
    isSignedIn
      ? handleSaveMix
      : goToSignIn
  }
  disabled={
    isSignedIn &&
    (!isValidMix || isSaving)
  }
>
  <Ionicons
    name={
      !isSignedIn
        ? "log-in-outline"
        : isSaving
          ? "hourglass-outline"
          : isEditing
            ? "checkmark-circle-outline"
            : "save-outline"
    }
    size={21}
    color="#FFFFFF"
  />

  <Text style={styles.saveButtonText}>
    {!isSignedIn
      ? "Sign In to Save"
      : isSaving
        ? "Saving..."
        : isEditing
          ? "Update Combination"
          : "Save Combination"}
  </Text>
</TouchableOpacity>
      </ScrollView>

      <FlavorPickerModal
  visible={showFlavorPicker}
  search={search}
  onSearchChange={setSearch}
  flavors={filteredFlavors}
  selectedCount={selectedFlavors.length}
  onClose={() => {
    setShowFlavorPicker(false)
    setSearch("")
  }}
  onSelect={addFlavor}
  theme={theme}
  styles={styles}
/>
    </SafeAreaView>
  )
}

type SelectedFlavorCardProps = {
  item: SelectedFlavor
  onRemove: () => void
  theme: AppTheme
  styles: ReturnType<typeof getStyles>
}

function SelectedFlavorCard({
  item,
  onRemove,
  theme,
  styles,
}: SelectedFlavorCardProps) {
  return (
    <View style={styles.selectedFlavorCard}>
      <View style={styles.selectedFlavorHeader}>
        <Image
          source={{ uri: item.flavor.imageUrl }}
          style={styles.selectedFlavorImage}
        />

        <View style={styles.selectedFlavorTitleContainer}>
          <Text style={styles.selectedFlavorName} numberOfLines={1}>
            {item.flavor.name}
          </Text>

        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
        >
          <Ionicons
            name="close"
            size={18}
            color={theme.danger}
          />
        </TouchableOpacity>
      </View>
    </View>
  )
}

type FlavorPickerModalProps = {
  visible: boolean
  search: string
  onSearchChange: (value: string) => void
  flavors: Flavor[]
  selectedCount: number
  onClose: () => void
  onSelect: (flavor: Flavor) => void
  theme: AppTheme
  styles: ReturnType<typeof getStyles>
}

function FlavorPickerModal({
  visible,
  search,
  onSearchChange,
  flavors,
  selectedCount,
  onClose,
  onSelect,
  theme,
  styles,
}: FlavorPickerModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>Choose a Flavor</Text>
            <Text style={styles.modalSubtitle}>
              {selectedCount}/4 flavors selected
            </Text>
          </View>

          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Ionicons name="close" size={23} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalSearchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={theme.textSecondary}
          />

          <TextInput
            value={search}
            onChangeText={onSearchChange}
            style={styles.modalSearchInput}
            placeholder="Search flavors..."
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {search.length > 0 ? (
            <TouchableOpacity onPress={() => onSearchChange("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.muted}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          data={flavors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.modalFlavorList,
            flavors.length === 0 && styles.modalEmptyList,
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.modalFlavorCard}
              activeOpacity={0.85}
              onPress={() => onSelect(item)}
            >
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.modalFlavorImage}
              />

              <View style={styles.modalFlavorContent}>
                <Text style={styles.modalFlavorName}>{item.name}</Text>

                {(item.categories ?? []).length > 0 ? (
                  <View style={styles.modalTagRow}>
                    {(item.categories ?? []).slice(0, 3).map((category) => (
                      <View key={category} style={styles.modalTag}>
                        <Text style={styles.modalTagText}>
                          {category}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              <View style={styles.modalAddIcon}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}
         ListEmptyComponent={
          <View style={styles.modalEmptyContainer}>
            <View style={styles.modalEmptyIcon}>
              <Ionicons name="search-outline" size={34} color={theme.primary} />
            </View>
            <Text style={styles.modalEmptyTitle}>No flavors found</Text>
            <Text style={styles.modalEmptyText}>Try another search term.</Text>
          </View>
        }
        />
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.7,
    color: theme.text,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: theme.textSecondary,
  },

  resetButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    backgroundColor: theme.surface,
  },

  hero: {
    marginHorizontal: 18,
    marginTop: 14,
    marginBottom: 16,
    padding: 22,
    overflow: "hidden",
    borderRadius: 28,
    backgroundColor: theme.primary,
  },

  heroGlowOne: {
    position: "absolute",
    top: -48,
    right: -34,
    width: 155,
    height: 155,
    borderRadius: 78,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  heroGlowTwo: {
    position: "absolute",
    bottom: -58,
    left: -35,
    width: 150,
    height: 150,
    borderRadius: 75,
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

  heroResetButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  heroResetText: {
    fontSize: 12,
    fontWeight: "800",
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
    maxWidth: 325,
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.82)",
  },

  heroSteps: {
    marginTop: 20,
    paddingTop: 17,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.16)",
  },

  heroStep: {
    flex: 1,
    alignItems: "center",
  },

  heroStepNumber: {
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  heroStepNumberText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  heroStepText: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.78)",
  },

  heroStepDivider: {
    width: 18,
    height: 1,
    marginBottom: 17,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  progressCard: {
    marginHorizontal: 18,
    padding: 19,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 22,
    backgroundColor: theme.card,
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  progressLabel: {
    fontSize: 13,
    color: theme.textSecondary,
  },

  progressValue: {
    marginTop: 2,
    fontSize: 28,
    fontWeight: "800",
    color: theme.text,
  },

  progressValueInvalid: {
    color: theme.danger,
  },

  statusBadge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 14,
  },

  statusBadgeComplete: {
    backgroundColor: `${theme.success}18`,
  },

  statusBadgeIncomplete: {
    backgroundColor: theme.primaryLight,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  statusTextComplete: {
    color: theme.success,
  },

  statusTextIncomplete: {
    color: theme.primaryDark,
  },

  progressTrack: {
    height: 9,
    marginTop: 16,
    overflow: "hidden",
    borderRadius: 5,
    backgroundColor: theme.divider,
  },

  progressFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: theme.primary,
  },

  progressFillInvalid: {
    backgroundColor: theme.danger,
  },

  progressHint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: theme.textSecondary,
  },

  sectionHeader: {
    marginTop: 27,
    marginBottom: 13,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
  },

  sectionAction: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.primary,
  },

  emptyFlavorCard: {
    marginHorizontal: 18,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.primary,
    borderRadius: 20,
    backgroundColor: theme.primaryLight,
  },

  emptyFlavorIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 29,
    backgroundColor: theme.background,
  },

  emptyFlavorTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "700",
    color: theme.text,
  },

  emptyFlavorText: {
    marginTop: 5,
    fontSize: 13,
    textAlign: "center",
    color: theme.textSecondary,
  },

  selectedFlavorList: {
    paddingHorizontal: 18,
    gap: 12,
  },

 selectedFlavorCard: {
  padding: 14,
  borderWidth: 1,
  borderColor: theme.border,
  borderRadius: 18,
  backgroundColor: theme.card,
},

selectedFlavorHeader: {
  flexDirection: "row",
  alignItems: "center",
},

  selectedFlavorImage: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: theme.surface,
  },

  selectedFlavorContent: {
    flex: 1,
    marginLeft: 13,
  },

  selectedFlavorTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  selectedFlavorTitleContainer: {
    flex: 1,
    paddingRight: 8,
  },

  selectedFlavorName: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.text,
  },

  selectedFlavorBrand: {
    marginTop: 3,
    fontSize: 12,
    color: theme.textSecondary,
  },

  removeButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: `${theme.danger}18`,
  },

  sliderHeader: {
  marginTop: 14,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

sliderLabel: {
  fontSize: 12,
  fontWeight: "600",
  color: theme.textSecondary,
},

percentageBadge: {
  minWidth: 52,
  paddingHorizontal: 10,
  paddingVertical: 5,
  alignItems: "center",
  borderRadius: 12,
  backgroundColor: theme.primaryLight,
},

percentageBadgeText: {
  fontSize: 13,
  fontWeight: "800",
  color: theme.primaryDark,
},

slider: {
  width: "100%",
  height: 38,
  marginTop: 2,
},

sliderScale: {
  marginTop: -4,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

sliderScaleText: {
  fontSize: 9,
  color: theme.muted,
},

  addFlavorButton: {
    height: 52,
    marginHorizontal: 18,
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: theme.primary,
    borderRadius: 15,
    backgroundColor: theme.background,
  },

  addFlavorButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.primary,
  },

  formCard: {
    marginHorizontal: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 22,
    backgroundColor: theme.card,
  },

  inputLabelRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  inputLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "600",
    color: theme.text,
  },

  characterCount: {
    marginBottom: 8,
    fontSize: 11,
    color: theme.muted,
  },

  textInput: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 13,
    backgroundColor: theme.surface,
    fontSize: 14,
    color: theme.text,
  },

  notesInput: {
    minHeight: 110,
    paddingTop: 13,
    paddingBottom: 13,
  },

  previewCard: {
    marginHorizontal: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 22,
    backgroundColor: theme.card,
  },

  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  previewIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: theme.primary,
  },

  previewTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },

  previewTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.text,
  },

  previewSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: theme.textSecondary,
  },

  previewIngredients: {
    marginTop: 18,
    gap: 12,
  },

  previewIngredientRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  previewFlavorInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  previewFlavorImage: {
    width: 42,
    height: 42,
    marginRight: 10,
    borderRadius: 11,
    backgroundColor: theme.surface,
  },

  previewFlavorName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
  },

  previewFlavorBrand: {
    marginTop: 2,
    fontSize: 11,
    color: theme.textSecondary,
  },

  previewPercentage: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.primary,
  },

  saveButton: {
    height: 56,
    marginHorizontal: 18,
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    backgroundColor: theme.primary,
  },

  saveButtonDisabled: {
    backgroundColor: theme.divider,
  },

  saveButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  saveButtonTextDisabled: {
    color: theme.muted,
  },

  modalSafeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },

  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: theme.text,
  },

  modalSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: theme.textSecondary,
  },

  modalCloseButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    backgroundColor: theme.surface,
  },

  modalSearchContainer: {
    height: 52,
    marginHorizontal: 20,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 15,
    backgroundColor: theme.surface,
  },

  modalSearchInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: theme.text,
  },

  modalFlavorList: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 30,
    gap: 11,
  },

  modalEmptyList: {
    flexGrow: 1,
  },

  modalFlavorCard: {
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 17,
    backgroundColor: theme.card,
  },

  modalFlavorImage: {
    width: 74,
    height: 74,
    borderRadius: 13,
    backgroundColor: theme.surface,
  },

  modalFlavorContent: {
    flex: 1,
    marginLeft: 12,
  },

  modalFlavorName: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.text,
  },

  modalFlavorBrand: {
    marginTop: 3,
    fontSize: 12,
    color: theme.textSecondary,
  },

  modalTagRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },

  modalTag: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: theme.primaryLight,
  },

  modalTagText: {
    fontSize: 9,
    fontWeight: "600",
    color: theme.primaryDark,
  },

  modalAddIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: theme.primary,
  },

  modalEmptyContainer: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  modalEmptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
  },

  modalEmptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    color: theme.textSecondary,
  },

  editingBanner: {
  marginHorizontal: 20,
  marginBottom: 16,
  paddingHorizontal: 14,
  paddingVertical: 11,
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  borderRadius: 14,
  backgroundColor: theme.primaryLight,
},

editingBannerText: {
  flex: 1,
  fontSize: 13,
  fontWeight: "700",
  color: theme.primaryDark,
},
suggestionSection: {
  marginTop: 27,
},

suggestionHeader: {
  paddingHorizontal: 18,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

suggestionEyebrow: {
  fontSize: 10,
  fontWeight: "800",
  letterSpacing: 1,
  color: theme.primary,
},

suggestionTitle: {
  marginTop: 3,
  fontSize: 18,
  fontWeight: "700",
  color: theme.text,
},

suggestionBadge: {
  paddingHorizontal: 10,
  paddingVertical: 6,
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  borderRadius: 13,
  backgroundColor: theme.primaryLight,
},

suggestionBadgeText: {
  fontSize: 10,
  fontWeight: "700",
  color: theme.primaryDark,
},

suggestionList: {
  paddingHorizontal: 18,
  paddingTop: 13,
  paddingBottom: 2,
  gap: 11,
},

suggestionCard: {
  width: 235,
  padding: 11,
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderColor: theme.border,
  borderRadius: 17,
  backgroundColor: theme.card,
},

suggestionImage: {
  width: 58,
  height: 58,
  borderRadius: 12,
  backgroundColor: theme.surface,
},

suggestionContent: {
  flex: 1,
  marginLeft: 10,
},

suggestionFlavorName: {
  fontSize: 13,
  fontWeight: "700",
  color: theme.text,
},

suggestionBrand: {
  marginTop: 2,
  fontSize: 10,
  color: theme.textSecondary,
},

suggestionReason: {
  marginTop: 5,
  fontSize: 9,
  fontWeight: "600",
  color: theme.primary,
},

suggestionAddButton: {
  width: 30,
  height: 30,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 15,
  backgroundColor: theme.primary,
},

suggestionMessageCard: {
  marginHorizontal: 18,
  marginTop: 13,
  padding: 15,
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 11,
  borderWidth: 1,
  borderColor: theme.border,
  borderRadius: 17,
  backgroundColor: theme.card,
},

suggestionMessageContent: {
  flex: 1,
},

suggestionMessageTitle: {
  fontSize: 13,
  fontWeight: "700",
  color: theme.text,
},

suggestionMessageText: {
  flex: 1,
  fontSize: 11,
  lineHeight: 17,
  color: theme.textSecondary,
},

signInWarningCard: {
  marginHorizontal: 18,
  marginBottom: 16,
  padding: 17,
  flexDirection: "row",
  alignItems: "flex-start",
  borderWidth: 1,
  borderColor: theme.primary,
  borderRadius: 20,
  backgroundColor: theme.primaryLight,
},

signInWarningIcon: {
  width: 48,
  height: 48,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 15,
  backgroundColor: theme.card,
},

signInWarningContent: {
  flex: 1,
  marginLeft: 13,
},

signInWarningTitle: {
  fontSize: 16,
  fontWeight: "800",
  color: theme.text,
},

signInWarningText: {
  marginTop: 5,
  fontSize: 12,
  lineHeight: 18,
  color: theme.textSecondary,
},

signInWarningButton: {
  alignSelf: "flex-start",
  minHeight: 42,
  marginTop: 13,
  paddingHorizontal: 14,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  borderRadius: 13,
  backgroundColor: theme.primary,
},

signInWarningButtonText: {
  fontSize: 12,
  fontWeight: "800",
  color: "#FFFFFF",
},

signInSaveButton: {
  backgroundColor: theme.primary,
},

modalEmptyIcon: {
  width: 66,
  height: 66,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 22,
  backgroundColor: theme.primaryLight,
},

suggestFlavorButton: {
  minHeight: 48,
  marginTop: 20,
  paddingHorizontal: 18,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderRadius: 15,
  backgroundColor: theme.primary,
},

suggestFlavorButtonText: {
  fontSize: 13,
  fontWeight: "800",
  color: "#FFFFFF",
},

catalogSuggestionFooter: {
  minHeight: 76,
  marginTop: 8,
  paddingHorizontal: 14,
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderStyle: "dashed",
  borderColor: theme.primary,
  borderRadius: 17,
  backgroundColor: theme.primaryLight,
},

catalogSuggestionFooterIcon: {
  width: 42,
  height: 42,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 14,
  backgroundColor: theme.card,
},

catalogSuggestionFooterContent: {
  flex: 1,
  marginLeft: 12,
},

catalogSuggestionFooterTitle: {
  fontSize: 13,
  fontWeight: "800",
  color: theme.text,
},

catalogSuggestionFooterText: {
  marginTop: 3,
  fontSize: 11,
  color: theme.textSecondary,
},

  
})
}