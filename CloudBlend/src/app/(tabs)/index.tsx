import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { useMemo, useState } from "react"
import {
  FlatList,
  Image,
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
import { flavors } from "@/data/flavors"
import { mixes } from "@/data/mixes"
import { FlavorCategory } from "@/types"

const categories: {
  name: FlavorCategory
  icon: keyof typeof Ionicons.glyphMap
}[] = [
  {
    name: "Fruity",
    icon: "nutrition-outline",
  },
  {
    name: "Minty",
    icon: "leaf-outline",
  },
  {
    name: "Sweet",
    icon: "ice-cream-outline",
  },
  {
    name: "Citrus",
    icon: "sunny-outline",
  },
  {
    name: "Creamy",
    icon: "cafe-outline",
  },
]

export default function HomeScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => getStyles(theme), [theme])
  const [search, setSearch] = useState("")

  function handleSearchSubmit() {
    const value = search.trim()

    if (!value) {
      return
    }

    router.push({
      pathname: "/flavors",
      params: {
        search: value,
      },
    })
  }

  function openFlavor(flavorId: string) {
    router.push({
      pathname: "/flavor/[id]",
      params: {
        id: flavorId,
      },
    })
  }

  function openMix(mixId: string) {
    router.push({
      pathname: "/mix/[id]",
      params: {
        id: mixId,
        viewOnly: "true",
      },
    })
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>WELCOME TO</Text>

            <Text style={styles.logo}>
              Cloud<Text style={styles.logoAccent}>Blend</Text>
            </Text>
          </View>

          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color={theme.text}
            />

            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          Discover flavors, build blends, and save your favorites.
        </Text>

        <View style={styles.searchCard}>
          <View style={styles.searchIcon}>
            <Ionicons
              name="search-outline"
              size={19}
              color={theme.primary}
            />
          </View>

          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            style={styles.searchInput}
            placeholder="Search flavors or mixes"
            placeholderTextColor={theme.muted}
            returnKeyType="search"
          />

          {search.length > 0 ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearch("")}
            >
              <Ionicons
                name="close"
                size={18}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <LinearGradient
          colors={[
            theme.brownDark,
            theme.primaryDark,
            theme.primary,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Ionicons
                name="sparkles-outline"
                size={14}
                color="#FFFFFF"
              />

              <Text style={styles.heroBadgeText}>
                Personalized for you
              </Text>
            </View>

            <View style={styles.heroIcon}>
              <Ionicons
                name="flame"
                size={27}
                color="#FFFFFF"
              />
            </View>
          </View>

          <Text style={styles.heroTitle}>
            Find your perfect flavor match
          </Text>

          <Text style={styles.heroText}>
            Answer a few quick questions and discover blends that
            match your taste.
          </Text>

          <TouchableOpacity style={styles.heroButton}>
            <Text style={styles.heroButtonText}>
              Take the flavor quiz
            </Text>

            <Ionicons
              name="arrow-forward"
              size={18}
              color={theme.primary}
            />
          </TouchableOpacity>
        </LinearGradient>

        <SectionHeader
          eyebrow="EXPLORE"
          title="Browse Categories"
          theme={theme}
          styles={styles}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.name}
              style={styles.categoryItem}
              activeOpacity={0.82}
              onPress={() =>
                router.push({
                  pathname: "/flavors",
                  params: {
                    category: category.name,
                  },
                })
              }
            >
              <View style={styles.categoryIcon}>
                <Ionicons
                  name={category.icon}
                  size={23}
                  color={theme.primary}
                />
              </View>

              <Text style={styles.categoryText}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SectionHeader
          eyebrow="COMMUNITY PICKS"
          title="Trending Mixes"
          onPress={() => router.push("/explore")}
          theme={theme}
          styles={styles}
        />

        <FlatList
          horizontal
          data={mixes}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.mixCard}
              activeOpacity={0.86}
              onPress={() => openMix(item.id)}
            >
              <View style={styles.mixImageWrap}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.mixImage}
                />

                <View style={styles.mixImageOverlay} />

                <View style={styles.trendingBadge}>
                  <Ionicons
                    name="trending-up"
                    size={13}
                    color="#FFFFFF"
                  />

                  <Text style={styles.trendingBadgeText}>
                    Trending
                  </Text>
                </View>

                <View style={styles.mixRatingPill}>
                  <Ionicons
                    name="star"
                    size={12}
                    color={theme.warning}
                  />

                  <Text style={styles.mixRatingText}>
                    {item.averageRating.toFixed(1)}
                  </Text>
                </View>
              </View>

              <Text style={styles.mixName} numberOfLines={2}>
                {item.name}
              </Text>

              <Text style={styles.mixMeta}>
                {item.ratingCount} community ratings
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.cardActionText}>
                  View mix
                </Text>

                <View style={styles.cardArrow}>
                  <Ionicons
                    name="arrow-forward"
                    size={15}
                    color={theme.primary}
                  />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />

        <SectionHeader
          eyebrow="POPULAR NOW"
          title="Popular Flavors"
          onPress={() => router.push("/flavors")}
          theme={theme}
          styles={styles}
        />

        <FlatList
          horizontal
          data={flavors}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.flavorCard}
              activeOpacity={0.86}
              onPress={() => openFlavor(item.id)}
            >
              <View style={styles.flavorImageWrap}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.flavorImage}
                />

                <View style={styles.flavorRatingPill}>
                  <Ionicons
                    name="star"
                    size={12}
                    color={theme.warning}
                  />

                  <Text style={styles.mixRatingText}>
                    {item.averageRating.toFixed(1)}
                  </Text>
                </View>
              </View>

              <Text style={styles.flavorName} numberOfLines={1}>
                {item.name}
              </Text>

              <Text style={styles.flavorBrand} numberOfLines={1}>
                {item.brand}
              </Text>

              <View style={styles.flavorTagRow}>
                {item.categories.slice(0, 2).map((category) => (
                  <View key={category} style={styles.flavorTag}>
                    <Text style={styles.flavorTagText}>
                      {category}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity
          style={styles.builderBanner}
          activeOpacity={0.88}
          onPress={() => router.push("/(tabs)/builder")}
        >
          <View style={styles.builderIcon}>
            <Ionicons
              name="flask"
              size={24}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.builderTextWrap}>
            <Text style={styles.builderEyebrow}>
              READY TO CREATE?
            </Text>

            <Text style={styles.builderTitle}>
              Build your own mix
            </Text>

            <Text style={styles.builderText}>
              Choose flavors and balance your percentages.
            </Text>
          </View>

          <View style={styles.builderArrow}>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={theme.primary}
            />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

type SectionHeaderProps = {
  eyebrow: string
  title: string
  onPress?: () => void
  theme: AppTheme
  styles: ReturnType<typeof getStyles>
}

function SectionHeader({
  eyebrow,
  title,
  onPress,
  theme,
  styles,
}: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionEyebrow}>
          {eyebrow}
        </Text>

        <Text style={styles.sectionTitle}>
          {title}
        </Text>
      </View>

      {onPress ? (
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={onPress}
        >
          <Text style={styles.seeAllText}>
            See all
          </Text>

          <Ionicons
            name="chevron-forward"
            size={15}
            color={theme.primary}
          />
        </TouchableOpacity>
      ) : null}
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
      paddingBottom: 38,
    },

    header: {
      paddingHorizontal: 18,
      paddingTop: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    greeting: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.5,
      color: theme.primary,
    },

    logo: {
      marginTop: 3,
      fontSize: 31,
      lineHeight: 37,
      fontWeight: "900",
      letterSpacing: -1.2,
      color: theme.text,
    },

    logoAccent: {
      color: theme.primary,
    },

    headerIcon: {
      position: "relative",
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 15,
      backgroundColor: theme.card,
    },

    notificationDot: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 7,
      height: 7,
      borderWidth: 1.5,
      borderColor: theme.card,
      borderRadius: 4,
      backgroundColor: theme.danger,
    },

    subtitle: {
      marginTop: 7,
      paddingHorizontal: 18,
      maxWidth: 330,
      fontSize: 14,
      lineHeight: 21,
      color: theme.textSecondary,
    },

    searchCard: {
      height: 56,
      marginHorizontal: 18,
      marginTop: 20,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      backgroundColor: theme.card,
    },

    searchIcon: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
    },

    searchInput: {
      flex: 1,
      height: "100%",
      marginLeft: 10,
      fontSize: 14,
      color: theme.text,
    },

    clearButton: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: theme.surface,
    },

    heroCard: {
      minHeight: 245,
      marginHorizontal: 18,
      marginTop: 18,
      padding: 22,
      overflow: "hidden",
      borderRadius: 28,
    },

    heroGlowOne: {
      position: "absolute",
      top: -48,
      right: -35,
      width: 155,
      height: 155,
      borderRadius: 78,
      backgroundColor: "rgba(255,255,255,0.11)",
    },

    heroGlowTwo: {
      position: "absolute",
      bottom: -65,
      left: -38,
      width: 165,
      height: 165,
      borderRadius: 83,
      backgroundColor: "rgba(255,255,255,0.06)",
    },

    heroTopRow: {
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
      backgroundColor: "rgba(255,255,255,0.15)",
    },

    heroBadgeText: {
      fontSize: 11,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    heroIcon: {
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      backgroundColor: "rgba(255,255,255,0.14)",
    },

    heroTitle: {
      marginTop: 22,
      maxWidth: 315,
      fontSize: 29,
      lineHeight: 35,
      fontWeight: "900",
      letterSpacing: -0.8,
      color: "#FFFFFF",
    },

    heroText: {
      marginTop: 8,
      maxWidth: 315,
      fontSize: 14,
      lineHeight: 21,
      color: "rgba(255,255,255,0.80)",
    },

    heroButton: {
      alignSelf: "flex-start",
      marginTop: 20,
      paddingHorizontal: 15,
      paddingVertical: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 14,
      backgroundColor: "#FFFFFF",
    },

    heroButtonText: {
      fontSize: 12,
      fontWeight: "900",
      color: theme.primary,
    },

    sectionHeader: {
      marginTop: 29,
      marginBottom: 14,
      paddingHorizontal: 18,
      flexDirection: "row",
      alignItems: "flex-end",
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
      fontSize: 21,
      fontWeight: "900",
      color: theme.text,
    },

    seeAllButton: {
      paddingLeft: 10,
      paddingVertical: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },

    seeAllText: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.primary,
    },

    categoryList: {
      paddingHorizontal: 18,
      gap: 11,
    },

    categoryItem: {
      width: 78,
      paddingVertical: 13,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      backgroundColor: theme.card,
    },

    categoryIcon: {
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      backgroundColor: theme.primaryLight,
    },

    categoryText: {
      marginTop: 8,
      fontSize: 11,
      fontWeight: "700",
      color: theme.text,
    },

    horizontalList: {
      paddingHorizontal: 18,
      gap: 12,
    },

    mixCard: {
      width: 190,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.card,
    },

    mixImageWrap: {
      position: "relative",
      height: 125,
      overflow: "hidden",
      borderRadius: 15,
    },

    mixImage: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.surface,
    },

    mixImageOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(19,15,12,0.14)",
    },

    trendingBadge: {
      position: "absolute",
      top: 8,
      left: 8,
      paddingHorizontal: 8,
      paddingVertical: 5,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 10,
      backgroundColor: "rgba(216,107,43,0.90)",
    },

    trendingBadgeText: {
      fontSize: 9,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    mixRatingPill: {
      position: "absolute",
      right: 8,
      bottom: 8,
      paddingHorizontal: 7,
      paddingVertical: 5,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 10,
      backgroundColor: "rgba(19,15,12,0.76)",
    },

    mixRatingText: {
      fontSize: 10,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    mixName: {
      minHeight: 42,
      marginTop: 11,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "900",
      color: theme.text,
    },

    mixMeta: {
      marginTop: 3,
      fontSize: 10,
      color: theme.textSecondary,
    },

    cardFooter: {
      marginTop: 10,
      paddingTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },

    cardActionText: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.primary,
    },

    cardArrow: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9,
      backgroundColor: theme.primaryLight,
    },

    flavorCard: {
      width: 150,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.card,
    },

    flavorImageWrap: {
      position: "relative",
      height: 112,
    },

    flavorImage: {
      width: "100%",
      height: "100%",
      borderRadius: 15,
      backgroundColor: theme.surface,
    },

    flavorRatingPill: {
      position: "absolute",
      right: 8,
      bottom: 8,
      paddingHorizontal: 7,
      paddingVertical: 5,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 10,
      backgroundColor: "rgba(19,15,12,0.76)",
    },

    flavorName: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "900",
      color: theme.text,
    },

    flavorBrand: {
      marginTop: 3,
      fontSize: 11,
      color: theme.textSecondary,
    },

    flavorTagRow: {
      marginTop: 9,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 5,
    },

    flavorTag: {
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 9,
      backgroundColor: theme.primaryLight,
    },

    flavorTagText: {
      fontSize: 9,
      fontWeight: "700",
      color: theme.primaryDark,
    },

    builderBanner: {
      marginHorizontal: 18,
      marginTop: 30,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },

    builderIcon: {
      width: 50,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: theme.primary,
    },

    builderTextWrap: {
      flex: 1,
      marginLeft: 13,
      marginRight: 10,
    },

    builderEyebrow: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.1,
      color: theme.primary,
    },

    builderTitle: {
      marginTop: 3,
      fontSize: 16,
      fontWeight: "900",
      color: theme.text,
    },

    builderText: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 16,
      color: theme.textSecondary,
    },

    builderArrow: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
    },
  })
}