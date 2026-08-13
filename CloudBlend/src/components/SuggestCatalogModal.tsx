import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppTheme } from "@/constants/colors"
import {
  type CatalogSubmissionImage,
  type CatalogSubmissionStrength,
  createCatalogSubmission,
  findExistingFlavor,
  findPendingCatalogSubmission
} from "@/services/catalogSubmissionService"

export type CatalogBrandOption = {
  id: string
  name: string
}

type SuggestCatalogModalProps = {
  visible: boolean
  brands: CatalogBrandOption[]
  initialFlavorName?: string
  theme: AppTheme
  onClose: () => void
  onSubmitted: () => void
}

const CATEGORIES = [
  "Fruit",
  "Mint",
  "Sweet",
  "Citrus",
  "Cream",
  "Spice",
  "Dessert",
  "Candy",
  "Beverage",
  "Floral",
  "Tropical",
  "Other",
]

const STRENGTH_OPTIONS: {
  label: string
  value: CatalogSubmissionStrength
}[] = [
  {
    label: "Light",
    value: "light",
  },
  {
    label: "Medium",
    value: "medium",
  },
  {
    label: "Strong",
    value: "strong",
  },
]

export default function SuggestCatalogModal({
  visible,
  brands,
  initialFlavorName = "",
  theme,
  onClose,
  onSubmitted,
}: SuggestCatalogModalProps) {
  const styles = useMemo(
    () => getStyles(theme),
    [theme]
  )

 

  const [brandSearch, setBrandSearch] =
    useState("")

  const [selectedBrandId, setSelectedBrandId] =
    useState<string | null>(null)

  const [newBrandName, setNewBrandName] =
    useState("")

  const [flavorName, setFlavorName] =
    useState("")

  const [category, setCategory] =
    useState("")

  const [strength, setStrength] =
    useState<CatalogSubmissionStrength>("medium")

  const [isDarkLeaf, setIsDarkLeaf] =
    useState(false)

  const [description, setDescription] =
    useState("")



  const [flavorImage, setFlavorImage] =
    useState<CatalogSubmissionImage | null>(null)

  const [
    permissionConfirmed,
    setPermissionConfirmed,
  ] = useState(false)

  const [isSubmitting, setIsSubmitting] =
    useState(false)

  useEffect(() => {
    if (!visible) {
      return
    }

    setFlavorName(initialFlavorName.trim())
  }, [initialFlavorName, visible])

  const filteredBrands = useMemo(() => {
    const normalizedSearch =
      brandSearch.trim().toLowerCase()

    if (!normalizedSearch) {
      return brands
    }

    return brands.filter((brand) =>
      brand.name
        .toLowerCase()
        .includes(normalizedSearch)
    )
  }, [brandSearch, brands])

  const selectedBrand = useMemo(
    () =>
      brands.find(
        (brand) =>
          brand.id === selectedBrandId
      ) ?? null,
    [brands, selectedBrandId]
  )

  function resetForm() {
    setBrandSearch("")
    setSelectedBrandId(null)
    setNewBrandName("")
    setFlavorName("")
    setCategory("")
    setStrength("medium")
    setIsDarkLeaf(false)
    setDescription("")
    setFlavorImage(null)
    setPermissionConfirmed(false)
    setIsSubmitting(false)
  }

  function handleClose() {
    if (isSubmitting) {
      return
    }

    resetForm()
    onClose()
  }

async function selectFlavorImage() {
  const permission =
    await ImagePicker.requestMediaLibraryPermissionsAsync()

  if (!permission.granted) {
    Alert.alert(
      "Photo Permission Required",
      "Please allow photo access to choose an image."
    )

    return
  }

  const result =
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

  if (result.canceled) {
    return
  }

  const asset = result.assets[0]

  setFlavorImage({
    uri: asset.uri,
    mimeType: asset.mimeType,
    fileName: asset.fileName,
  })
}

 async function handleSubmit() {
  if (isSubmitting) {
    return
  }

  if (!selectedBrandId && !newBrandName.trim()) {
    Alert.alert(
      "Brand Required",
      "Select an existing brand or create a new one."
    )

    return
  }

  if (!flavorName.trim()) {
    Alert.alert(
      "Flavor Name Required",
      "Enter the flavor name."
    )

    return
  }

  if (!category) {
    Alert.alert(
      "Category Required",
      "Choose a category for the flavor."
    )

    return
  }

  if (!permissionConfirmed) {
    Alert.alert(
      "Confirmation Required",
      "Confirm that the information is accurate and that you have permission to submit any uploaded photos."
    )

    return
  }

  try {
  const existingFlavor = await findExistingFlavor({
    brandId: selectedBrandId,
    brandName: selectedBrandId
      ? null
      : newBrandName,
    flavorName,
  })

  if (existingFlavor) {
      console.log("Flavor already exists!")
    Alert.alert(
      "Flavor Already Exists",
      `${existingFlavor.brandName} ${existingFlavor.name} is already in the KloudIt catalog. You can select it from the flavor list instead.`
    )

    return
  }
} catch (error) {
  Alert.alert(
    "Could Not Check Flavor",
    error instanceof Error
      ? error.message
      : "KloudIt could not check whether this flavor already exists."
  )

  return
}

const alreadyPending =
  await findPendingCatalogSubmission({
    brandId: selectedBrandId,
    brandName: selectedBrandId
      ? null
      : newBrandName,
    flavorName,
  })

if (alreadyPending) {
  console.log("Submission already pending!")
  Alert.alert(
    "Already Submitted",
    "This brand and flavor have already been submitted and are waiting for review."
  )

  return
}

  setIsSubmitting(true)

  try {
    await createCatalogSubmission({
      existingBrandId: selectedBrandId,
      proposedBrandName: selectedBrandId
        ? null
        : newBrandName,
      proposedFlavorName: flavorName,
      category,
      strength,
      isDarkLeaf,
      description,
      flavorImage,
      permissionConfirmed,
    })

    resetForm()
    onSubmitted()
  } catch (error) {
    console.error(
      "Could not submit catalog suggestion:",
      error
    )

    Alert.alert(
      "Could Not Submit",
      error instanceof Error
        ? error.message
        : "Something went wrong while submitting the brand and flavor."
    )
  } finally {
    setIsSubmitting(false)
  }
}

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "bottom"]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            disabled={isSubmitting}
            onPress={handleClose}
          >
            <Ionicons
              name="close"
              size={23}
              color={theme.text}
            />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.title}>
              Suggest Brand & Flavor
            </Text>

            <Text style={styles.subtitle}>
              Submissions are reviewed before
              becoming public.
            </Text>
          </View>

          <View style={styles.headerButton} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.content
          }
        >
          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={theme.primary}
            />

            <Text style={styles.infoText}>
              Once approved, this brand and flavor
              will appear in the KloudIt catalog
              for everyone.
            </Text>
          </View>

         <Text style={styles.sectionTitle}>
  Brand
