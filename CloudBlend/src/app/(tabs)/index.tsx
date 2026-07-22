import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
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

import { colors } from "@/constants/colors"
import { flavors } from "@/data/flavors"
import { mixes } from "@/data/mixes"
import { FlavorCategory } from "@/types"

const theme = colors.light

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
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="menu-outline" size={26} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.logo}>
            Cloud<Text style={styles.logoAccent}>Blend</Text>
          </Text>

          <Text style={styles.subtitle}>Discover. Mix. Enjoy.</Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={theme.textSecondary}
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Search flavors or mixes..."
            placeholderTextColor={theme.muted}
          />
        </View>

        <LinearGradient
          colors={["#4B2418", "#7D3A20", "#B75A2D"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroOverlay}>
            <Text style={styles.heroEyebrow}>New here?</Text>

            <Text style={styles.heroTitle}>
              Find Your{"\n"}Perfect Mix
            </Text>

            <TouchableOpacity style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Take Quiz</Text>

              <Ionicons
                name="arrow-forward-outline"
                size={17}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.heroDecoration}>
            <Ionicons name="flame" size={92} color="rgba(255,255,255,0.14)" />
          </View>
        </LinearGradient>

        <SectionHeader title="Browse Categories" />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.name}
              style={styles.categoryItem}
            >
              <View style={styles.categoryIcon}>
                <Ionicons
                  name={category.icon}
                  size={24}
                  color={theme.primary}
                />
              </View>

              <Text style={styles.categoryText}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SectionHeader
          title="Trending Mixes"
          onPress={() => router.push("/flavors")}
        />

        <FlatList
          horizontal
          data={mixes}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.mixCard} activeOpacity={0.85}>
              <Image source={{ uri: item.image }} style={styles.mixImage} />

              <Text style={styles.mixName} numberOfLines={2}>
                {item.name}
              </Text>

              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={theme.warning} />

                <Text style={styles.ratingText}>
                  {item.averageRating.toFixed(1)}
                </Text>

                <Text style={styles.ratingCount}>({item.ratingCount})</Text>
              </View>
            </TouchableOpacity>
          )}
        />

        <SectionHeader
          title="Popular Flavors"
          onPress={() => router.push("/flavors")}
        />

        <FlatList
          horizontal
          data={flavors}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.flavorCard} activeOpacity={0.85}>
              <Image source={{ uri: item.image }} style={styles.flavorImage} />

              <Text style={styles.flavorName} numberOfLines={2}>
                {item.name}
              </Text>

              <Text style={styles.flavorBrand}>{item.brand}</Text>

              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={theme.warning} />

                <Text style={styles.ratingText}>
                  {item.averageRating.toFixed(1)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

type SectionHeaderProps = {
  title: string
  onPress?: () => void
}

function SectionHeader({ title, onPress }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {onPress ? (
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },

  scrollContent: {
    paddingBottom: 30,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  titleContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },

  logo: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    letterSpacing: -1.2,
    color: theme.text,
  },

  logoAccent: {
    color: theme.primary,
  },

  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: theme.textSecondary,
  },

  searchContainer: {
    height: 52,
    marginHorizontal: 20,
    marginTop: 22,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 15,
    backgroundColor: theme.surface,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: theme.text,
  },

  heroCard: {
    minHeight: 170,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 22,
    overflow: "hidden",
  },

  heroOverlay: {
    flex: 1,
    zIndex: 2,
    padding: 22,
    justifyContent: "center",
  },

  heroEyebrow: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
  },

  heroTitle: {
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  heroButton: {
    alignSelf: "flex-start",
    marginTop: 18,
    paddingHorizontal: 17,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 12,
    backgroundColor: theme.primary,
  },

  heroButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  heroDecoration: {
    position: "absolute",
    right: 10,
    bottom: 5,
    transform: [{ rotate: "-10deg" }],
  },

  sectionHeader: {
    marginTop: 28,
    marginBottom: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: theme.text,
  },

  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.primary,
  },

  categoryList: {
    paddingHorizontal: 20,
    gap: 16,
  },

  categoryItem: {
    width: 65,
    alignItems: "center",
  },

  categoryIcon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 27,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.primaryLight,
  },

  categoryText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "500",
    color: theme.text,
  },

  horizontalList: {
    paddingHorizontal: 20,
    gap: 12,
  },

  mixCard: {
    width: 145,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 17,
    backgroundColor: theme.card,
  },

  mixImage: {
    width: "100%",
    height: 105,
    borderRadius: 13,
    backgroundColor: theme.surface,
  },

  mixName: {
    minHeight: 39,
    marginTop: 11,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    color: theme.text,
  },

  flavorCard: {
    width: 135,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 17,
    backgroundColor: theme.card,
  },

  flavorImage: {
    width: "100%",
    height: 100,
    borderRadius: 13,
    backgroundColor: theme.surface,
  },

  flavorName: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    color: theme.text,
  },

  flavorBrand: {
    marginTop: 3,
    fontSize: 12,
    color: theme.textSecondary,
  },

  ratingRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.text,
  },

  ratingCount: {
    fontSize: 11,
    color: theme.textSecondary,
  },
})