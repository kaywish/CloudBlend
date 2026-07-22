import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { colors } from "@/constants/colors"
import { flavors } from "@/data/flavors"

const theme = colors.light

export default function FlavorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const flavor = flavors.find((item) => item.id === id)

  if (!flavor) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={50}
            color={theme.primary}
          />

          <Text style={styles.notFoundTitle}>Flavor not found</Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
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

          <Text style={styles.headerTitle}>Flavor Details</Text>

          <TouchableOpacity style={styles.headerButton}>
            <Ionicons
              name="heart-outline"
              size={24}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>

        <Image source={{ uri: flavor.image }} style={styles.heroImage} />

        <View style={styles.content}>
          <Text style={styles.flavorName}>{flavor.name}</Text>
          <Text style={styles.brandName}>{flavor.brand}</Text>

          <View style={styles.tagContainer}>
            {flavor.categories.map((category) => (
              <View key={category} style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{category}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.description}>{flavor.description}</Text>

          <View style={styles.attributeCard}>
            <AttributeRow
              label="Sweetness"
              value={flavor.sweetness}
            />

            <AttributeRow
              label="Mint Level"
              value={flavor.mintLevel}
            />

            <AttributeRow
              label="Strength"
              value={flavor.strength}
            />
          </View>

          <View style={styles.ratingCard}>
            <Text style={styles.ratingLarge}>
              {flavor.averageRating.toFixed(1)}
            </Text>

            <View>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={
                      star <= Math.round(flavor.averageRating)
                        ? "star"
                        : "star-outline"
                    }
                    size={20}
                    color={theme.warning}
                  />
                ))}
              </View>

              <Text style={styles.ratingLabel}>
                {flavor.ratingCount} community ratings
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Works Well With</Text>

          <View style={styles.pairingContainer}>
            {getPairings(flavor.id).map((pairing) => (
              <TouchableOpacity
                key={pairing.name}
                style={styles.pairingCard}
              >
                <View style={styles.pairingIcon}>
                  <Ionicons
                    name={pairing.icon}
                    size={23}
                    color={theme.primary}
                  />
                </View>

                <Text style={styles.pairingText}>{pairing.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              View Recommended Mixes
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

type AttributeRowProps = {
  label: string
  value: number
}

function AttributeRow({ label, value }: AttributeRowProps) {
  return (
    <View style={styles.attributeRow}>
      <Text style={styles.attributeLabel}>{label}</Text>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${value * 10}%`,
            },
          ]}
        />
      </View>

      <Text style={styles.attributeValue}>{value}/10</Text>
    </View>
  )
}

function getPairings(flavorId: string) {
  const defaultPairings: Array<{
    name: string
    icon: keyof typeof Ionicons.glyphMap
  }> = [
    {
      name: "Mint",
      icon: "leaf-outline",
    },
    {
      name: "Lemon",
      icon: "sunny-outline",
    },
    {
      name: "Vanilla",
      icon: "ice-cream-outline",
    },
    {
      name: "Grape",
      icon: "nutrition-outline",
    },
  ]

  const pairingMap: Record<
    string,
    Array<{
      name: string
      icon: keyof typeof Ionicons.glyphMap
    }>
  > = {
    "blueberry-mint": [
      {
        name: "Lemon",
        icon: "sunny-outline",
      },
      {
        name: "Grape",
        icon: "nutrition-outline",
      },
      {
        name: "Vanilla",
        icon: "ice-cream-outline",
      },
      {
        name: "Watermelon",
        icon: "water-outline",
      },
    ],

    mango: [
      {
        name: "Peach",
        icon: "nutrition-outline",
      },
      {
        name: "Mint",
        icon: "leaf-outline",
      },
      {
        name: "Pineapple",
        icon: "sunny-outline",
      },
      {
        name: "Lemon",
        icon: "ellipse-outline",
      },
    ],
  }

  return pairingMap[flavorId] ?? defaultPairings
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

  heroImage: {
    height: 290,
    marginHorizontal: 20,
    borderRadius: 22,
    backgroundColor: theme.surface,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },

  flavorName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: theme.text,
  },

  brandName: {
    marginTop: 5,
    fontSize: 14,
    color: theme.textSecondary,
  },

  tagContainer: {
    marginTop: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  categoryTag: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: theme.primaryLight,
  },

  categoryTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.primaryDark,
  },

  description: {
    marginTop: 20,
    fontSize: 15,
    lineHeight: 23,
    color: theme.textSecondary,
  },

  attributeCard: {
    marginTop: 22,
    padding: 17,
    gap: 18,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 18,
    backgroundColor: theme.card,
  },

  attributeRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  attributeLabel: {
    width: 82,
    fontSize: 13,
    fontWeight: "600",
    color: theme.text,
  },

  progressTrack: {
    flex: 1,
    height: 6,
    overflow: "hidden",
    borderRadius: 3,
    backgroundColor: theme.divider,
  },

  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: theme.primary,
  },

  attributeValue: {
    width: 45,
    textAlign: "right",
    fontSize: 12,
    color: theme.textSecondary,
  },

  ratingCard: {
    marginTop: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 18,
    backgroundColor: theme.card,
  },

  ratingLarge: {
    fontSize: 43,
    fontWeight: "800",
    color: theme.text,
  },

  starsRow: {
    flexDirection: "row",
    gap: 2,
  },

  ratingLabel: {
    marginTop: 5,
    fontSize: 12,
    color: theme.textSecondary,
  },

  sectionTitle: {
    marginTop: 27,
    marginBottom: 14,
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
  },

  pairingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },

  pairingCard: {
    flex: 1,
    alignItems: "center",
  },

  pairingIcon: {
    width: 55,
    height: 55,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 28,
    backgroundColor: theme.primaryLight,
  },

  pairingText: {
    marginTop: 8,
    fontSize: 11,
    textAlign: "center",
    color: theme.text,
  },

  primaryButton: {
    height: 56,
    marginTop: 30,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 16,
    backgroundColor: theme.primary,
  },

  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  notFoundContainer: {
    flex: 1,
    padding: 25,
    alignItems: "center",
    justifyContent: "center",
  },

  notFoundTitle: {
    marginTop: 15,
    fontSize: 21,
    fontWeight: "700",
    color: theme.text,
  },

  backButton: {
    marginTop: 22,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: theme.primary,
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
})