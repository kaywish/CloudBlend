
import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { colors } from "@/constants/colors"
import { useMixes } from "@/context/MixContext"

const theme = colors.light

export default function MixDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { getMixById, deleteMix } = useMixes()

  const mix = getMixById(id)

 async function handleShare() {
  const appStoreUrl =
    "https://apps.apple.com/app/cloudblend/idYOUR_APP_ID"

  try {
    await Share.share({
      title: "Check out CloudBlend",
      message: `I created a mix called "${mix.name}" on CloudBlend.

Download CloudBlend to discover flavors and create your own mixes:

${appStoreUrl}`,
      url: appStoreUrl,
    })
  } catch (error) {
    console.error("Could not share CloudBlend:", error)

    Alert.alert(
      "Could Not Share",
      "Something went wrong while sharing the app."
    )
  }
}

  if (!mix) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Ionicons
            name="flask-outline"
            size={52}
            color={theme.primary}
          />

          <Text style={styles.notFoundTitle}>Mix not found</Text>

          <Text style={styles.notFoundText}>
            This mix may have been removed.
          </Text>

          <TouchableOpacity
            style={styles.backToFavoritesButton}
            onPress={() => router.replace("/(tabs)/favorites")}
          >
            <Text style={styles.backToFavoritesText}>
              Back to My Mixes
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const totalPercentage = mix.ingredients.reduce(
    (total, ingredient) => total + ingredient.percentage,
    0
  )

  function confirmDelete() {
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
              router.replace("/(tabs)/favorites")
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

  const createdDate = new Date(mix.createdAt).toLocaleDateString(
    undefined,
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  )

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.replace("/(tabs)/favorites")}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color={theme.text}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Mix Details</Text>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={confirmDelete}
          >
            <Ionicons
              name="trash-outline"
              size={21}
              color={theme.danger}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="flask" size={30} color="#FFFFFF" />
          </View>

          <Text style={styles.mixName}>{mix.name}</Text>

          <Text style={styles.createdDate}>
            Created {createdDate}
          </Text>

          <View
            style={[
              styles.totalBadge,
              totalPercentage !== 100 && styles.totalBadgeInvalid,
            ]}
          >
            <Ionicons
              name={
                totalPercentage === 100
                  ? "checkmark-circle"
                  : "alert-circle"
              }
              size={17}
              color={
                totalPercentage === 100
                  ? theme.success
                  : theme.danger
              }
            />

            <Text
              style={[
                styles.totalBadgeText,
                totalPercentage !== 100 &&
                  styles.totalBadgeTextInvalid,
              ]}
            >
              Total: {totalPercentage}%
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Flavor Blend</Text>

          <Text style={styles.flavorCount}>
            {mix.ingredients.length}{" "}
            {mix.ingredients.length === 1 ? "flavor" : "flavors"}
          </Text>
        </View>

        <View style={styles.ingredientCard}>
          {mix.ingredients.map((ingredient, index) => (
            <View
              key={`${ingredient.flavorId}-${index}`}
              style={[
                styles.ingredientRow,
                index < mix.ingredients.length - 1 &&
                  styles.ingredientRowBorder,
              ]}
            >
              <View style={styles.ingredientInfo}>
                {ingredient.image ? (
                  <Image
                    source={{ uri: ingredient.image }}
                    style={styles.ingredientImage}
                  />
                ) : (
                  <View style={styles.ingredientPlaceholder}>
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
                    <Text style={styles.ingredientBrand}>
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
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>

            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{mix.notes}</Text>
            </View>
          </>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Blend Breakdown</Text>
        </View>

        <View style={styles.breakdownCard}>
          {mix.ingredients.map((ingredient) => (
            <View
              key={ingredient.flavorId}
              style={styles.breakdownItem}
            >
              <View style={styles.breakdownHeader}>
                <Text
                  style={styles.breakdownName}
                  numberOfLines={1}
                >
                  {ingredient.flavorName}
                </Text>

                <Text style={styles.breakdownPercentage}>
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
        </View>

        <View style={styles.actionRow}>
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

            <Text style={styles.secondaryButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
  style={styles.primaryButton}
  onPress={handleShare}
>
            <Ionicons
              name="share-outline"
              size={20}
              color="#FFFFFF"
            />

            <Text style={styles.primaryButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
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
    marginHorizontal: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 24,
    backgroundColor: theme.card,
  },

  heroIcon: {
    width: 66,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: theme.primary,
  },

  mixName: {
    marginTop: 17,
    fontSize: 27,
    fontWeight: "800",
    textAlign: "center",
    color: theme.text,
  },

  createdDate: {
    marginTop: 5,
    fontSize: 12,
    color: theme.textSecondary,
  },

  totalBadge: {
    marginTop: 17,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 15,
    backgroundColor: "#EDF7EC",
  },

  totalBadgeInvalid: {
    backgroundColor: "#FCEDEA",
  },

  totalBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.success,
  },

  totalBadgeTextInvalid: {
    color: theme.danger,
  },

  sectionHeader: {
    marginTop: 27,
    marginBottom: 13,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
  },

  flavorCount: {
    fontSize: 12,
    color: theme.textSecondary,
  },

  ingredientCard: {
    marginHorizontal: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
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
    marginHorizontal: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 18,
    backgroundColor: theme.card,
  },

  notesText: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.textSecondary,
  },

  breakdownCard: {
    marginHorizontal: 20,
    padding: 17,
    gap: 17,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
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
    marginHorizontal: 20,
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