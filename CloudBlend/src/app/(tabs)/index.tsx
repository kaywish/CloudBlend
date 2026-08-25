import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { router, useFocusEffect  } from "expo-router"
import { useEffect, useMemo, useState, useCallback } from "react"
import {
  fetchNotifications,
  getUnreadNotificationCount,
} from "@/services/notificationService"
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppTheme } from "@/constants/colors"
import { useAppTheme } from "@/context/AppThemeContext"
import { useFlavors } from "@/context/FlavorContext"
import { useMixes } from "@/context/MixContext"
import type { Flavor } from "@/types/flavor"

type CategoryOption = {
  name: string
  value: string
  icon: keyof typeof Ionicons.glyphMap
}

type QuizLeafPreference = "Any" | "Blonde" | "Dark"

type QuizStage = "category" | "leaf" | "results"

const categories: CategoryOption[] = [
  {
    name: "Fruity",
    value: "Fruit",
    icon: "nutrition-outline",
  },
  {
    name: "Minty",
    value: "Mint",
    icon: "leaf-outline",
  },
  {
    name: "Sweet",
    value: "Sweet",
    icon: "ice-cream-outline",
  },
  {
    name: "Citrus",
    value: "Citrus",
    icon: "sunny-outline",
  },
  {
    name: "Creamy",
    value: "Cream",
    icon: "water-outline",
  },
  {
    name: "Spiced",
    value: "Spice",
    icon: "flame-outline",
  },
]

export default function HomeScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => getStyles(theme), [theme])
const [unreadCount, setUnreadCount] = useState(0)

  const flavorContext = useFlavors()
  const mixContext = useMixes()

  const databaseFlavors = flavorContext.flavors ?? []
  const publicMixes = mixContext.publicMixes ?? []

  const isLoadingFlavors =
    "isLoading" in flavorContext
      ? Boolean(flavorContext.isLoading)
      : false

  const isLoadingMixes =
    "isLoadingPublic" in mixContext
      ? Boolean(mixContext.isLoadingPublic)
      : false

  const [quizVisible, setQuizVisible] = useState(false)
  const [quizStage, setQuizStage] =
    useState<QuizStage>("category")
  const [selectedQuizCategory, setSelectedQuizCategory] =
    useState("")
  const [quizResults, setQuizResults] = useState<Flavor[]>([])

  useEffect(() => {
    if (
      publicMixes.length === 0 &&
      typeof mixContext.refreshPublicMixes === "function"
    ) {
      mixContext.refreshPublicMixes().catch((error: unknown) => {
        console.error("Unable to load public mixes:", error)
      })
    }
  }, [
    publicMixes.length,
    mixContext.refreshPublicMixes,
  ])

  const loadNotifications = useCallback(async () => {
  try {
    const count = await getUnreadNotificationCount()
    setUnreadCount(count)
  } catch (error) {
    console.log(error)
  }
}, [])

