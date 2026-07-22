import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
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

import { colors } from "@/constants/colors"
import { SavedMix, useMixes } from "@/context/MixContext"

const theme = colors.light

export default function FavoritesScreen() {
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
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading your mixes...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Mixes</Text>
          <Text style={styles.subtitle}>
            Your saved CloudBlend recipes.
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{savedMixes.length}</Text>
        </View>
      </View>

      <FlatList
        data={savedMixes}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          savedMixes.length === 0 && styles.emptyListContent,
        ]}
        renderItem={({ item }) => (
          <SavedMixCard
            mix={item}
            onPress={() => openMix(item.id)}
            onDelete={() => confirmDelete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="flask-outline"
                size={38}
                color={theme.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>No saved mixes yet</Text>

            <Text style={styles.emptyText}>
              Build your first blend and it will appear here.
            </Text>

            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push("/(tabs)/builder")}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />

              <Text style={styles.createButtonText}>
                Create a Mix
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
}

function SavedMixCard({
  mix,
  onPress,
  onDelete,
}: SavedMixCardProps) {
  const createdDate = new Date(mix.createdAt).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  )

  return (
    <TouchableOpacity
      style={styles.mixCard}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.mixCardHeader}>
        <View style={styles.mixIcon}>
          <Ionicons name="flask" size={23} color="#FFFFFF" />
        </View>

        <View style={styles.mixTitleContainer}>
          <Text style={styles.mixName} numberOfLines={1}>
            {mix.name}
          </Text>

          <Text style={styles.mixDate}>
            Created {createdDate}
          </Text>
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
            size={19}
            color={theme.danger}
          />
        </TouchableOpacity>
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
        <Text style={styles.notes} numberOfLines={2}>
          {mix.notes}
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.viewText}>View mix</Text>

        <Ionicons
          name="arrow-forward"
          size={18}
          color={theme.primary}
        />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
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

  countBadge: {
    minWidth: 42,
    height: 42,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: theme.primaryLight,
  },

  countBadgeText: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.primaryDark,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 35,
    gap: 14,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.textSecondary,
  },

  emptyContainer: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    width: 78,
    height: 78,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 39,
    backgroundColor: theme.primaryLight,
  },

  emptyTitle: {
    marginTop: 19,
    fontSize: 20,
    fontWeight: "700",
    color: theme.text,
  },

  emptyText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: theme.textSecondary,
  },

  createButton: {
    height: 52,
    marginTop: 23,
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
    fontWeight: "700",
    color: "#FFFFFF",
  },

  mixCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    backgroundColor: theme.card,
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
  },

  mixName: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.text,
  },

  mixDate: {
    marginTop: 3,
    fontSize: 11,
    color: theme.textSecondary,
  },

  deleteButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#FCEDEA",
  },

  ingredientList: {
    marginTop: 17,
    gap: 10,
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
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: theme.surface,
  },

  ingredientImagePlaceholder: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: theme.primaryLight,
  },

  ingredientTextContainer: {
    flex: 1,
    marginLeft: 10,
    paddingRight: 10,
  },

  ingredientName: {
    fontSize: 14,
    fontWeight: "600",
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
    fontWeight: "800",
    color: theme.primaryDark,
  },

  notes: {
    marginTop: 15,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    fontSize: 12,
    lineHeight: 18,
    color: theme.textSecondary,
  },

  cardFooter: {
    marginTop: 16,
    paddingTop: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },

  viewText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.primary,
  },
})