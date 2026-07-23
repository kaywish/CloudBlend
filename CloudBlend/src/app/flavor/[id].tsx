import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { useMemo } from "react"
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppTheme } from "@/constants/colors"
import { useAppTheme } from "@/context/AppThemeContext"
import { flavors } from "@/data/flavors"

export default function FlavorDetailScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => getStyles(theme), [theme])
  const { id } = useLocalSearchParams<{ id: string }>()

  const flavor = flavors.find((item) => item.id === id)

  if (!flavor) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <View style={styles.notFoundIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={42}
              color={theme.primary}
            />
          </View>

          <Text style={styles.notFoundTitle}>
            Flavor not found
          </Text>

          <Text style={styles.notFoundText}>
            This flavor may have been removed or is no longer available.
          </Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.backButtonText}>
              Go Back
            </Text>
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
              size={22}
              color={theme.text}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Flavor Details
          </Text>

          <TouchableOpacity style={styles.headerButton}>
            <Ionicons
              name="heart-outline"
              size={23}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <Image
            source={{ uri: flavor.image }}
            style={styles.heroImage}
          />

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
                {flavor.averageRating.toFixed(1)}
              </Text>
            </View>
          </View>

          <View style={styles.heroBottom}>
            <Text style={styles.flavorName}>
              {flavor.name}
            </Text>

            <Text style={styles.brandName}>
              {flavor.brand}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.tagContainer}>
            {flavor.categories.map((category) => (
              <View key={category} style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>
                  {category}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.descriptionCard}>
            <View style={styles.descriptionIcon}>
              <Ionicons
                name="leaf-outline"
                size={20}
                color={theme.primary}
              />
            </View>

            <Text style={styles.description}>
              {flavor.description}
            </Text>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                FLAVOR PROFILE
              </Text>

              <Text style={styles.sectionTitle}>
                Taste Characteristics
              </Text>
            </View>
          </View>

          <View style={styles.attributeCard}>
            <AttributeRow
              label="Sweetness"
              value={flavor.sweetness}
              icon="ice-cream-outline"
              theme={theme}
              styles={styles}
            />

            <AttributeRow
              label="Mint Level"
              value={flavor.mintLevel}
              icon="leaf-outline"
              theme={theme}
              styles={styles}
            />

            <AttributeRow
              label="Strength"
              value={flavor.strength}
              icon="flame-outline"
              theme={theme}
              styles={styles}
            />
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                COMMUNITY
              </Text>

              <Text style={styles.sectionTitle}>
                Ratings
              </Text>
            </View>
          </View>

          <View style={styles.ratingCard}>
            <View style={styles.ratingScoreWrap}>
              <Text style={styles.ratingLarge}>
                {flavor.averageRating.toFixed(1)}
              </Text>

              <Text style={styles.ratingOutOf}>
                out of 5
              </Text>
            </View>

            <View style={styles.ratingDivider} />

            <View style={styles.ratingDetails}>
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
                Based on {flavor.ratingCount} community{" "}
                {flavor.ratingCount === 1
                  ? "rating"
                  : "ratings"}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                PAIRINGS
              </Text>

              <Text style={styles.sectionTitle}>
                Works Well With
              </Text>
            </View>
          </View>

          <View style={styles.pairingContainer}>
            {getPairings(flavor.id).map((pairing) => (
              <TouchableOpacity
                key={pairing.name}
                style={styles.pairingCard}
                activeOpacity={0.82}
              >
                <View style={styles.pairingIcon}>
                  <Ionicons
                    name={pairing.icon}
                    size={22}
                    color={theme.primary}
                  />
                </View>

                <Text style={styles.pairingText}>
                  {pairing.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryButton}>
            <View style={styles.primaryButtonIcon}>
              <Ionicons
                name="flask-outline"
                size={19}
                color="#FFFFFF"
              />
            </View>

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
  icon: keyof typeof Ionicons.glyphMap
  theme: AppTheme
  styles: ReturnType<typeof getStyles>
}

function AttributeRow({
  label,
  value,
  icon,
  theme,
  styles,
}: AttributeRowProps) {
  return (
    <View style={styles.attributeRow}>
      <View style={styles.attributeTopRow}>
        <View style={styles.attributeLabelWrap}>
          <View style={styles.attributeIcon}>
            <Ionicons
              name={icon}
              size={17}
              color={theme.primary}
            />
          </View>

          <Text style={styles.attributeLabel}>
            {label}
          </Text>
        </View>

        <View style={styles.attributeValueBadge}>
          <Text style={styles.attributeValue}>
            {value}/10
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(Math.max(value, 0), 10) * 10}%`,
            },
          ]}
        />
      </View>
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

function getStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },

    scrollContent: {
      paddingBottom: 36,
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
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.card,
    },

    headerTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.text,
    },

    heroCard: {
      height: 330,
      marginHorizontal: 18,
      overflow: "hidden",
      borderRadius: 28,
      backgroundColor: theme.surface,
    },

    heroImage: {
      width: "100%",
      height: "100%",
    },

    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(19,15,12,0.38)",
    },

    heroTopRow: {
      position: "absolute",
      top: 16,
      left: 16,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    heroBadge: {
      paddingHorizontal: 11,
      paddingVertical: 7,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.17)",
    },

    heroBadgeText: {
      fontSize: 11,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    ratingPill: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 16,
      backgroundColor: "rgba(19,15,12,0.76)",
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
      bottom: 20,
    },

    flavorName: {
      fontSize: 31,
      lineHeight: 37,
      fontWeight: "900",
      letterSpacing: -0.8,
      color: "#FFFFFF",
    },

    brandName: {
      marginTop: 5,
      fontSize: 14,
      fontWeight: "700",
      color: "rgba(255,255,255,0.78)",
    },

    content: {
      paddingHorizontal: 18,
      paddingTop: 18,
    },

    tagContainer: {
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
      fontWeight: "800",
      color: theme.primaryDark,
    },

    descriptionCard: {
      marginTop: 16,
      padding: 16,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.card,
    },

    descriptionIcon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: theme.primaryLight,
    },

    description: {
      flex: 1,
      fontSize: 14,
      lineHeight: 22,
      color: theme.textSecondary,
    },

    sectionHeader: {
      marginTop: 28,
      marginBottom: 14,
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

    attributeCard: {
      padding: 17,
      gap: 18,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },

    attributeRow: {
      gap: 10,
    },

    attributeTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    attributeLabelWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },

    attributeIcon: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: theme.primaryLight,
    },

    attributeLabel: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.text,
    },

    attributeValueBadge: {
      minWidth: 48,
      paddingHorizontal: 9,
      paddingVertical: 5,
      alignItems: "center",
      borderRadius: 11,
      backgroundColor: theme.surface,
    },

    attributeValue: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.textSecondary,
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

    ratingCard: {
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },

    ratingScoreWrap: {
      alignItems: "center",
    },

    ratingLarge: {
      fontSize: 43,
      fontWeight: "900",
      letterSpacing: -1,
      color: theme.text,
    },

    ratingOutOf: {
      marginTop: -3,
      fontSize: 10,
      fontWeight: "700",
      color: theme.textSecondary,
    },

    ratingDivider: {
      width: 1,
      height: 55,
      marginHorizontal: 20,
      backgroundColor: theme.border,
    },

    ratingDetails: {
      flex: 1,
    },

    starsRow: {
      flexDirection: "row",
      gap: 3,
    },

    ratingLabel: {
      marginTop: 7,
      fontSize: 12,
      lineHeight: 18,
      color: theme.textSecondary,
    },

    pairingContainer: {
      flexDirection: "row",
      gap: 9,
    },

    pairingCard: {
      flex: 1,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      backgroundColor: theme.card,
    },

    pairingIcon: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: theme.primaryLight,
    },

    pairingText: {
      marginTop: 8,
      fontSize: 11,
      fontWeight: "700",
      textAlign: "center",
      color: theme.text,
    },

    primaryButton: {
      height: 58,
      marginTop: 30,
      paddingHorizontal: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      borderRadius: 17,
      backgroundColor: theme.primary,
    },

    primaryButtonIcon: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      backgroundColor: "rgba(255,255,255,0.15)",
    },

    primaryButtonText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "center",
      color: "#FFFFFF",
    },

    notFoundContainer: {
      flex: 1,
      padding: 28,
      alignItems: "center",
      justifyContent: "center",
    },

    notFoundIcon: {
      width: 82,
      height: 82,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 28,
      backgroundColor: theme.primaryLight,
    },

    notFoundTitle: {
      marginTop: 20,
      fontSize: 21,
      fontWeight: "900",
      color: theme.text,
    },

    notFoundText: {
      marginTop: 8,
      maxWidth: 290,
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
      color: theme.textSecondary,
    },

    backButton: {
      marginTop: 22,
      paddingHorizontal: 20,
      paddingVertical: 13,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderRadius: 14,
      backgroundColor: theme.primary,
    },

    backButtonText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#FFFFFF",
    },
  })
}