</Text>

<Text style={styles.inputLabel}>
  Search or add a brand *
</Text>

{selectedBrand ? (
  <View style={styles.selectedBrandCard}>
    <View style={styles.brandInitial}>
      <Text style={styles.brandInitialText}>
        {selectedBrand.name
          .charAt(0)
          .toUpperCase()}
      </Text>
    </View>

    <View style={styles.selectedBrandContent}>
      <Text style={styles.selectedBrandName}>
        {selectedBrand.name}
      </Text>

      <Text style={styles.selectedBrandStatus}>
        Existing brand
      </Text>
    </View>

    <TouchableOpacity
      onPress={() => {
        setSelectedBrandId(null)
        setBrandSearch("")
      }}
    >
      <Ionicons
        name="close-circle"
        size={22}
        color={theme.muted}
      />
    </TouchableOpacity>
  </View>
) : newBrandName ? (
  <View style={styles.selectedBrandCard}>
    <View style={styles.brandInitial}>
      <Ionicons
        name="add"
        size={20}
        color={theme.primary}
      />
    </View>

    <View style={styles.selectedBrandContent}>
      <Text style={styles.selectedBrandName}>
        {newBrandName}
      </Text>

      <Text style={styles.selectedBrandStatus}>
        New brand — pending approval
      </Text>
    </View>

    <TouchableOpacity
      onPress={() => {
        setNewBrandName("")
        setBrandSearch("")
      }}
    >
      <Ionicons
        name="close-circle"
        size={22}
        color={theme.muted}
      />
    </TouchableOpacity>
  </View>
) : (
  <>
    <View style={styles.searchContainer}>
      <Ionicons
        name="search-outline"
        size={19}
        color={theme.muted}
      />

      <TextInput
        value={brandSearch}
        onChangeText={setBrandSearch}
        style={styles.searchInput}
        placeholder="Search brands..."
        placeholderTextColor={theme.muted}
        autoCapitalize="words"
        autoCorrect={false}
      />
    </View>

    {brandSearch.trim().length > 0 ? (
      <View style={styles.brandList}>
        {filteredBrands
          .slice(0, 8)
          .map((brand) => (
            <TouchableOpacity
              key={brand.id}
              style={styles.brandRow}
              onPress={() => {
                setSelectedBrandId(brand.id)
                setNewBrandName("")
                setBrandSearch("")
              }}
            >
              <View
                style={styles.smallBrandInitial}
              >
                <Text
                  style={
                    styles.smallBrandInitialText
                  }
                >
                  {brand.name
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>

              <Text style={styles.brandName}>
                {brand.name}
              </Text>

              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={theme.primary}
              />
            </TouchableOpacity>
          ))}

        {!brands.some(
          (brand) =>
            brand.name.trim().toLowerCase() ===
            brandSearch.trim().toLowerCase()
        ) ? (
          <TouchableOpacity
            style={styles.createBrandRow}
            onPress={() => {
              setNewBrandName(
                brandSearch.trim()
              )
              setSelectedBrandId(null)
              setBrandSearch("")
            }}
          >
            <View
              style={styles.createBrandIcon}
            >
              <Ionicons
                name="add"
                size={20}
                color={theme.primary}
              />
            </View>

            <View
              style={styles.createBrandContent}
            >
              <Text
                style={styles.createBrandTitle}
              >
                Create “{brandSearch.trim()}”
              </Text>

              <Text
                style={styles.createBrandSubtitle}
              >
                This brand will be reviewed before
                becoming public.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color={theme.muted}
            />
          </TouchableOpacity>
        ) : null}

        {filteredBrands.length === 0 &&
        brands.some(
          (brand) =>
            brand.name.trim().toLowerCase() ===
            brandSearch.trim().toLowerCase()
        ) ? (
          <View style={styles.emptyBrandList}>
            <Text style={styles.emptyBrandText}>
              This brand already exists. Select it
              from the results above.
            </Text>
          </View>
        ) : null}
      </View>
    ) : (
      <Text style={styles.brandSearchHint}>
        Search for an existing brand. If it is
        missing, you can create it from the search
        results.
      </Text>
    )}
  </>
)}

          <Text style={styles.sectionTitle}>
            Flavor
          </Text>

          <Text style={styles.inputLabel}>
            Flavor name *
          </Text>

          <TextInput
            value={flavorName}
            onChangeText={setFlavorName}
            style={styles.textInput}
            placeholder="Example: Blue Ice"
            placeholderTextColor={theme.muted}
            maxLength={80}
            autoCapitalize="words"
          />

          <Text style={styles.inputLabel}>
            Category *
          </Text>

          <View style={styles.optionWrap}>
            {CATEGORIES.map((option) => {
              const isSelected =
                category === option

              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionChip,
                    isSelected &&
                      styles.optionChipSelected,
                  ]}
                  onPress={() =>
                    setCategory(option)
                  }
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      isSelected &&
                        styles.optionChipTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={styles.inputLabel}>
            Strength
          </Text>

          <View style={styles.strengthRow}>
            {STRENGTH_OPTIONS.map(
              (option) => {
                const isSelected =
                  strength === option.value

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.strengthButton,
                      isSelected &&
                        styles.strengthButtonSelected,
                    ]}
                    onPress={() =>
                      setStrength(option.value)
                    }
                  >
                    <Text
                      style={[
                        styles.strengthText,
                        isSelected &&
                          styles.strengthTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                )
              }
            )}
          </View>

          <View style={styles.switchCard}>
            <View style={styles.switchContent}>
              <Text style={styles.switchTitle}>
                Dark leaf flavor
              </Text>

              <Text
                style={styles.switchSubtitle}
              >
                Turn this on if the flavor uses
                dark leaf tobacco.
              </Text>
            </View>

            <Switch
              value={isDarkLeaf}
              onValueChange={setIsDarkLeaf}
              trackColor={{
                false: theme.divider,
                true: theme.primaryLight,
              }}
              thumbColor={
                isDarkLeaf
                  ? theme.primary
                  : theme.muted
              }
            />
          </View>

          <Text style={styles.inputLabel}>
            Description
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[
              styles.textInput,
              styles.descriptionInput,
            ]}
            placeholder="Describe the flavor profile..."
            placeholderTextColor={theme.muted}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />

          <Text style={styles.characterCount}>
            {description.length}/300
          </Text>

          <Text style={styles.inputLabel}>
            Flavor image
          </Text>

          <ImageSelector
            image={flavorImage}
            title="Add flavor image"
            subtitle="Optional product photo"
            theme={theme}
           onChoose={() =>
  void selectFlavorImage()
}
            onRemove={() =>
              setFlavorImage(null)
            }
          />

          <TouchableOpacity
            style={styles.permissionCard}
            activeOpacity={0.8}
            onPress={() =>
              setPermissionConfirmed(
                (current) => !current
              )
            }
          >
            <View
              style={[
                styles.checkbox,
                permissionConfirmed &&
                  styles.checkboxSelected,
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
              I confirm that the information is
              accurate and that I own or have
              permission to submit any uploaded
              photos.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting &&
                styles.submitButtonDisabled,
            ]}
            disabled={isSubmitting}
            onPress={() =>
              void handleSubmit()
            }
          >
            <Ionicons
              name={
                isSubmitting
                  ? "hourglass-outline"
                  : "send-outline"
              }
              size={20}
              color="#FFFFFF"
            />

            <Text style={styles.submitButtonText}>
              {isSubmitting
                ? "Submitting..."
                : "Submit for Review"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

type ImageSelectorProps = {
  image: CatalogSubmissionImage | null
  title: string
  subtitle: string
  theme: AppTheme
  onChoose: () => void
  onRemove: () => void
}

function ImageSelector({
  image,
  title,
  subtitle,
  theme,
  onChoose,
  onRemove,
}: ImageSelectorProps) {
  const styles = useMemo(
    () => getStyles(theme),
    [theme]
  )

  if (image) {
    return (
      <View style={styles.selectedImageCard}>
        <Image
          source={{ uri: image.uri }}
          style={styles.selectedImage}
        />

        <View
          style={styles.selectedImageContent}
        >
          <Text
            style={styles.selectedImageTitle}
          >
            Image selected
          </Text>

          <Text
            style={styles.selectedImageName}
            numberOfLines={1}
          >
            {image.fileName ??
              "Selected photo"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.removeImageButton}
          onPress={onRemove}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={theme.danger}
          />
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <TouchableOpacity
      style={styles.imageSelector}
      activeOpacity={0.8}
      onPress={onChoose}
    >
      <View style={styles.imageSelectorIcon}>
        <Ionicons
          name="image-outline"
          size={24}
          color={theme.primary}
        />
      </View>

      <View
        style={styles.imageSelectorContent}
      >
        <Text style={styles.imageSelectorTitle}>
          {title}
        </Text>

        <Text
          style={styles.imageSelectorSubtitle}
        >
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="add-circle-outline"
        size={22}
        color={theme.primary}
      />
    </TouchableOpacity>
  )
}

function getStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },

    header: {
      minHeight: 74,
      paddingHorizontal: 15,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.card,
    },

    headerButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },

    headerContent: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 8,
    },

    title: {
      fontSize: 17,
      fontWeight: "900",
      textAlign: "center",
      color: theme.text,
    },

    subtitle: {
      marginTop: 3,
      fontSize: 10,
      textAlign: "center",
      color: theme.textSecondary,
    },

    content: {
      padding: 18,
      paddingBottom: 50,
    },

    infoCard: {
      padding: 14,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      borderRadius: 16,
      backgroundColor: theme.primaryLight,
    },

    infoText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      color: theme.primaryDark,
    },

    sectionTitle: {
      marginTop: 27,
      marginBottom: 13,
      fontSize: 20,
      fontWeight: "900",
      color: theme.text,
    },

    inputLabel: {
      marginTop: 17,
      marginBottom: 8,
      fontSize: 13,
      fontWeight: "700",
      color: theme.text,
    },


    textInput: {
      minHeight: 52,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 15,
      backgroundColor: theme.card,
      fontSize: 14,
      color: theme.text,
    },

    descriptionInput: {
      minHeight: 110,
      paddingTop: 13,
      paddingBottom: 13,
    },

    characterCount: {
      marginTop: 6,
      fontSize: 10,
      textAlign: "right",
      color: theme.muted,
    },

    searchContainer: {
      minHeight: 52,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 15,
      backgroundColor: theme.card,
    },

    searchInput: {
      flex: 1,
      minHeight: 50,
      fontSize: 14,
      color: theme.text,
    },

    brandList: {
      marginTop: 9,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      backgroundColor: theme.card,
    },

    brandRow: {
      minHeight: 58,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },

    smallBrandInitial: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: theme.primaryLight,
    },

    smallBrandInitialText: {
      fontSize: 13,
      fontWeight: "900",
      color: theme.primary,
    },

    brandName: {
      flex: 1,
      marginLeft: 10,
      fontSize: 13,
      fontWeight: "700",
      color: theme.text,
    },

    emptyBrandList: {
      padding: 18,
      alignItems: "center",
    },

    emptyBrandText: {
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      color: theme.textSecondary,
    },

    selectedBrandCard: {
      minHeight: 60,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 16,
      backgroundColor: theme.primaryLight,
    },

    brandInitial: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.card,
    },

    brandInitialText: {
      fontSize: 14,
      fontWeight: "900",
      color: theme.primary,
    },

    selectedBrandName: {
  fontSize: 14,
  fontWeight: "800",
  color: theme.text,
},

    optionWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    optionChip: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 13,
      backgroundColor: theme.card,
    },

    optionChipSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },

    optionChipText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.textSecondary,
    },

    optionChipTextSelected: {
      color: theme.primaryDark,
    },

    strengthRow: {
      flexDirection: "row",
      gap: 8,
    },

    strengthButton: {
      flex: 1,
      minHeight: 45,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.card,
    },

    strengthButtonSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },

    strengthText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.muted,
    },

    strengthTextSelected: {
      color: theme.primaryDark,
    },

    switchCard: {
      minHeight: 76,
      marginTop: 18,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      backgroundColor: theme.card,
    },

    switchContent: {
      flex: 1,
      paddingRight: 12,
    },

    switchTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.text,
    },

    switchSubtitle: {
      marginTop: 4,
      fontSize: 11,
      lineHeight: 16,
      color: theme.textSecondary,
    },

    imageSelector: {
      minHeight: 76,
      paddingHorizontal: 13,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.primary,
      borderRadius: 16,
      backgroundColor: theme.primaryLight,
    },

    imageSelectorIcon: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.card,
    },

    imageSelectorContent: {
      flex: 1,
      marginLeft: 11,
    },

    imageSelectorTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.text,
    },

    imageSelectorSubtitle: {
      marginTop: 3,
      fontSize: 11,
      color: theme.textSecondary,
    },

    selectedImageCard: {
      minHeight: 86,
      padding: 9,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      backgroundColor: theme.card,
    },

    selectedImage: {
      width: 66,
      height: 66,
      borderRadius: 12,
      backgroundColor: theme.surface,
    },

    selectedImageContent: {
      flex: 1,
      marginLeft: 11,
    },

    selectedImageTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.text,
    },

    selectedImageName: {
      marginTop: 3,
      fontSize: 11,
      color: theme.textSecondary,
    },

    removeImageButton: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: `${theme.danger}18`,
    },

    permissionCard: {
      marginTop: 24,
      padding: 14,
      flexDirection: "row",
      alignItems: "flex-start",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      backgroundColor: theme.card,
    },

    checkbox: {
      width: 23,
      height: 23,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.border,
      borderRadius: 7,
    },

    checkboxSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },

    permissionText: {
      flex: 1,
      marginLeft: 11,
      fontSize: 11,
      lineHeight: 17,
      color: theme.textSecondary,
    },

    submitButton: {
      minHeight: 56,
      marginTop: 22,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 16,
      backgroundColor: theme.primary,
    },

    submitButtonDisabled: {
      opacity: 0.55,
    },

    submitButtonText: {
      fontSize: 14,
      fontWeight: "900",
      color: "#FFFFFF",
    },
    selectedBrandContent: {
  flex: 1,
  marginLeft: 11,
},

selectedBrandStatus: {
  marginTop: 3,
  fontSize: 10,
  color: theme.textSecondary,
},

brandSearchHint: {
  marginTop: 8,
  fontSize: 11,
  lineHeight: 17,
  color: theme.textSecondary,
},

createBrandRow: {
  minHeight: 72,
  paddingHorizontal: 12,
  flexDirection: "row",
  alignItems: "center",
  borderTopWidth: 1,
  borderTopColor: theme.border,
  backgroundColor: theme.primaryLight,
},

createBrandIcon: {
  width: 38,
  height: 38,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  backgroundColor: theme.card,
},

createBrandContent: {
  flex: 1,
  marginLeft: 10,
},

createBrandTitle: {
  fontSize: 13,
  fontWeight: "800",
  color: theme.text,
},

createBrandSubtitle: {
  marginTop: 3,
  fontSize: 10,
  lineHeight: 15,
  color: theme.textSecondary,
},
  })
}