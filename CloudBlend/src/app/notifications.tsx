import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppTheme } from "@/constants/colors"
import { useAppTheme } from "@/context/AppThemeContext"
import {
  AppNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notificationService"

export default function NotificationsScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => getStyles(theme), [theme])

  const [notifications, setNotifications] = useState<
    AppNotification[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadNotifications = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        const result = await fetchNotifications()
        setNotifications(result)
      } catch (error) {
        console.error("Could not load notifications:", error)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    []
  )

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  async function handleNotificationPress(
    notification: AppNotification
  ) {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id)

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  isRead: true,
                }
              : item
          )
        )
      } catch (error) {
        console.error(
          "Could not mark notification as read:",
          error
        )
      }
    }

    const flavorId = notification.data?.flavorId

    if (typeof flavorId === "string") {
      router.push({
        pathname: "/flavor/[id]",
        params: {
          id: flavorId,
        },
      })
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead()

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          isRead: true,
        }))
      )
    } catch (error) {
      console.error(
        "Could not mark all notifications as read:",
        error
      )
    }
  }

  const unreadCount = notifications.filter(
    (item) => !item.isRead
  ).length

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={theme.primary}
          />
          <Text style={styles.loadingText}>
            Loading notifications...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
          Notifications
        </Text>

        <TouchableOpacity
          style={styles.headerButton}
          disabled={unreadCount === 0}
          onPress={() => {
            void handleMarkAllRead()
          }}
        >
          <Ionicons
            name="checkmark-done-outline"
            size={22}
            color={
              unreadCount > 0
                ? theme.primary
                : theme.muted
            }
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadNotifications(true)
            }}
            tintColor={theme.primary}
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="notifications-outline"
                size={36}
                color={theme.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No notifications yet
            </Text>

            <Text style={styles.emptyText}>
              Updates about your photos and community activity
              will appear here.
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.isRead &&
                  styles.unreadNotificationCard,
              ]}
              activeOpacity={0.85}
              onPress={() => {
                void handleNotificationPress(notification)
              }}
            >
              <View
                style={[
                  styles.notificationIcon,
                  notification.type === "photo-rejected"
                    ? styles.rejectedIcon
                    : styles.approvedIcon,
                ]}
              >
                <Ionicons
                  name={
                    notification.type === "photo-rejected"
                      ? "close-circle-outline"
                      : "checkmark-circle-outline"
                  }
                  size={24}
                  color={
                    notification.type === "photo-rejected"
                      ? theme.danger
                      : theme.primary
                  }
                />
              </View>

              <View style={styles.notificationContent}>
                <View style={styles.titleRow}>
                  <Text style={styles.notificationTitle}>
                    {notification.title}
                  </Text>

                  {!notification.isRead ? (
                    <View style={styles.unreadDot} />
                  ) : null}
                </View>

                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>

                <Text style={styles.notificationDate}>
                  {new Date(
                    notification.createdAt
                  ).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
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

    header: {
      height: 62,
      paddingHorizontal: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    headerButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },

    headerTitle: {
      fontSize: 17,
      fontWeight: "900",
      color: theme.text,
    },

    scrollContent: {
      paddingHorizontal: 18,
      paddingBottom: 40,
    },

    notificationCard: {
      marginTop: 12,
      padding: 15,
      flexDirection: "row",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      backgroundColor: theme.card,
    },

    unreadNotificationCard: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },

    notificationIcon: {
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
    },

    approvedIcon: {
      backgroundColor: theme.primary + "18",
    },

    rejectedIcon: {
      backgroundColor: theme.danger + "18",
    },

    notificationContent: {
      flex: 1,
      marginLeft: 12,
    },

    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    notificationTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: "900",
      color: theme.text,
    },

    notificationMessage: {
      marginTop: 5,
      fontSize: 12,
      lineHeight: 18,
      color: theme.textSecondary,
    },

    notificationDate: {
      marginTop: 8,
      fontSize: 10,
      color: theme.muted,
    },

    unreadDot: {
      width: 9,
      height: 9,
      borderRadius: 999,
      backgroundColor: theme.primary,
    },

    emptyCard: {
      marginTop: 20,
      padding: 30,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 24,
      backgroundColor: theme.card,
    },

    emptyIcon: {
      width: 66,
      height: 66,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 22,
      backgroundColor: theme.primaryLight,
    },

    emptyTitle: {
      marginTop: 16,
      fontSize: 19,
      fontWeight: "900",
      textAlign: "center",
      color: theme.text,
    },

    emptyText: {
      marginTop: 7,
      maxWidth: 300,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      color: theme.textSecondary,
    },

    center: {
      flex: 1,
      paddingHorizontal: 25,
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      marginTop: 14,
      fontSize: 13,
      fontWeight: "700",
      color: theme.textSecondary,
    },
  })
}