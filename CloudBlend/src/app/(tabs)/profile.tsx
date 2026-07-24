import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { router, useFocusEffect } from "expo-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useAuth } from "@/context/AuthContext"
import { ThemeMode, useAppTheme } from "@/context/AppThemeContext"
import { useMixes } from "@/context/MixContext"
import { useProfile } from "@/context/ProfileContext"
import { getUnreadNotificationCount } from "@/services/notificationService"

function getInitials(
  displayName?: string,
  username?: string
) {
  const source = displayName?.trim() || username?.trim() || "C"

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

function formatJoinedDate(date?: string) {
  if (!date) return "Recently"

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(date))
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const {
    theme,
    themeMode,
    resolvedTheme,
    setThemeMode,
  } = useAppTheme()

  const palette = {
    background: theme.background,
    card: theme.card,
    surface: theme.surface,
    text: theme.text,
    muted: theme.textSecondary,
    border: theme.border,
    input: theme.input,
    primary: theme.primary,
    primaryDark: theme.primaryDark,
    primarySoft: theme.primarySoft,
    success: theme.success,
    warning: theme.warning,
    danger: theme.danger,
  }

  const styles = getStyles(palette)
  const {
    savedMixes,
    isLoading,
    refreshMixes,
  } = useMixes()
  const {
    profile,
    isLoadingProfile,
    isSavingProfile,
    refreshProfile,
    updateProfile,
    uploadAvatar,
    removeAvatar,
  } = useProfile()

  const [isRefreshing, setIsRefreshing] =
    useState(false)
  const [editVisible, setEditVisible] =
    useState(false)
  const [appearanceVisible, setAppearanceVisible] =
    useState(false)
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] =
    useState("")
  const [bio, setBio] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)

  const publicMixCount = useMemo(
    () =>
      savedMixes.filter(
        (mix) => mix.visibility === "public"
      ).length,
    [savedMixes]
  )

  const privateMixCount =
    savedMixes.length - publicMixCount

  useEffect(() => {
    if (!profile) return

    setUsername(profile.username)
    setDisplayName(profile.displayName)
    setBio(profile.bio)
  }, [profile])

  const loadUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    try {
      const count = await getUnreadNotificationCount()
      setUnreadCount(count)
    } catch (error) {
      console.error(
        "Could not load unread notification count:",
        error
      )
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      void loadUnreadCount()
    }, [loadUnreadCount])
  )

  async function handleRefresh() {
    setIsRefreshing(true)

    try {
      await Promise.all([
        refreshProfile(),
        refreshMixes(),
        loadUnreadCount(),
      ])
    } catch {
      Alert.alert(
        "Could Not Refresh",
        "Your profile could not be refreshed."
      )
    } finally {
      setIsRefreshing(false)
    }
  }

  function openEditor() {
    if (!profile) return

    setUsername(profile.username)
    setDisplayName(profile.displayName)
    setBio(profile.bio)
    setEditVisible(true)
  }

  async function handleSave() {
    const result = await updateProfile({
      username,
      displayName,
      bio,
    })

    if (result.error) {
      Alert.alert(
        "Could Not Save Profile",
        result.error
      )
      return
    }

    setEditVisible(false)
    Alert.alert(
      "Profile Updated",
      "Your changes have been saved."
    )
  }

  async function handleChooseAvatar() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert(
        "Photo Permission Required",
        "Allow photo access to choose a profile picture."
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

    if (result.canceled) return

    const asset = result.assets[0]
    const uploadResult = await uploadAvatar(
      asset.uri,
      asset.mimeType
    )

    if (uploadResult.error) {
      Alert.alert(
        "Could Not Upload Photo",
        uploadResult.error
      )
    }
  }

  function handleAvatarPress() {
    const options = [
      {
        text: "Choose Photo",
        onPress: handleChooseAvatar,
      },
    ]

    if (profile?.avatarUrl) {
      options.push({
        text: "Remove Photo",
        onPress: async () => {
          const result = await removeAvatar()

          if (result.error) {
            Alert.alert(
              "Could Not Remove Photo",
              result.error
            )
          }
        },
      })
    }

    options.push({
      text: "Cancel",
      style: "cancel",
    } as any)

    Alert.alert(
      "Profile Picture",
      "Choose an option",
      options as any
    )
  }

  async function performSignOut() {
    const result = await signOut()

    if (result.error) {
      if (Platform.OS === "web") {
        window.alert(result.error)
      } else {
        Alert.alert(
          "Could Not Sign Out",
          result.error
        )
      }

      return
    }

    router.replace("/auth")
  }

  function handleSignOut() {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Are you sure you want to sign out?"
      )

      if (confirmed) {
        performSignOut()
      }

      return
    }

    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: performSignOut,
        },
      ]
    )
  }

  async function handleThemeChange(mode: ThemeMode) {
    await setThemeMode(mode)
    setAppearanceVisible(false)
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.guestContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.guestIconOuter}>
            <View style={styles.guestIconInner}>
              <Ionicons
                name="person-outline"
                size={42}
                color="#FFFFFF"
              />
            </View>
          </View>

          <Text style={styles.guestTitle}>
            Your CloudBlend Profile
          </Text>

          <Text style={styles.guestSubtitle}>
            Sign in to create your profile, save mixes,
            publish blends, and connect with the
            CloudBlend community.
          </Text>

          <View style={styles.guestFeatureCard}>
            <View style={styles.guestFeatureRow}>
              <View style={styles.guestFeatureIcon}>
                <Ionicons
                  name="flask-outline"
                  size={20}
                  color={palette.primary}
                />
              </View>

              <View style={styles.guestFeatureContent}>
                <Text style={styles.guestFeatureTitle}>
                  Save your mixes
                </Text>

                <Text style={styles.guestFeatureText}>
                  Keep all your favorite flavor
                  combinations in one place.
                </Text>
              </View>
            </View>

            <View style={styles.guestDivider} />

            <View style={styles.guestFeatureRow}>
              <View style={styles.guestFeatureIcon}>
                <Ionicons
                  name="earth-outline"
                  size={20}
                  color={palette.primary}
                />
              </View>

              <View style={styles.guestFeatureContent}>
                <Text style={styles.guestFeatureTitle}>
                  Share with the community
                </Text>

                <Text style={styles.guestFeatureText}>
                  Publish your best mixes and let other
                  users discover them.
                </Text>
              </View>
            </View>

            <View style={styles.guestDivider} />

            <View style={styles.guestFeatureRow}>
              <View style={styles.guestFeatureIcon}>
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color={palette.primary}
                />
              </View>

              <View style={styles.guestFeatureContent}>
                <Text style={styles.guestFeatureTitle}>
                  Build your profile
                </Text>

                <Text style={styles.guestFeatureText}>
                  Add a username, profile picture, bio,
                  and public mix collection.
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.guestPrimaryButton}
            onPress={() => router.push("/auth")}
          >
            <Text style={styles.guestPrimaryButtonText}>
              Sign In or Create Account
            </Text>

            <Ionicons
              name="arrow-forward"
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <Text style={styles.guestFooter}>
            You can still browse flavors and public mixes
            without an account.
          </Text>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (isLoadingProfile && !profile) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator
          size="large"
          color={palette.primary}
        />
        <Text style={styles.loadingText}>
          Loading your profile...
        </Text>
      </SafeAreaView>
    )
  }

  const visibleName =
    profile?.displayName || profile?.username || "CloudBlend User"

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.backgroundGlowOne} />
      <View style={styles.backgroundGlowTwo} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={palette.primary}
          />
        }
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.pageEyebrow}>
              YOUR CLOUDBLEND
            </Text>
            <Text style={styles.pageTitle}>Profile</Text>
          </View>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={openEditor}
          >
            <Ionicons
              name="create-outline"
              size={21}
              color={palette.text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroAccent} />

          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handleAvatarPress}
            activeOpacity={0.85}
          >
            {profile?.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>
                  {getInitials(
                    profile?.displayName,
                    profile?.username
                  )}
                </Text>
              </View>
            )}

            <View style={styles.cameraBadge}>
              {isSavingProfile ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="camera"
                  size={15}
                  color="#FFFFFF"
                />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.displayName}>
            {visibleName}
          </Text>

          <Text style={styles.username}>
            @{profile?.username}
          </Text>

          {profile?.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : (
            <Text style={styles.emptyBio}>
              Add a short bio to tell the community
              about your favorite flavors.
            </Text>
          )}

          <View style={styles.joinedRow}>
            <Ionicons
              name="calendar-outline"
              size={15}
              color={palette.muted}
            />
            <Text style={styles.joinedText}>
              Joined {formatJoinedDate(profile?.createdAt)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={openEditor}
          >
            <Ionicons
              name="pencil"
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.editButtonText}>
              Edit Profile
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                styles.statIconPrimary,
              ]}
            >
              <Ionicons
                name="flask-outline"
                size={20}
                color={palette.primary}
              />
            </View>
            <Text style={styles.statNumber}>
              {savedMixes.length}
            </Text>
            <Text style={styles.statLabel}>
              Total Mixes
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                styles.statIconSuccess,
              ]}
            >
              <Ionicons
                name="earth-outline"
                size={20}
                color={palette.success}
              />
            </View>
            <Text style={styles.statNumber}>
              {publicMixCount}
            </Text>
            <Text style={styles.statLabel}>
              Published
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                styles.statIconWarning,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={palette.warning}
              />
            </View>
            <Text style={styles.statNumber}>
              {privateMixCount}
            </Text>
            <Text style={styles.statLabel}>
              Private
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Your Mixes
            </Text>
            <Text style={styles.sectionSubtitle}>
              Your latest CloudBlend creations
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/mixes")}
          >
            <Text style={styles.seeAllText}>
              See all
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator
              color={palette.primary}
            />
          </View>
        ) : savedMixes.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="flask-outline"
                size={30}
                color={palette.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              No mixes yet
            </Text>
            <Text style={styles.emptyText}>
              Create your first blend and it will appear
              here.
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push("/create")}
            >
              <Ionicons
                name="add"
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.createButtonText}>
                Create a Mix
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mixList}>
            {savedMixes.slice(0, 3).map((mix) => (
              <TouchableOpacity
                key={mix.id}
                style={styles.mixCard}
                onPress={() =>
                  router.push({
                    pathname: "/mix/[id]",
                    params: { id: mix.id },
                  })
                }
              >
                <View style={styles.mixIcon}>
                  <Ionicons
                    name="flask"
                    size={21}
                    color={palette.primary}
                  />
                </View>

                <View style={styles.mixInfo}>
                  <Text
                    style={styles.mixName}
                    numberOfLines={1}
                  >
                    {mix.name}
                  </Text>
                  <Text
                    style={styles.mixIngredients}
                    numberOfLines={1}
                  >
                    {mix.ingredients
                      .map(
                        (ingredient) =>
                          ingredient.flavorName
                      )
                      .join(" • ") || "No ingredients"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.visibilityBadge,
                    mix.visibility === "public"
                      ? styles.publicBadge
                      : styles.privateBadge,
                  ]}
                >
                  <Ionicons
                    name={
                      mix.visibility === "public"
                        ? "earth"
                        : "lock-closed"
                    }
                    size={12}
                    color={
                      mix.visibility === "public"
                        ? palette.success
                        : palette.muted
                    }
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>
            Preferences
          </Text>

          <View style={styles.accountCard}>
            <TouchableOpacity
              style={styles.accountRow}
              activeOpacity={0.8}
              onPress={() => router.push("/notifications")}
            >
              <View style={styles.accountIcon}>
                <Ionicons
                  name="notifications-outline"
                  size={21}
                  color={palette.primary}
                />
              </View>

              <View style={styles.accountText}>
                <Text style={styles.accountLabel}>
                  Notifications
                </Text>
                <Text style={styles.accountValue}>
                  View approvals and account activity
                </Text>
              </View>

              {unreadCount > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              ) : null}

              <Ionicons
                name="chevron-forward"
                size={19}
                color={palette.muted}
                style={styles.accountChevron}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.accountRow}
              activeOpacity={0.8}
              onPress={() => setAppearanceVisible(true)}
            >
              <View style={styles.accountIcon}>
                <Ionicons
                  name={
                    resolvedTheme === "dark"
                      ? "moon-outline"
                      : "sunny-outline"
                  }
                  size={21}
                  color={palette.primary}
                />
              </View>

              <View style={styles.accountText}>
                <Text style={styles.accountLabel}>
                  Appearance
                </Text>
                <Text style={styles.accountValue}>
                  {themeMode === "system"
                    ? `System (${
                        resolvedTheme === "dark"
                          ? "Dark"
                          : "Light"
                      })`
                    : themeMode === "dark"
                      ? "Dark"
                      : "Light"}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={19}
                color={palette.muted}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>
            Account
          </Text>

          <View style={styles.accountCard}>
            <View style={styles.accountRow}>
              <View style={styles.accountIcon}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={palette.primary}
                />
              </View>
              <View style={styles.accountText}>
                <Text style={styles.accountLabel}>
                  Email
                </Text>
                <Text style={styles.accountValue}>
                  {user?.email}
                </Text>
              </View>
            </View>

            {profile?.isAdmin && (
  <>
    <View style={styles.divider} />

    <TouchableOpacity
      style={styles.accountRow}
      onPress={() => router.push("/admin/flavor-photos")}
    >
      <View style={styles.accountIcon}>
        <Ionicons
          name="images-outline"
          size={20}
          color={palette.primary}
        />
      </View>

      <View style={styles.accountText}>
        <Text style={styles.accountLabel}>
          Review Flavor Photos
        </Text>

        <Text style={styles.accountValue}>
          Approve or reject community submissions
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color={palette.muted}
      />
    </TouchableOpacity>
  </>
)}