useFocusEffect(
  useCallback(() => {
    loadNotifications()
  }, [loadNotifications])
)

  const trendingMixes = useMemo(() => {
    return [...publicMixes]
      .sort((firstMix, secondMix) => {
        return (
          getMixTrendingScore(secondMix) -
          getMixTrendingScore(firstMix)
        )
      })
      .slice(0, 6)
  }, [publicMixes])

  const trendingFlavors = useMemo(() => {
    return [...databaseFlavors]
      .sort((firstFlavor, secondFlavor) => {
        return (
          getFlavorTrendingScore(secondFlavor) -
          getFlavorTrendingScore(firstFlavor)
        )
      })
      .slice(0, 8)
  }, [databaseFlavors])

  function openFlavor(flavorId: string) {
    setQuizVisible(false)

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

  function openCategory(category: string) {
    router.push({
      pathname: "/flavors",
      params: {
        category,
      },
    })
  }

  function openQuiz() {
    setSelectedQuizCategory("")
    setQuizResults([])
    setQuizStage("category")
    setQuizVisible(true)
  }

  function closeQuiz() {
    setQuizVisible(false)
  }

  function selectQuizCategory(category: string) {
    setSelectedQuizCategory(category)
    setQuizStage("leaf")
  }

  function completeQuiz(
    leafPreference: QuizLeafPreference
  ) {
    const scoredFlavors = databaseFlavors
      .map((flavor) => {
        let score = 0

        const flavorCategoryList =
          getFlavorCategories(flavor)

        const matchesCategory =
          flavorCategoryList.some(
            (category) =>
              category.toLowerCase() ===
              selectedQuizCategory.toLowerCase()
          )

        if (matchesCategory) {
          score += 60
        }

        if (
          leafPreference === "Dark" &&
          flavor.isDarkLeaf
        ) {
          score += 25
        }

        if (
          leafPreference === "Blonde" &&
          !flavor.isDarkLeaf
        ) {
          score += 25
        }

        if (leafPreference === "Any") {
          score += 12
        }

        score +=
          Math.min(flavor.averageRating ?? 0, 5) * 4

        score +=
          Math.min(flavor.favoriteCount ?? 0, 100) *
          0.15

        score +=
          Math.min(flavor.publicMixCount ?? 0, 100) *
          0.2

        return {
          flavor,
          score,
          matchesCategory,
        }
      })
      .filter((item) => item.matchesCategory)
      .sort((first, second) => second.score - first.score)
      .slice(0, 5)
      .map((item) => item.flavor)

    setQuizResults(scoredFlavors)
    setQuizStage("results")
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              WELCOME TO
            </Text>

            <Text style={styles.logo}>
              Kloud
              <Text style={styles.logoAccent}>
                It
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerIcon}
            activeOpacity={0.8}
            onPress={() =>
              router.push("/notifications")
            }
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={theme.text}
            />

            {unreadCount > 0 && (
  <View style={styles.notificationBadge}>
    <Text style={styles.notificationBadgeText}>
      {unreadCount > 99 ? "99+" : unreadCount}
    </Text>
  </View>
)}
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          Discover flavors, build blends, and save
          your favorites.
        </Text>

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
            Answer two quick questions and discover
            flavors that match your taste.
          </Text>

          <TouchableOpacity
            style={styles.heroButton}
            activeOpacity={0.86}
            onPress={openQuiz}
          >
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
                openCategory(category.value)
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

        {isLoadingMixes &&
        trendingMixes.length === 0 ? (
          <LoadingCardRow styles={styles} />
        ) : (
          <FlatList
            horizontal
            data={trendingMixes}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.horizontalList
            }
            ListEmptyComponent={
              <EmptyHorizontalCard
                icon="flask-outline"
                text="No public mixes yet."
                theme={theme}
                styles={styles}
              />
            }
            renderItem={({ item }) => {
              const imageUrl = getMixImage(item)
              const averageRating =
                getMixAverageRating(item)

              return (
                <TouchableOpacity
                  style={styles.mixCard}
                  activeOpacity={0.86}
                  onPress={() => openMix(item.id)}
                >
                  <View style={styles.mixImageWrap}>
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.mixImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={styles.mixImagePlaceholder}
                      >
                        <Ionicons
                          name="flask-outline"
                          size={35}
                          color={theme.primary}
                        />
                      </View>
                    )}

                    <View
                      style={styles.mixImageOverlay}
                    />

                    <View style={styles.trendingBadge}>
                      <Ionicons
                        name="trending-up"
                        size={13}
                        color="#FFFFFF"
                      />

                      <Text
                        style={
                          styles.trendingBadgeText
                        }
                      >
                        Trending
                      </Text>
                    </View>

                    <View
                      style={styles.mixRatingPill}
                    >
                      <Ionicons
                        name="star"
                        size={12}
                        color={theme.warning}
                      />

                      <Text
                        style={styles.mixRatingText}
                      >
                        {averageRating.toFixed(1)}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={styles.mixName}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>

                  <Text style={styles.mixMeta}>
                    {getMixMeta(item)}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Text
                      style={styles.cardActionText}
                    >
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
              )
            }}
          />
        )}

        <SectionHeader
          eyebrow="POPULAR NOW"
          title="Trending Flavors"
          onPress={() => router.push("/flavors")}
          theme={theme}
          styles={styles}
        />

        {isLoadingFlavors &&
        trendingFlavors.length === 0 ? (
          <LoadingCardRow styles={styles} />
        ) : (
          <FlatList
            horizontal
            data={trendingFlavors}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.horizontalList
            }
            ListEmptyComponent={
              <EmptyHorizontalCard
                icon="leaf-outline"
                text="No flavors found."
                theme={theme}
                styles={styles}
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.flavorCard}
                activeOpacity={0.86}
                onPress={() => openFlavor(item.id)}
              >
                <View
                  style={styles.flavorImageWrap}
                >
                  {item.imageUrl ? (
                    <Image
                      source={{
                        uri: item.imageUrl,
                      }}
                      style={styles.flavorImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={
                        styles.flavorImagePlaceholder
                      }
                    >
                      <Ionicons
                        name="leaf-outline"
                        size={32}
                        color={theme.primary}
                      />
                    </View>
                  )}

                  <View
                    style={styles.flavorRatingPill}
                  >
                    <Ionicons
                      name="star"
                      size={12}
                      color={theme.warning}
                    />

                    <Text
                      style={styles.mixRatingText}
                    >
                      {(item.averageRating ?? 0).toFixed(
                        1
                      )}
                    </Text>
                  </View>
                </View>

                <Text
                  style={styles.flavorName}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>

                <Text
                  style={styles.flavorBrand}
                  numberOfLines={1}
                >
                  {item.brandName}
                </Text>

                <View style={styles.flavorTagRow}>
                  {getFlavorCategories(item)
                    .slice(0, 2)
                    .map((category) => (
                      <View
                        key={category}
                        style={styles.flavorTag}
                      >
                        <Text
                          style={
                            styles.flavorTagText
                          }
                        >
                          {category}
                        </Text>
                      </View>
                    ))}
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        <TouchableOpacity
          style={styles.builderBanner}
          activeOpacity={0.88}
          onPress={() =>
            router.push("/(tabs)/builder")
          }
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
              Choose flavors and balance your
              percentages.
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

      <Modal
        visible={quizVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeQuiz}
      >
        <SafeAreaView
          style={styles.quizSafeArea}
          edges={["top", "bottom"]}
        >
          <View style={styles.quizHeader}>
            <View>
              <Text style={styles.quizEyebrow}>
                FLAVOR MATCH
              </Text>

              <Text style={styles.quizHeaderTitle}>
                Find your flavor
              </Text>
            </View>

            <TouchableOpacity
              style={styles.quizCloseButton}
              onPress={closeQuiz}
            >
              <Ionicons
                name="close"
                size={22}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.quizContent
            }
          >
            {quizStage === "category" ? (
              <>
                <QuizProgress
                  currentStep={1}
                  styles={styles}
                />

                <Text style={styles.quizStepText}>
                  QUESTION 1 OF 2
                </Text>

                <Text style={styles.quizQuestion}>
                  What flavor profile sounds best?
                </Text>

                <Text style={styles.quizSubtitle}>
                  Choose the type of flavor you
                  usually enjoy most.
                </Text>

                <View style={styles.quizOptions}>
                  {categories.map((category) => (
                    <QuizOption
                      key={category.name}
                      label={category.name}
                      icon={category.icon}
                      onPress={() =>
                        selectQuizCategory(
                          category.value
                        )
                      }
                      theme={theme}
                      styles={styles}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {quizStage === "leaf" ? (
              <>
                <QuizProgress
                  currentStep={2}
                  styles={styles}
                />

                <Text style={styles.quizStepText}>
                  QUESTION 2 OF 2
                </Text>

                <Text style={styles.quizQuestion}>
                  Which leaf type do you prefer?
                </Text>

                <Text style={styles.quizSubtitle}>
                  This helps us narrow down your best
                  flavor matches.
                </Text>

                <View style={styles.quizOptions}>
                  <QuizOption
                    label="No preference"
                    subtitle="Show both blonde and dark leaf"
                    icon="options-outline"
                    onPress={() =>
                      completeQuiz("Any")
                    }
                    theme={theme}
                    styles={styles}
                  />

                  <QuizOption
                    label="Blonde leaf"
                    subtitle="Usually lighter and smoother"
                    icon="sunny-outline"
                    onPress={() =>
                      completeQuiz("Blonde")
                    }
                    theme={theme}
                    styles={styles}
                  />

                  <QuizOption
                    label="Dark leaf"
                    subtitle="Usually richer and stronger"
                    icon="moon-outline"
                    onPress={() =>
                      completeQuiz("Dark")
                    }
                    theme={theme}
                    styles={styles}
                  />
                </View>

                <TouchableOpacity
                  style={styles.quizBackButton}
                  onPress={() =>
                    setQuizStage("category")
                  }
                >
                  <Ionicons
                    name="arrow-back"
                    size={17}
                    color={theme.primary}
                  />

                  <Text
                    style={styles.quizBackText}
                  >
                    Previous question
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            {quizStage === "results" ? (
              <>
                <View style={styles.resultHero}>
                  <View style={styles.resultHeroIcon}>
                    <Ionicons
                      name="sparkles"
                      size={29}
                      color="#FFFFFF"
                    />
                  </View>

                  <Text style={styles.resultTitle}>
                    Your flavor matches
                  </Text>

                  <Text
                    style={styles.resultSubtitle}
                  >
                    Based on your answers and current
                    community data.
                  </Text>
                </View>

                {quizResults.length > 0 ? (
                  <View style={styles.resultList}>
                    {quizResults.map(
                      (flavor, index) => (
                        <TouchableOpacity
                          key={flavor.id}
                          style={styles.resultCard}
                          activeOpacity={0.84}
                          onPress={() =>
                            openFlavor(flavor.id)
                          }
                        >
                          {flavor.imageUrl ? (
                            <Image
                              source={{
                                uri: flavor.imageUrl,
                              }}
                              style={
                                styles.resultImage
                              }
                              resizeMode="cover"
                            />
                          ) : (
                            <View
                              style={
                                styles.resultImagePlaceholder
                              }
                            >
                              <Ionicons
                                name="leaf-outline"
                                size={27}
                                color={
                                  theme.primary
                                }
                              />
                            </View>
                          )}

                          <View
                            style={
                              styles.resultInfo
                            }
                          >
                            <Text
                              style={
                                styles.resultRank
                              }
                            >
                              MATCH #{index + 1}
                            </Text>

                            <Text
                              style={
                                styles.resultName
                              }
                              numberOfLines={1}
                            >
                              {flavor.name}
                            </Text>

                            <Text
                              style={
                                styles.resultBrand
                              }
                              numberOfLines={1}
                            >
                              {flavor.brandName}
                            </Text>

                            <View
                              style={
                                styles.resultRating
                              }
                            >
                              <Ionicons
                                name="star"
                                size={13}
                                color={
                                  theme.warning
                                }
                              />

                              <Text
                                style={
                                  styles.resultRatingText
                                }
                              >
                                {(
                                  flavor.averageRating ??
                                  0
                                ).toFixed(1)}
                              </Text>
                            </View>
                          </View>

                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={theme.primary}
                          />
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                ) : (
                  <View style={styles.noResultsCard}>
                    <Ionicons
                      name="search-outline"
                      size={34}
                      color={theme.primary}
                    />

                    <Text
                      style={styles.noResultsTitle}
                    >
                      No exact matches yet
                    </Text>

                    <Text
                      style={styles.noResultsText}
                    >
                      Try another category or add more
                      flavors to your database.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={openQuiz}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={18}
                    color={theme.primary}
                  />

                  <Text
                    style={styles.retakeButtonText}
                  >
                    Retake quiz
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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

type QuizOptionProps = {
  label: string
  subtitle?: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  theme: AppTheme
  styles: ReturnType<typeof getStyles>
}

function QuizOption({
  label,
  subtitle,
  icon,
  onPress,
  theme,
  styles,
}: QuizOptionProps) {
  return (
    <TouchableOpacity
      style={styles.quizOption}
      activeOpacity={0.84}
      onPress={onPress}
    >
      <View style={styles.quizOptionIcon}>
        <Ionicons
          name={icon}
          size={24}
          color={theme.primary}
        />
      </View>

      <View style={styles.quizOptionTextWrap}>
        <Text style={styles.quizOptionText}>
          {label}
        </Text>

        {subtitle ? (
          <Text style={styles.quizOptionSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color={theme.muted}
      />
    </TouchableOpacity>
  )
}

function QuizProgress({
  currentStep,
  styles,
}: {
  currentStep: number
  styles: ReturnType<typeof getStyles>
}) {
  return (
    <View style={styles.quizProgressRow}>
      {[1, 2].map((step) => (
        <View
          key={step}
          style={[
            styles.quizProgressBar,
            step <= currentStep &&
              styles.quizProgressBarActive,
          ]}
        />
      ))}
    </View>
  )
}

function LoadingCardRow({
  styles,
}: {
  styles: ReturnType<typeof getStyles>
}) {
  return (
    <View style={styles.loadingRow}>
      <ActivityIndicator size="small" />
    </View>
  )
}

function EmptyHorizontalCard({
  icon,
  text,
  theme,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap
  text: string
  theme: AppTheme
  styles: ReturnType<typeof getStyles>
}) {
  return (
    <View style={styles.emptyHorizontalCard}>
      <Ionicons
        name={icon}
        size={28}
        color={theme.primary}
      />

      <Text style={styles.emptyHorizontalText}>
        {text}
      </Text>
    </View>
  )
}

function getFlavorCategories(
  flavor: Flavor
): string[] {
  const flavorWithCategories = flavor as Flavor & {
    categories?: string[] | null
    category?: string | null
  }

  if (
    Array.isArray(flavorWithCategories.categories)
  ) {
    return flavorWithCategories.categories
  }

  if (flavorWithCategories.category) {
    return [flavorWithCategories.category]
  }

  return []
}

function getFlavorTrendingScore(
  flavor: Flavor
) {
  return (
    (flavor.publicMixCount ?? 0) * 4 +
    (flavor.favoriteCount ?? 0) * 3 +
    (flavor.ratingCount ?? 0) +
    (flavor.averageRating ?? 0) * 5
  )
}

function getMixTrendingScore(mix: unknown) {
  const value = mix as {
    likeCount?: number | null
    likesCount?: number | null
    favoriteCount?: number | null
    commentCount?: number | null
    commentsCount?: number | null
    ratingCount?: number | null
    averageRating?: number | null
  }

  const likes =
    value.likeCount ??
    value.likesCount ??
    value.favoriteCount ??
    0

  const comments =
    value.commentCount ??
    value.commentsCount ??
    0

  return (
    likes * 4 +
    comments * 2 +
    (value.ratingCount ?? 0) +
    (value.averageRating ?? 0) * 5
  )
}

function getMixImage(mix: unknown) {
  const value = mix as {
    image?: string | null
    imageUrl?: string | null
    ingredients?: Array<{
      image?: string | null
      imageUrl?: string | null
      flavor?: {
        image?: string | null
        imageUrl?: string | null
      }
    }>
  }

  if (value.imageUrl) {
    return value.imageUrl
  }

  if (value.image) {
    return value.image
  }

  const ingredientWithImage =
    value.ingredients?.find(
      (ingredient) =>
        ingredient.imageUrl ||
        ingredient.image ||
        ingredient.flavor?.imageUrl ||
        ingredient.flavor?.image
    )

  return (
    ingredientWithImage?.imageUrl ??
    ingredientWithImage?.image ??
    ingredientWithImage?.flavor?.imageUrl ??
    ingredientWithImage?.flavor?.image ??
    null
  )
}

function getMixAverageRating(mix: unknown) {
  const value = mix as {
    averageRating?: number | null
  }

  return value.averageRating ?? 0
}

function getMixMeta(mix: unknown) {
  const value = mix as {
    likeCount?: number | null
    likesCount?: number | null
    favoriteCount?: number | null
    commentCount?: number | null
    commentsCount?: number | null
  }

  const likes =
    value.likeCount ??
    value.likesCount ??
    value.favoriteCount ??
    0

  const comments =
    value.commentCount ??
    value.commentsCount ??
    0

  return `${likes} likes · ${comments} comments`
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

    heroCard: {
      minHeight: 245,
      marginHorizontal: 18,
      marginTop: 22,
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
      backgroundColor:
        "rgba(255,255,255,0.11)",
    },

    heroGlowTwo: {
      position: "absolute",
      bottom: -65,
      left: -38,
      width: 165,
      height: 165,
      borderRadius: 83,
      backgroundColor:
        "rgba(255,255,255,0.06)",
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
      backgroundColor:
        "rgba(255,255,255,0.15)",
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
      backgroundColor:
        "rgba(255,255,255,0.14)",
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

    loadingRow: {
      height: 180,
      alignItems: "center",
      justifyContent: "center",
    },

    emptyHorizontalCard: {
      width: 190,
      minHeight: 150,
      padding: 18,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.card,
    },

    emptyHorizontalText: {
      marginTop: 9,
      fontSize: 12,
      textAlign: "center",
      color: theme.textSecondary,
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

    mixImagePlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface,
    },

    mixImageOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor:
        "rgba(19,15,12,0.14)",
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
      backgroundColor:
        "rgba(216,107,43,0.90)",
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
      backgroundColor:
        "rgba(19,15,12,0.76)",
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

    flavorImagePlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
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
      backgroundColor:
        "rgba(19,15,12,0.76)",
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

    quizSafeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },

    quizHeader: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },

    quizEyebrow: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.3,
      color: theme.primary,
    },

    quizHeaderTitle: {
      marginTop: 3,
      fontSize: 25,
      fontWeight: "900",
      color: theme.text,
    },

    quizCloseButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.card,
    },

    quizContent: {
      padding: 20,
      paddingBottom: 40,
    },

    quizProgressRow: {
      flexDirection: "row",
      gap: 7,
    },

    quizProgressBar: {
      flex: 1,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.border,
    },

    quizProgressBarActive: {
      backgroundColor: theme.primary,
    },

    quizStepText: {
      marginTop: 24,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: theme.primary,
    },

    quizQuestion: {
      marginTop: 8,
      fontSize: 29,
      lineHeight: 35,
      fontWeight: "900",
      color: theme.text,
    },

    quizSubtitle: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 21,
      color: theme.textSecondary,
    },

    quizOptions: {
      marginTop: 25,
      gap: 12,
    },

    quizOption: {
      minHeight: 78,
      paddingHorizontal: 15,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 19,
      backgroundColor: theme.card,
    },

    quizOptionIcon: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      backgroundColor: theme.primaryLight,
    },

    quizOptionTextWrap: {
      flex: 1,
      marginLeft: 13,
      marginRight: 8,
    },

    quizOptionText: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.text,
    },

    quizOptionSubtitle: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 16,
      color: theme.textSecondary,
    },

    quizBackButton: {
      alignSelf: "flex-start",
      marginTop: 22,
      paddingVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    quizBackText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.primary,
    },

    resultHero: {
      paddingTop: 8,
      paddingBottom: 10,
      alignItems: "center",
    },

    resultHeroIcon: {
      width: 60,
      height: 60,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 20,
      backgroundColor: theme.primary,
    },

    resultTitle: {
      marginTop: 15,
      fontSize: 27,
      fontWeight: "900",
      color: theme.text,
    },

    resultSubtitle: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
      color: theme.textSecondary,
    },

    resultList: {
      marginTop: 20,
      gap: 11,
    },

    resultCard: {
      padding: 11,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      backgroundColor: theme.card,
    },

    resultImage: {
      width: 72,
      height: 72,
      borderRadius: 14,
      backgroundColor: theme.surface,
    },

    resultImagePlaceholder: {
      width: 72,
      height: 72,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.surface,
    },

    resultInfo: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
    },

    resultRank: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: theme.primary,
    },

    resultName: {
      marginTop: 3,
      fontSize: 16,
      fontWeight: "900",
      color: theme.text,
    },

    resultBrand: {
      marginTop: 2,
      fontSize: 11,
      color: theme.textSecondary,
    },

    resultRating: {
      marginTop: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },

    resultRatingText: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.text,
    },

    noResultsCard: {
      marginTop: 25,
      padding: 25,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.card,
    },

    noResultsTitle: {
      marginTop: 12,
      fontSize: 17,
      fontWeight: "900",
      color: theme.text,
    },

    noResultsText: {
      marginTop: 6,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      color: theme.textSecondary,
    },

    retakeButton: {
      height: 52,
      marginTop: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 15,
    },

    retakeButtonText: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.primary,
    },
    notificationBadge: {
  position: "absolute",
  top: 5,
  right: 5,
  minWidth: 17,
  height: 17,
  paddingHorizontal: 4,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1.5,
  borderColor: theme.card,
  borderRadius: 9,
  backgroundColor: theme.danger,
},

notificationBadgeText: {
  fontSize: 9,
  fontWeight: "900",
  color: "#FFFFFF",
},
  })
}