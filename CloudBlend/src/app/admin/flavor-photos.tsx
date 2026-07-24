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
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppTheme } from "@/constants/colors"
import { useAppTheme } from "@/context/AppThemeContext"


import {
  approveFlavorImage,
  checkIsAdmin,
  fetchPendingFlavorImages,
  rejectFlavorImage,
} from "@/services/adminFlavorImageService"

import type {
  AdminFlavorImageSubmission,
} from "@/types/flavor"

export default function AdminFlavorPhotosScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => getStyles(theme), [theme])

  const [submissions, setSubmissions] = useState<
    AdminFlavorImageSubmission[]
  >([])

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(
    null
  )

  const loadPage = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        const adminAccess = await checkIsAdmin()

        setIsAdmin(adminAccess)

        if (!adminAccess) {
          setSubmissions([])
          return
        }

        const pendingSubmissions =
          await fetchPendingFlavorImages()

        setSubmissions(pendingSubmissions)
      } catch (error) {
        console.error(
          "Could not load admin photo submissions:",
          error
        )

        Alert.alert(
          "Could Not Load Submissions",
          error instanceof Error
            ? error.message
            : "Something went wrong."
        )
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    []
  )

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  function showMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`)
    return
  }

  Alert.alert(title, message)
}

function confirmAction(
  title: string,
  message: string,
  confirmText: string,
  onConfirm: () => void
) {
  if (Platform.OS === "web") {
    const confirmed = window.confirm(`${title}\n\n${message}`)

    if (confirmed) {
      onConfirm()
    }

    return
  }

  Alert.alert(title, message, [
    {
      text: "Cancel",
      style: "cancel",
    },
    {
      text: confirmText,
      style: confirmText === "Reject" ? "destructive" : "default",
      onPress: onConfirm,
    },
  ])
}

 function confirmApproval(
  submission: AdminFlavorImageSubmission
) {
  if (Platform.OS === "web") {
    const makePrimary = window.confirm(
      `Approve Photo\n\nPress OK to approve this as the main photo.\nPress Cancel to approve it as a gallery photo.`
    )

    void handleApprove(submission, makePrimary)
    return
  }

  Alert.alert(
    "Approve Photo",
    `How would you like to approve this photo for ${submission.flavorName}?`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Gallery Photo",
        onPress: () => {
          void handleApprove(submission, false)
        },
      },
      {
        text: "Main Photo",
        onPress: () => {
          void handleApprove(submission, true)
        },
      },
    ]
  )
}

async function handleApprove(
  submission: AdminFlavorImageSubmission,
  makePrimary: boolean
) {
  if (processingId !== null) {
    return
  }

  try {
    setProcessingId(submission.id)

    await approveFlavorImage({
      submissionId: submission.id,
      flavorId: submission.flavorId,
      imageUrl: submission.imageUrl,
      makePrimary,
      creditName: submission.creditName,
      submitterName: submission.submitterName,
    })

    setSubmissions((current) =>
      current.filter((item) => item.id !== submission.id)
    )

    Alert.alert(
      "Photo Approved",
      makePrimary
        ? "The photo was approved and set as the main flavor photo."
        : "The photo was approved and added to the community gallery."
    )
  } catch (error) {
    console.error("Could not approve photo:", error)

    Alert.alert(
      "Could Not Approve Photo",
      error instanceof Error
        ? error.message
        : "Something went wrong while approving the photo."
    )
  } finally {
    setProcessingId(null)
  }
}

function confirmRejection(
  submission: AdminFlavorImageSubmission
) {
  confirmAction(
    "Reject Photo",
    `Are you sure you want to reject this photo for ${submission.flavorName}?`,
    "Reject",
    () => {
      void handleReject(submission)
    }
  )
}

  async function handleReject(
  submission: AdminFlavorImageSubmission
) {
  if (processingId !== null) {
    return
  }

  try {
    setProcessingId(submission.id)

    await rejectFlavorImage({
      submissionId: submission.id,
      reason:
        "Photo did not meet the community submission requirements.",
    })

    setSubmissions((current) =>
      current.filter((item) => item.id !== submission.id)
    )

    Alert.alert(
      "Photo Rejected",
      "The photo submission was rejected."
    )
  } catch (error) {
    console.error("Could not reject photo:", error)

    Alert.alert(
      "Could Not Reject Photo",
      error instanceof Error
        ? error.message
        : "Something went wrong while rejecting the photo."
    )
  } finally {
    setProcessingId(null)
  }
}

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={theme.primary}
          />

          <Text style={styles.loadingText}>
            Loading submissions...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (isAdmin === false) {
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
            Photo Approvals
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.center}>
          <View style={styles.deniedIcon}>
            <Ionicons
              name="lock-closed-outline"
              size={34}
              color={theme.danger}
            />
          </View>

          <Text style={styles.emptyTitle}>
            Admin access required
          </Text>

          <Text style={styles.emptyText}>
            Your account does not have permission to review
            submissions.
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
          Photo Approvals
        </Text>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {submissions.length}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadPage(true)}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons
              name="images-outline"
              size={24}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.introText}>
            <Text style={styles.introTitle}>
              Pending community photos
            </Text>

            <Text style={styles.introDescription}>
              Review ownership confirmation, image quality and the
              selected flavor before approving.
            </Text>
          </View>
        </View>

        {submissions.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="checkmark-done-circle-outline"
                size={38}
                color={theme.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              All caught up
            </Text>

            <Text style={styles.emptyText}>
              There are no pending flavor photos to review.
            </Text>
          </View>
        ) : (
          submissions.map((submission) => {
            const processing =
              processingId === submission.id

            return (
              <View
                key={submission.id}
                style={styles.submissionCard}
              >
                <Image
                  source={{
                    uri: submission.imageUrl,
                  }}
                  style={styles.submissionImage}
                />

                <View style={styles.submissionBody}>
                  <View style={styles.flavorRow}>
                    <View style={styles.flavorInfo}>
                      <Text style={styles.flavorName}>
                        {submission.flavorName}
                      </Text>

                      {submission.brandName ? (
                        <Text style={styles.brandName}>
                          {submission.brandName}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingText}>
                        Pending
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="person-outline"
                      size={16}
                      color={theme.muted}
                    />

                    <Text style={styles.detailText}>
                      Submitted by{" "}
                      {submission.submitterName ??
                        "CloudBlend user"}
                    </Text>
                  </View>

                  {submission.creditName ? (
                    <View style={styles.detailRow}>
                      <Ionicons
                        name="at-outline"
                        size={16}
                        color={theme.muted}
                      />

                      <Text style={styles.detailText}>
                        Credit: {submission.creditName}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.detailRow}>
                    <Ionicons
                      name={
                        submission.permissionConfirmed
                          ? "checkmark-circle"
                          : "alert-circle"
                      }
                      size={16}
                      color={
                        submission.permissionConfirmed
                          ? theme.primary
                          : theme.danger
                      }
                    />

                    <Text style={styles.detailText}>
                      {submission.permissionConfirmed
                        ? "Ownership or permission confirmed"
                        : "Permission was not confirmed"}
                    </Text>
                  </View>

                  {submission.notes ? (
                    <View style={styles.notesCard}>
                      <Text style={styles.notesLabel}>
                        Submission notes
                      </Text>

                      <Text style={styles.notesText}>
                        {submission.notes}
                      </Text>
                    </View>
                  ) : null}

                  <Text style={styles.dateText}>
                    Submitted{" "}
                    {new Date(
                      submission.createdAt
                    ).toLocaleString()}
                  </Text>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[
                        styles.rejectButton,
                        processing && styles.disabledButton,
                      ]}
                      disabled={processing}
                      onPress={() =>
                        confirmRejection(submission)
                      }
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={18}
                        color={theme.danger}
                      />

                      <Text style={styles.rejectButtonText}>
                        Reject
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.approveButton,
                        processing && styles.disabledButton,
                      ]}
                      disabled={processing}
                      onPress={() =>
                        confirmApproval(submission)
                      }
                    >
                      {processing ? (
                        <ActivityIndicator
                          color="#FFFFFF"
                          size="small"
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={18}
                            color="#FFFFFF"
                          />

                          <Text style={styles.approveButtonText}>
                            Approve
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )
          })
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
    headerSpacer: {
      width: 42,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "900",
      color: theme.text,
    },
    countBadge: {
      minWidth: 42,
      height: 42,
      paddingHorizontal: 10,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      backgroundColor: theme.primaryLight,
    },
    countText: {
      fontSize: 14,
      fontWeight: "900",
      color: theme.primary,
    },
    scrollContent: {
      paddingHorizontal: 18,
      paddingBottom: 40,
    },
    introCard: {
      marginTop: 8,
      padding: 17,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },
    introIcon: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: theme.primary,
    },
    introText: {
      flex: 1,
      marginLeft: 13,
    },
    introTitle: {
      fontSize: 15,
      fontWeight: "900",
      color: theme.text,
    },
    introDescription: {
      marginTop: 4,
      fontSize: 11,
      lineHeight: 17,
      color: theme.textSecondary,
    },
    submissionCard: {
      marginTop: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 24,
      backgroundColor: theme.card,
    },
    submissionImage: {
      width: "100%",
      height: 300,
      resizeMode: "cover",
      backgroundColor: theme.primaryLight,
    },
    submissionBody: {
      padding: 17,
    },
    flavorRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    flavorInfo: {
      flex: 1,
    },
    flavorName: {
      fontSize: 20,
      fontWeight: "900",
      color: theme.text,
    },
    brandName: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: "700",
      color: theme.textSecondary,
    },
    pendingBadge: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: theme.warning + "22",
    },
    pendingText: {
      fontSize: 10,
      fontWeight: "900",
      color: theme.warning,
    },
    detailRow: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    detailText: {
      flex: 1,
      fontSize: 12,
      color: theme.textSecondary,
    },
    notesCard: {
      marginTop: 14,
      padding: 13,
      borderRadius: 15,
      backgroundColor: theme.background,
    },
    notesLabel: {
      fontSize: 10,
      fontWeight: "900",
      color: theme.primary,
    },
    notesText: {
      marginTop: 5,
      fontSize: 12,
      lineHeight: 18,
      color: theme.textSecondary,
    },
    dateText: {
      marginTop: 14,
      fontSize: 10,
      color: theme.muted,
    },
    actionRow: {
      marginTop: 18,
      flexDirection: "row",
      gap: 10,
    },
    rejectButton: {
      flex: 1,
      height: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: theme.danger,
      borderRadius: 15,
    },
    rejectButtonText: {
      fontSize: 13,
      fontWeight: "900",
      color: theme.danger,
    },
    approveButton: {
      flex: 1.4,
      height: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      borderRadius: 15,
      backgroundColor: theme.primary,
    },
    approveButtonText: {
      fontSize: 13,
      fontWeight: "900",
      color: "#FFFFFF",
    },
    disabledButton: {
      opacity: 0.55,
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
    deniedIcon: {
      width: 66,
      height: 66,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 22,
      backgroundColor: theme.danger + "18",
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