import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useMemo, useState } from "react"
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { colors } from "@/constants/colors"
import { flavors } from "@/data/flavors"
import { Flavor, FlavorCategory } from "@/types"

const theme = colors.light

const categories: Array<FlavorCategory | "All"> = [
  "All",
  "Fruity",
  "Minty",
  "Sweet",
  "Citrus",
  "Creamy",
  "Spiced",
]

export default function FlavorsScreen() {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<
    FlavorCategory | "All"
  >("All")

  const filteredFlavors = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return flavors.filter((flavor) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        flavor.name.toLowerCase().includes(normalizedSearch) ||
        flavor.brand.toLowerCase().includes(normalizedSearch) ||
        flavor.categories.some((category) =>
          category.toLowerCase().includes(normalizedSearch)
        )

      const matchesCategory =
        selectedCategory === "All" ||
        flavor.categories.includes(selectedCategory)

      return matchesSearch && matchesCategory
    })
  }, [search, selectedCategory])

  function openFlavor(flavor: Flavor) {
    router.push({
      pathname: "/flavor/[id]",
      params: {
        id: flavor.id,
      },
    })
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Flavors</Text>
          <Text style={styles.subtitle}>
            Find flavors that match your taste.
          </Text>
        </View>

        <TouchableOpacity style={styles.filterButton}>
          <Ionicons
            name="options-outline"
            size={23}
            color={theme.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color={theme.textSecondary}
        />

        <TextInput
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          placeholder="Search flavors or brands..."
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {search.length > 0 ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons
              name="close-circle"
              size={20}
              color={theme.muted}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        style={styles.categoryScroll}
        renderItem={({ item }) => {
          const isSelected = item === selectedCategory

          return (
            <TouchableOpacity
              onPress={() => setSelectedCategory(item)}
              style={[
                styles.categoryChip,
                isSelected && styles.categoryChipSelected,
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  isSelected && styles.categoryChipTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )
        }}
      />

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          {selectedCategory === "All"
            ? "All Flavors"
            : `${selectedCategory} Flavors`}
        </Text>

        <Text style={styles.resultsCount}>
          {filteredFlavors.length}{" "}
          {filteredFlavors.length === 1 ? "flavor" : "flavors"}
        </Text>
      </View>

      <FlatList
        data={filteredFlavors}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.flavorList,
          filteredFlavors.length === 0 && styles.emptyList,
        ]}
        renderItem={({ item }) => (
          <FlavorCard flavor={item} onPress={() => openFlavor(item)} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="search-outline"
                size={34}
                color={theme.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>No flavors found</Text>

            <Text style={styles.emptyText}>
              Try a different search or category.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

type FlavorCardProps = {
  flavor: Flavor
  onPress: () => void
}

function FlavorCard({ flavor, onPress }: FlavorCardProps) {
  return (
    <TouchableOpacity
      style={styles.flavorCard}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <Image source={{ uri: flavor.image }} style={styles.flavorImage} />

      <View style={styles.flavorContent}>
        <View style={styles.flavorTopRow}>
          <View style={styles.flavorTitleContainer}>
            <Text style={styles.flavorName} numberOfLines={1}>
              {flavor.name}
            </Text>

            <Text style={styles.flavorBrand}>{flavor.brand}</Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={(event) => {
              event.stopPropagation()
            }}
          >
            <Ionicons name="add" size={19} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.tagContainer}>
          {flavor.categories.slice(0, 3).map((category) => (
            <View key={category} style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{category}</Text>
            </View>
          ))}
        </View>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={15} color={theme.warning} />

          <Text style={styles.ratingValue}>
            {flavor.averageRating.toFixed(1)}
          </Text>

          <Text style={styles.ratingCount}>
            ({flavor.ratingCount} ratings)
          </Text>
        </View>
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
    paddingBottom: 18,
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

  filterButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    backgroundColor: theme.surface,
  },

  searchContainer: {
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

  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: theme.text,
  },

  categoryScroll: {
    flexGrow: 0,
    marginTop: 18,
  },

  categoryList: {
    paddingHorizontal: 20,
    gap: 9,
  },

  categoryChip: {
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    backgroundColor: theme.background,
  },

  categoryChipSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primary,
  },

  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textSecondary,
  },

  categoryChipTextSelected: {
    color: "#FFFFFF",
  },

  resultsHeader: {
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  resultsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
  },

  resultsCount: {
    fontSize: 12,
    color: theme.textSecondary,
  },

  flavorList: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },

  flavorCard: {
    minHeight: 125,
    padding: 12,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 18,
    backgroundColor: theme.card,
  },

  flavorImage: {
    width: 102,
    height: 102,
    borderRadius: 15,
    backgroundColor: theme.surface,
  },

  flavorContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },

  flavorTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  flavorTitleContainer: {
    flex: 1,
    paddingRight: 8,
  },

  flavorName: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.text,
  },

  flavorBrand: {
    marginTop: 3,
    fontSize: 12,
    color: theme.textSecondary,
  },

  addButton: {
    width: 31,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: theme.primary,
  },

  tagContainer: {
    marginTop: 11,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  categoryTag: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: theme.primaryLight,
  },

  categoryTagText: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.primaryDark,
  },

  ratingRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  ratingValue: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.text,
  },

  ratingCount: {
    fontSize: 11,
    color: theme.textSecondary,
  },

  emptyList: {
    flexGrow: 1,
  },

  emptyContainer: {
    flex: 1,
    paddingTop: 70,
    alignItems: "center",
  },

  emptyIcon: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 36,
    backgroundColor: theme.primaryLight,
  },

  emptyTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: theme.textSecondary,
  },
})