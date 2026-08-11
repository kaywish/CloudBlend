import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import {
  router,
  useLocalSearchParams,
} from "expo-router"
import { useMemo } from "react"
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppTheme } from "@/constants/colors"
import { useAppTheme } from "@/context/AppThemeContext"
import { useAuth } from "@/context/AuthContext"
import { usePro } from "@/context/ProContext"


const PRO_FEATURES = [
  {
    icon: "bookmark-outline" as const,
    title: "Save Community Mixes",
    description:
      "Save public recipes to your personal mix library.",
  },
  {
    icon: "infinite-outline" as const,
    title: "Unlimited Personal Mixes",
    description:
      "Create and organize as many recipes as you want.",
  },
  {
    icon: "analytics-outline" as const,
    title: "Personal Mix Statistics",
    description:
      "Discover your most-used flavors, brands, and categories.",
  },
  {
    icon: "library-outline" as const,
    title: "Collections",
    description:
      "Organize recipes into collections such as favorites, summer mixes, and mint blends.",
  },
  {
    icon: "journal-outline" as const,
    title: "Flavor Journal",
    description:
      "Track bowl notes, heat setup, ratings, and smoking sessions.",
  },
  {
    icon: "git-compare-outline" as const,
    title: "Advanced Pairings",
    description:
      "Unlock pairing details and recommended flavor ratios.",
  },
]

export default function ProScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(
    () => getStyles(theme),
    [theme]
  )
const { returnMixId } = useLocalSearchParams<{
  returnMixId?: string
}>()
  const { user } = useAuth()

  const {
    hasPro,
    isLoadingPro,
    isPurchasing,
    packagePrice,
    purchasePro,
    restorePurchases,
  } = usePro()

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

  async function handlePurchase() {
    if (!user) {
      router.push("/auth")
      return
    }

    const result = await purchasePro()

    if (result.cancelled) {
      return
    }

    if (!result.success) {
      showMessage(
        "Purchase Unavailable",
        result.error ??
          "KloudIt Pro could not be purchased."
      )
      return
    }

    showMessage(
      "Welcome to KloudIt Pro",
      "Your Pro features are now unlocked."
    )

    continueAfterProUnlock()
  }

  function continueAfterProUnlock() {
  if (returnMixId) {
    router.replace({
      pathname: "/mix/[id]",
      params: {
        id: returnMixId,
        autoSave: "true",
      },
    })

    return
  }

  router.replace("/(tabs)/profile")
}