<View style={styles.divider} />

<TouchableOpacity
  style={styles.accountRow}
  onPress={handleSignOut}
>
              <View
                style={[
                  styles.accountIcon,
                  styles.signOutIcon,
                ]}
              >
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={palette.danger}
                />
              </View>
              <View style={styles.accountText}>
                <Text
                  style={[
                    styles.accountLabel,
                    styles.signOutText,
                  ]}
                >
                  Sign Out
                </Text>
                <Text style={styles.accountValue}>
                  Sign out of this device
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={19}
                color={palette.muted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={appearanceVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAppearanceVisible(false)}
      >
        <View style={styles.appearanceOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setAppearanceVisible(false)}
          />

          <View style={styles.appearanceSheet}>
            <View style={styles.appearanceHandle} />

            <Text style={styles.appearanceTitle}>
              Appearance
            </Text>

            <Text style={styles.appearanceSubtitle}>
              Choose how CloudBlend looks on this device.
            </Text>

            {(
              [
                {
                  value: "system",
                  label: "System",
                  description:
                    "Match your device appearance",
                  icon: "phone-portrait-outline",
                },
                {
                  value: "light",
                  label: "Light",
                  description:
                    "Always use the light theme",
                  icon: "sunny-outline",
                },
                {
                  value: "dark",
                  label: "Dark",
                  description:
                    "Always use the dark theme",
                  icon: "moon-outline",
                },
              ] as const
            ).map((option) => {
              const selected =
                themeMode === option.value

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.themeOption,
                    selected &&
                      styles.themeOptionSelected,
                  ]}
                  onPress={() =>
                    handleThemeChange(option.value)
                  }
                >
                  <View
                    style={[
                      styles.themeOptionIcon,
                      selected &&
                        styles.themeOptionIconSelected,
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={21}
                      color={
                        selected
                          ? palette.primary
                          : palette.muted
                      }
                    />
                  </View>

                  <View style={styles.themeOptionText}>
                    <Text style={styles.themeOptionLabel}>
                      {option.label}
                    </Text>
                    <Text
                      style={
                        styles.themeOptionDescription
                      }
                    >
                      {option.description}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.radioOuter,
                      selected &&
                        styles.radioOuterSelected,
                    ]}
                  >
                    {selected ? (
                      <View style={styles.radioInner} />
                    ) : null}
                  </View>
                </TouchableOpacity>
              )
            })}

            <TouchableOpacity
              style={styles.appearanceCancelButton}
              onPress={() => setAppearanceVisible(false)}
            >
              <Text style={styles.appearanceCancelText}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={
              Platform.OS === "ios"
                ? "padding"
                : undefined
            }
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalHeaderButton}
                onPress={() => setEditVisible(false)}
              >
                <Text style={styles.cancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                Edit Profile
              </Text>

              <TouchableOpacity
                style={styles.modalHeaderButton}
                onPress={handleSave}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator
                    size="small"
                    color={palette.primary}
                  />
                ) : (
                  <Text style={styles.saveText}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={
                styles.modalContent
              }
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity
                style={styles.editAvatarContainer}
                onPress={handleAvatarPress}
              >
                {profile?.avatarUrl ? (
                  <Image
                    source={{
                      uri: profile.avatarUrl,
                    }}
                    style={styles.editAvatar}
                  />
                ) : (
                  <View style={styles.editAvatarFallback}>
                    <Text
                      style={styles.editAvatarInitials}
                    >
                      {getInitials(
                        displayName,
                        username
                      )}
                    </Text>
                  </View>
                )}

                <Text style={styles.changePhotoText}>
                  Change profile picture
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>
                Display Name
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={19}
                  color={palette.muted}
                />
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your name"
                  placeholderTextColor={palette.muted}
                  maxLength={40}
                  autoCapitalize="words"
                />
              </View>
              <Text style={styles.characterCount}>
                {displayName.length}/40
              </Text>

              <Text style={styles.inputLabel}>
                Username
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.atSymbol}>@</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={(value) =>
                    setUsername(
                      value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, "")
                    )
                  }
                  placeholder="username"
                  placeholderTextColor={palette.muted}
                  maxLength={20}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Text style={styles.helperText}>
                3–20 letters, numbers, or underscores
              </Text>

              <Text style={styles.inputLabel}>
                Bio
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  styles.bioInputContainer,
                ]}
              >
                <TextInput
                  style={[
                    styles.input,
                    styles.bioInput,
                  ]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell people about your favorite flavors..."
                  placeholderTextColor={palette.muted}
                  maxLength={160}
                  multiline
                  textAlignVertical="top"
                />
              </View>
              <Text style={styles.characterCount}>
                {bio.length}/160
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

type ProfilePalette = {
  background: string
  card: string
  surface: string
  text: string
  muted: string
  border: string
  input: string
  primary: string
  primaryDark: string
  primarySoft: string
  success: string
  warning: string
  danger: string
}

function getStyles(palette: ProfilePalette) {
  return StyleSheet.create({
  guestContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingTop: 40,
    paddingBottom: 50,
    backgroundColor: palette.background,
  },
  guestIconOuter: {
    width: 102,
    height: 102,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 51,
    backgroundColor: palette.primarySoft,
  },
  guestIconInner: {
    width: 78,
    height: 78,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 39,
    backgroundColor: palette.primary,
  },
  guestTitle: {
    marginTop: 25,
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    color: palette.text,
  },
  guestSubtitle: {
    marginTop: 11,
    paddingHorizontal: 5,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    color: palette.muted,
  },
  guestFeatureCard: {
    marginTop: 28,
    paddingHorizontal: 17,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 22,
    backgroundColor: palette.card,
  },
  guestFeatureRow: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
  },
  guestFeatureIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: palette.primarySoft,
  },
  guestFeatureContent: {
    flex: 1,
    marginLeft: 13,
  },
  guestFeatureTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: palette.text,
  },
  guestFeatureText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: palette.muted,
  },
  guestDivider: {
    height: 1,
    marginLeft: 57,
    backgroundColor: palette.border,
  },
  guestPrimaryButton: {
    minHeight: 54,
    marginTop: 25,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 17,
    backgroundColor: palette.primary,
  },
  guestPrimaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  guestFooter: {
    marginTop: 15,
    paddingHorizontal: 15,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    color: palette.muted,
  },
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: palette.background,
  },
  loadingText: {
    fontSize: 14,
    color: palette.muted,
  },
  backgroundGlowOne: {
    position: "absolute",
    top: -90,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: palette.primarySoft,
  },
  backgroundGlowTwo: {
    position: "absolute",
    top: 290,
    left: -130,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: palette.primarySoft,
    opacity: 0.6,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  topBar: {
    paddingTop: 8,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
    color: palette.primary,
  },
  pageTitle: {
    marginTop: 2,
    fontSize: 30,
    fontWeight: "900",
    color: palette.text,
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 15,
    backgroundColor: palette.card,
  },
  heroCard: {
    overflow: "hidden",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 28,
    backgroundColor: palette.card,
    shadowColor: "#1B1730",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 5,
  },
  heroAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 7,
    backgroundColor: palette.primary,
  },
  avatarWrapper: {
    width: 108,
    height: 108,
  },
  avatar: {
    width: 108,
    height: 108,
    borderWidth: 5,
    borderColor: palette.primarySoft,
    borderRadius: 54,
  },
  avatarFallback: {
    width: 108,
    height: 108,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: palette.primarySoft,
    borderRadius: 54,
    backgroundColor: palette.primary,
  },
  avatarInitials: {
    fontSize: 35,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 2,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: palette.card,
    borderRadius: 17,
    backgroundColor: palette.primary,
  },
  displayName: {
    marginTop: 17,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    color: palette.text,
  },
  username: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "700",
    color: palette.primary,
  },
  bio: {
    maxWidth: 310,
    marginTop: 13,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: palette.muted,
  },
  emptyBio: {
    maxWidth: 300,
    marginTop: 13,
    fontSize: 13,
    lineHeight: 20,
    fontStyle: "italic",
    textAlign: "center",
    color: palette.muted,
  },
  joinedRow: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  joinedText: {
    fontSize: 12,
    color: palette.muted,
  },
  editButton: {
    height: 46,
    marginTop: 19,
    paddingHorizontal: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 15,
    backgroundColor: palette.primary,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  statsRow: {
    marginTop: 15,
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minHeight: 125,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 20,
    backgroundColor: palette.card,
  },
  statIcon: {
    width: 37,
    height: 37,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  statIconPrimary: {
    backgroundColor: palette.primarySoft,
  },
  statIconSuccess: {
    backgroundColor: `${palette.success}18`,
  },
  statIconWarning: {
    backgroundColor: `${palette.warning}18`,
  },
  statNumber: {
    marginTop: 9,
    fontSize: 22,
    fontWeight: "900",
    color: palette.text,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: palette.muted,
  },
  sectionHeader: {
    marginTop: 28,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: palette.text,
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: palette.muted,
  },
  seeAllText: {
    paddingVertical: 5,
    fontSize: 13,
    fontWeight: "800",
    color: palette.primary,
  },
  inlineLoading: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyCard: {
    alignItems: "center",
    padding: 25,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 23,
    backgroundColor: palette.card,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: palette.primarySoft,
  },
  emptyTitle: {
    marginTop: 13,
    fontSize: 17,
    fontWeight: "900",
    color: palette.text,
  },
  emptyText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    color: palette.muted,
  },
  createButton: {
    height: 44,
    marginTop: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 14,
    backgroundColor: palette.primary,
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  mixList: {
    gap: 10,
  },
  mixCard: {
    minHeight: 72,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 19,
    backgroundColor: palette.card,
  },
  mixIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: palette.primarySoft,
  },
  mixInfo: {
    flex: 1,
    marginLeft: 12,
  },
  mixName: {
    fontSize: 15,
    fontWeight: "900",
    color: palette.text,
  },
  mixIngredients: {
    marginTop: 4,
    fontSize: 12,
    color: palette.muted,
  },
  visibilityBadge: {
    width: 31,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  publicBadge: {
    backgroundColor: `${palette.success}18`,
  },
  privateBadge: {
    backgroundColor: palette.input,
  },
  accountSection: {
    marginTop: 28,
  },
  accountCard: {
    marginTop: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 22,
    backgroundColor: palette.card,
  },
  accountRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
  },
  accountIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: palette.primarySoft,
  },
  signOutIcon: {
    backgroundColor: `${palette.danger}18`,
  },
  accountText: {
    flex: 1,
    marginLeft: 12,
  },
  accountLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: palette.text,
  },
  accountValue: {
    marginTop: 3,
    fontSize: 12,
    color: palette.muted,
  },
  signOutText: {
    color: palette.danger,
  },
  divider: {
    height: 1,
    marginLeft: 54,
    backgroundColor: palette.border,
  },
  appearanceOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  appearanceSheet: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 26,
    backgroundColor: palette.card,
  },
  appearanceHandle: {
    width: 42,
    height: 5,
    alignSelf: "center",
    marginBottom: 18,
    borderRadius: 3,
    backgroundColor: palette.border,
  },
  appearanceTitle: {
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
    color: palette.text,
  },
  appearanceSubtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    color: palette.muted,
  },
  themeOption: {
    minHeight: 72,
    marginBottom: 9,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 18,
    backgroundColor: palette.surface,
  },
  themeOptionSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft,
  },
  themeOptionIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: palette.input,
  },
  themeOptionIconSelected: {
    backgroundColor: palette.card,
  },
  themeOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  themeOptionLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: palette.text,
  },
  themeOptionDescription: {
    marginTop: 3,
    fontSize: 12,
    color: palette.muted,
  },
  radioOuter: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: palette.border,
    borderRadius: 11,
  },
  radioOuterSelected: {
    borderColor: palette.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.primary,
  },
  appearanceCancelButton: {
    minHeight: 48,
    marginTop: 5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: palette.input,
  },
  appearanceCancelText: {
    fontSize: 14,
    fontWeight: "800",
    color: palette.text,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  modalKeyboard: {
    flex: 1,
  },
  modalHeader: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.card,
  },
  modalHeaderButton: {
    width: 60,
    minHeight: 40,
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: palette.text,
  },
  cancelText: {
    fontSize: 14,
    color: palette.muted,
  },
  saveText: {
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
    color: palette.primary,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 50,
  },
  editAvatarContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  editAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  editAvatarFallback: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 46,
    backgroundColor: palette.primary,
  },
  editAvatarInitials: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  changePhotoText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "800",
    color: palette.primary,
  },
  inputLabel: {
    marginTop: 17,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "800",
    color: palette.text,
  },
  inputContainer: {
    minHeight: 56,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    backgroundColor: palette.surface,
  },
  input: {
    flex: 1,
    minHeight: 54,
    fontSize: 15,
    color: palette.text,
  },
  atSymbol: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.muted,
  },
  bioInputContainer: {
    minHeight: 120,
    alignItems: "flex-start",
    paddingTop: 4,
  },
  bioInput: {
    minHeight: 110,
    paddingTop: 13,
  },
  helperText: {
    marginTop: 6,
    fontSize: 11,
    color: palette.muted,
  },
  characterCount: {
    marginTop: 6,
    fontSize: 11,
    textAlign: "right",
    color: palette.muted,
  },
  notificationBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: palette.primary,
  },

  notificationBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  accountChevron: {
    marginLeft: 10,
  },
  
})
}