async function handleRestore() {
  if (!user) {
    showMessage(
      "Sign In Required",
      "Sign in to the KloudIt account you originally used before restoring your purchase."
    )

    router.push("/auth")
    return
  }

  const result = await restorePurchases()

  if (!result.success) {
    showMessage(
      "No Purchase Restored",
      result.error ??
        "No active KloudIt Pro subscription was found."
    )
    return
  }

  showMessage(
    "Purchase Restored",
    "KloudIt Pro is now active on this account."
  )

  router.back()
}

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="close"
              size={24}
              color={theme.text}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            KloudIt Pro
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <LinearGradient
          colors={[
            theme.primaryDark,
            theme.primary,
            "#56A8F5",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.crownContainer}>
            <Ionicons
              name="sparkles"
              size={34}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.heroEyebrow}>
            UNLOCK THE FULL EXPERIENCE
          </Text>

          <Text style={styles.heroTitle}>
            Blend without limits
          </Text>

          <Text style={styles.heroText}>
            Save community recipes, organize your
            collection, and unlock advanced tools built
            for hookah enthusiasts.
          </Text>

          {hasPro ? (
            <View style={styles.activeBadge}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color="#FFFFFF"
              />

              <Text style={styles.activeBadgeText}>
                KloudIt Pro is active
              </Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionEyebrow}>
            INCLUDED WITH PRO
          </Text>

          <Text style={styles.sectionTitle}>
            Everything you need to build better mixes
          </Text>

          <View style={styles.featureCard}>
            {PRO_FEATURES.map((feature, index) => (
              <View key={feature.title}>
                <View style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <Ionicons
                      name={feature.icon}
                      size={22}
                      color={theme.primary}
                    />
                  </View>

                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>
                      {feature.title}
                    </Text>

                    <Text
                      style={styles.featureDescription}
                    >
                      {feature.description}
                    </Text>
                  </View>

                  <Ionicons
                    name="checkmark-circle"
                    size={21}
                    color={theme.success}
                  />
                </View>

                {index < PRO_FEATURES.length - 1 ? (
                  <View style={styles.divider} />
                ) : null}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.purchaseCard}>
          {isLoadingPro ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="small"
                color={theme.primary}
              />

              <Text style={styles.loadingText}>
                Loading subscription...
              </Text>
            </View>
          ) : hasPro ? (
            <>
              <View style={styles.currentPlanRow}>
                <View style={styles.currentPlanIcon}>
                  <Ionicons
                    name="diamond"
                    size={24}
                    color={theme.primary}
                  />
                </View>

                <View style={styles.currentPlanContent}>
                  <Text style={styles.currentPlanLabel}>
                    CURRENT PLAN
                  </Text>

                  <Text style={styles.currentPlanTitle}>
                    KloudIt Pro
                  </Text>
                </View>

                <View style={styles.activePlanBadge}>
                  <Text
                    style={styles.activePlanBadgeText}
                  >
                    Active
                  </Text>
                </View>
              </View>

              <Text style={styles.activePlanText}>
                All Pro features are available on this
                account.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.priceLabel}>
                KloudIt PRO
              </Text>

              <View style={styles.priceRow}>
                <Text style={styles.price}>
                  {packagePrice ?? "$4.99"}
                </Text>

                <Text style={styles.pricePeriod}>
                  / month
                </Text>
              </View>

              <Text style={styles.trialText}>
                Cancel anytime. Subscription renews
                automatically unless cancelled.
              </Text>

              <TouchableOpacity
  style={[
    styles.purchaseButton,
    isPurchasing && styles.disabledButton,
  ]}
  activeOpacity={0.86}
  disabled={isPurchasing}
  onPress={() => {
    void handlePurchase()
  }}
>
  {isPurchasing ? (
    <ActivityIndicator
      size="small"
      color="#FFFFFF"
    />
  ) : (
    <Ionicons
      name="sparkles"
      size={19}
      color="#FFFFFF"
    />
  )}

  <Text style={styles.purchaseButtonText}>
    {isPurchasing
      ? "Processing..."
      : user
        ? "Subscribe to KloudIt Pro"
        : "Sign In to Continue"}
  </Text>
</TouchableOpacity>

            <TouchableOpacity
  style={[
    styles.restoreButton,
    isPurchasing && styles.disabledButton,
  ]}
  disabled={isPurchasing}
  onPress={() => {
    void handleRestore()
  }}
>
  {isPurchasing ? (
    <ActivityIndicator
      size="small"
      color={theme.primary}
    />
  ) : (
    <Ionicons
      name="refresh-outline"
      size={17}
      color={theme.primary}
    />
  )}

  <Text style={styles.restoreButtonText}>
    {isPurchasing
      ? "Checking Purchases..."
      : "Restore Purchases"}
  </Text>
</TouchableOpacity>
            </>
          )}

   
        </View>

        <Text style={styles.legalText}>
          Payment will be charged to your App Store or
          Google Play account. Your subscription renews
          automatically unless cancelled at least 24 hours
          before the end of the current period.
        </Text>
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

    closeButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 21,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },

    headerTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.text,
    },

    headerSpacer: {
      width: 42,
    },

    hero: {
      marginHorizontal: 18,
      paddingHorizontal: 24,
      paddingVertical: 30,
      alignItems: "center",
      overflow: "hidden",
      borderRadius: 30,
    },

    heroGlowOne: {
      position: "absolute",
      top: -70,
      right: -45,
      width: 190,
      height: 190,
      borderRadius: 95,
      backgroundColor:
        "rgba(255,255,255,0.12)",
    },

    heroGlowTwo: {
      position: "absolute",
      bottom: -90,
      left: -50,
      width: 210,
      height: 210,
      borderRadius: 105,
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    crownContainer: {
      width: 66,
      height: 66,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 22,
      backgroundColor:
        "rgba(255,255,255,0.18)",
    },

    heroEyebrow: {
      marginTop: 20,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.5,
      color: "rgba(255,255,255,0.78)",
    },

    heroTitle: {
      marginTop: 8,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: "900",
      letterSpacing: -0.7,
      textAlign: "center",
      color: "#FFFFFF",
    },

    heroText: {
      marginTop: 10,
      maxWidth: 330,
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
      color: "rgba(255,255,255,0.84)",
    },

    activeBadge: {
      marginTop: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderRadius: 18,
      backgroundColor:
        "rgba(255,255,255,0.18)",
    },

    activeBadgeText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    featuresSection: {
      marginTop: 28,
      paddingHorizontal: 18,
    },

    sectionEyebrow: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.4,
      color: theme.primary,
    },

    sectionTitle: {
      marginTop: 5,
      maxWidth: 340,
      fontSize: 23,
      lineHeight: 29,
      fontWeight: "900",
      letterSpacing: -0.4,
      color: theme.text,
    },

    featureCard: {
      marginTop: 16,
      paddingHorizontal: 17,
      borderRadius: 24,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },

    featureRow: {
      paddingVertical: 17,
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
    },

    featureIcon: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      backgroundColor: theme.primarySoft,
    },

    featureContent: {
      flex: 1,
    },

    featureTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.text,
    },

    featureDescription: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 18,
      color: theme.textSecondary,
    },

    divider: {
      height: 1,
      marginLeft: 57,
      backgroundColor: theme.border,
    },

    purchaseCard: {
      marginTop: 22,
      marginHorizontal: 18,
      padding: 20,
      borderRadius: 25,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },

    loadingContainer: {
      minHeight: 100,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },

    loadingText: {
      fontSize: 13,
      color: theme.textSecondary,
    },

    priceLabel: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.4,
      color: theme.primary,
    },

    priceRow: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "flex-end",
    },

    price: {
      fontSize: 34,
      fontWeight: "900",
      letterSpacing: -0.8,
      color: theme.text,
    },

    pricePeriod: {
      marginBottom: 5,
      marginLeft: 5,
      fontSize: 14,
      color: theme.textSecondary,
    },

    trialText: {
      marginTop: 8,
      fontSize: 12,
      lineHeight: 18,
      color: theme.textSecondary,
    },

    purchaseButton: {
      minHeight: 54,
      marginTop: 19,
      paddingHorizontal: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      borderRadius: 17,
      backgroundColor: theme.primary,
    },

    purchaseButtonText: {
      fontSize: 14,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    disabledButton: {
      opacity: 0.65,
    },

    restoreButton: {
  minHeight: 46,
  paddingTop: 14,
  paddingHorizontal: 12,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
},

    restoreButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.primary,
    },

    currentPlanRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    currentPlanIcon: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: theme.primarySoft,
    },

    currentPlanContent: {
      flex: 1,
    },

    currentPlanLabel: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.1,
      color: theme.primary,
    },

    currentPlanTitle: {
      marginTop: 3,
      fontSize: 18,
      fontWeight: "900",
      color: theme.text,
    },

    activePlanBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: theme.success,
    },

    activePlanBadgeText: {
      fontSize: 10,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    activePlanText: {
      marginTop: 14,
      fontSize: 13,
      lineHeight: 19,
      color: theme.textSecondary,
    },

    legalText: {
      marginTop: 17,
      marginHorizontal: 27,
      fontSize: 10,
      lineHeight: 16,
      textAlign: "center",
      color: theme.textSecondary,
    },

    
  })
}