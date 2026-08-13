import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Platform,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppTheme } from "@/constants/colors"
import { useAppTheme } from "@/context/AppThemeContext"
import {
  type AdminCatalogSubmission,
  approveCatalogSubmission,
  fetchPendingCatalogSubmissions,
  rejectCatalogSubmission,
} from "@/services/adminCatalogService"

export default function CatalogSubmissionsScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(
    () => getStyles(theme),
    [theme]
  )

  const [
  rejectingSubmission,
  setRejectingSubmission,
] = useState<AdminCatalogSubmission | null>(null)

  const [submissions, setSubmissions] =
    useState<AdminCatalogSubmission[]>([])

  const [selectedSubmission, setSelectedSubmission] =
    useState<AdminCatalogSubmission | null>(null)

  const [showRejectModal, setShowRejectModal] =
    useState(false)

  const [rejectReason, setRejectReason] =
    useState("")

  const [isLoading, setIsLoading] =
    useState(true)

  const [isRefreshing, setIsRefreshing] =
    useState(false)

  const [processingId, setProcessingId] =
    useState<string | null>(null)

  const loadSubmissions = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        const data =
          await fetchPendingCatalogSubmissions()

        setSubmissions(data)
      } catch (error) {
        console.error(
          "Could not load catalog submissions:",
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
    void loadSubmissions()
  }, [loadSubmissions])

  async function handleApprove(
  submission: AdminCatalogSubmission
) {
  if (processingId) {
    return
  }

  function confirmAction(
  title: string,
  message: string
): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(
      window.confirm(`${title}\n\n${message}`)
    )
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => resolve(false),
      },
      {
        text: "Confirm",
        onPress: () => resolve(true),
      },
    ])
  })
}

  const confirmed = await confirmAction(
    "Approve Submission",
    `Approve ${submission.proposedFlavorName} and add it to the KloudIt catalog?`
  )

  if (!confirmed) {
    return
  }

  setProcessingId(submission.id)

  try {
    await approveCatalogSubmission({
      submissionId: submission.id,
    })

    setSelectedSubmission(null)

    setSubmissions((current) =>
      current.filter(
        (item) => item.id !== submission.id
      )
    )

    if (Platform.OS === "web") {
      window.alert(
        "The brand and flavor are now available in KloudIt."
      )
    } else {
      Alert.alert(
        "Approved",
        "The brand and flavor are now available in KloudIt."
      )
    }
  } catch (error) {
    console.error(
      "Could not approve catalog submission:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong."

    if (Platform.OS === "web") {
      window.alert(message)
    } else {
      Alert.alert(
        "Could Not Approve",
        message
      )
    }
  } finally {
    setProcessingId(null)
  }
}

function openRejectModal(
  submission: AdminCatalogSubmission
) {
  console.log("OPENING REJECTION FOR:", {
    id: submission.id,
    flavor: submission.proposedFlavorName,
  })

  setRejectingSubmission(submission)
  setRejectReason("")
  setShowRejectModal(true)
}



  async function handleReject() {
  if (!rejectingSubmission || processingId) {
    return
  }

  if (!rejectReason.trim()) {
    const message =
      "Enter a reason so the user knows why the submission was rejected."

    if (Platform.OS === "web") {
      window.alert(message)
    } else {
      Alert.alert("Reason Required", message)
    }

    return
  }

  console.log("REJECTING SUBMISSION:", {
    id: rejectingSubmission.id,
    flavor:
      rejectingSubmission.proposedFlavorName,
  })

  setProcessingId(rejectingSubmission.id)

  try {
    await rejectCatalogSubmission({
      submissionId: rejectingSubmission.id,
      reason: rejectReason.trim(),
    })

    setSubmissions((current) =>
      current.filter(
        (item) =>
          item.id !== rejectingSubmission.id
      )
    )

    setShowRejectModal(false)
    setRejectingSubmission(null)
    setSelectedSubmission(null)
    setRejectReason("")

    const message =
      "The submission was rejected and the user was notified."

    if (Platform.OS === "web") {
      window.alert(message)
    } else {
      Alert.alert("Rejected", message)
    }
  } catch (error) {
    console.error(
      "Could not reject catalog submission:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong."

    if (Platform.OS === "web") {
      window.alert(message)
    } else {
      Alert.alert(
        "Could Not Reject",
        message
      )
    }
  } finally {
    setProcessingId(null)
  }
}

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View style={styles.loadingContainer}>
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

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={theme.text}
          />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            Catalog Approvals
          </Text>

          <Text style={styles.headerSubtitle}>
            {submissions.length} pending
          </Text>
        </View>

        <View style={styles.backButton} />
      </View>

      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          submissions.length === 0 &&
            styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() =>
              void loadSubmissions(true)
            }
            tintColor={theme.primary}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.submissionCard}
            activeOpacity={0.85}
            onPress={() =>
              setSelectedSubmission(item)
            }
          >
            {item.flavorImageUrl ? (
              <Image
                source={{
                  uri: item.flavorImageUrl,
                }}
                style={styles.submissionImage}
              />
            ) : (
              <View
                style={
                  styles.submissionImagePlaceholder
                }
              >
                <Ionicons
                  name="image-outline"
                  size={28}
                  color={theme.muted}
                />
              </View>
            )}

            <View
              style={
                styles.submissionContent
              }
            >
              <Text
                style={
                  styles.submissionFlavor
                }
                numberOfLines={1}
              >
                {item.proposedFlavorName}
              </Text>

              <Text
                style={
                  styles.submissionBrand
                }
                numberOfLines={1}
              >
                {item.existingBrandName ??
                  item.proposedBrandName ??
                  "Unknown brand"}
              </Text>

              <View
                style={
                  styles.submissionMetaRow
                }
              >
                <View
                  style={styles.metaBadge}
                >
                  <Text
                    style={
                      styles.metaBadgeText
                    }
                  >
                    {item.category}
                  </Text>
                </View>

                <View
                  style={styles.metaBadge}
                >
                  <Text
                    style={
                      styles.metaBadgeText
                    }
                  >
                    {item.isDarkLeaf
                      ? "Dark"
                      : "Blonde"}
                  </Text>
                </View>
              </View>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.muted}
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="checkmark-done-outline"
                size={34}
                color={theme.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              All caught up
            </Text>

            <Text style={styles.emptyText}>
              There are no pending brand or
              flavor submissions.
            </Text>
          </View>
        }
      />

      <SubmissionDetailsModal
        submission={selectedSubmission}
        processing={
          processingId ===
          selectedSubmission?.id
        }
        theme={theme}
        onClose={() =>
          setSelectedSubmission(null)
        }
        onApprove={handleApprove}
        onReject={openRejectModal}
      />

      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
  setShowRejectModal(false)
  setRejectingSubmission(null)
  setRejectReason("")
}}
      >
        <View style={styles.rejectBackdrop}>
          <View style={styles.rejectCard}>
            <Text style={styles.rejectTitle}>
              Reject Submission
            </Text>

            <Text style={styles.rejectText}>
              Add a reason so the user knows
              what needs to be corrected.
            </Text>

            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              style={styles.rejectInput}
              placeholder="Reason for rejection..."
              placeholderTextColor={
                theme.muted
              }
              multiline
              maxLength={300}
              textAlignVertical="top"
            />

            <View style={styles.rejectActions}>
              <TouchableOpacity
                style={
                  styles.rejectCancelButton
                }
                disabled={Boolean(processingId)}
                onPress={() => {
  setShowRejectModal(false)
  setRejectingSubmission(null)
  setRejectReason("")
}}
              >
                <Text
                  style={
                    styles.rejectCancelText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.rejectConfirmButton
                }
                disabled={Boolean(processingId)}
                onPress={() =>
                  void handleReject()
                }
              >
                <Text
                  style={
                    styles.rejectConfirmText
                  }
                >
                  {processingId
                    ? "Rejecting..."
                    : "Reject"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

type SubmissionDetailsModalProps = {
  submission:
    | AdminCatalogSubmission
    | null
  processing: boolean
  theme: AppTheme
  onClose: () => void
  onApprove: (
    submission: AdminCatalogSubmission
  ) => void
  onReject: (
    submission: AdminCatalogSubmission
  ) => void
}

function SubmissionDetailsModal({
  submission,
  processing,
  theme,
  onClose,
  onApprove,
  onReject,
}: SubmissionDetailsModalProps) {
  const styles = useMemo(
    () => getStyles(theme),
    [theme]
  )

  return (
    <Modal
      visible={Boolean(submission)}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {submission ? (
        <SafeAreaView
          style={styles.safeArea}
          edges={["top", "bottom"]}
        >
          <View style={styles.detailHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onClose}
              disabled={processing}
            >
              <Ionicons
                name="close"
                size={23}
                color={theme.text}
              />
            </TouchableOpacity>

            <Text style={styles.detailTitle}>
              Review Submission
            </Text>

            <View style={styles.backButton} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.detailContent
            }
          >
            {submission.flavorImageUrl ? (
              <Image
                source={{
                  uri:
                    submission.flavorImageUrl,
                }}
                style={styles.detailImage}
              />
            ) : (
              <View
                style={
                  styles.detailImagePlaceholder
                }
              >
                <Ionicons
                  name="image-outline"
                  size={44}
                  color={theme.muted}
                />

                <Text
                  style={
                    styles.detailImagePlaceholderText
                  }
                >
                  No flavor image submitted
                </Text>
              </View>
            )}

            <View style={styles.detailCard}>
              <DetailRow
                label="Brand"
                value={
                  submission.existingBrandName ??
                  submission.proposedBrandName ??
                  "Unknown"
                }
                theme={theme}
              />

              <DetailRow
                label="Brand status"
                value={
                  submission.existingBrandId
                    ? "Existing brand"
                    : "New brand"
                }
                theme={theme}
              />

              <DetailRow
                label="Flavor"
                value={
                  submission.proposedFlavorName
                }
                theme={theme}
              />

              <DetailRow
                label="Category"
                value={submission.category}
                theme={theme}
              />

              <DetailRow
                label="Strength"
                value={
                  submission.strength ??
                  "Not selected"
                }
                theme={theme}
              />

              <DetailRow
                label="Leaf"
                value={
                  submission.isDarkLeaf
                    ? "Dark leaf"
                    : "Blonde leaf"
                }
                theme={theme}
              />

              <DetailRow
                label="Description"
                value={
                  submission.description ??
                  "No description"
                }
                theme={theme}
              />

              <DetailRow
                label="Submitted by"
                value={
                  submission.submitterName
                }
                theme={theme}
              />

              <DetailRow
                label="Permission confirmed"
                value={
                  submission.permissionConfirmed
                    ? "Yes"
                    : "No"
                }
                theme={theme}
                last
              />
            </View>

            <View style={styles.detailActions}>
              <TouchableOpacity
                style={styles.rejectButton}
                disabled={processing}
                onPress={() =>
                  onReject(submission)
                }
              >
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={theme.danger}
                />

                <Text
                  style={
                    styles.rejectButtonText
                  }
                >
                  Reject
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.approveButton}
                disabled={processing}
                onPress={() =>
                  onApprove(submission)
                }
              >
                <Ionicons
                  name={
                    processing
                      ? "hourglass-outline"
                      : "checkmark-circle-outline"
                  }
                  size={20}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.approveButtonText
                  }
                >
                  {processing
                    ? "Approving..."
                    : "Approve"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      ) : null}
    </Modal>
  )
}

type DetailRowProps = {
  label: string
  value: string
  theme: AppTheme
  last?: boolean
}

function DetailRow({
  label,
  value,
  theme,
  last = false,
}: DetailRowProps) {
  const styles = useMemo(
    () => getStyles(theme),
    [theme]
  )

  return (
    <View
      style={[
        styles.detailRow,
        last && styles.detailRowLast,
      ]}
    >
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
        {value}
      </Text>
    </View>
  )
}

function getStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },

    header: {
      minHeight: 72,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.card,
    },

    backButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },

    headerContent: {
      flex: 1,
      alignItems: "center",
    },

    headerTitle: {
      fontSize: 18,
      fontWeight: "900",
      color: theme.text,
    },

    headerSubtitle: {
      marginTop: 2,
      fontSize: 11,
      color: theme.textSecondary,
    },

    listContent: {
      padding: 16,
      paddingBottom: 40,
      gap: 12,
    },

    emptyListContent: {
      flexGrow: 1,
    },

    submissionCard: {
      minHeight: 102,
      padding: 11,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      backgroundColor: theme.card,
    },

    submissionImage: {
      width: 78,
      height: 78,
      borderRadius: 14,
      backgroundColor: theme.surface,
    },

    submissionImagePlaceholder: {
      width: 78,
      height: 78,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.surface,
    },

    submissionContent: {
      flex: 1,
      marginLeft: 12,
    },

    submissionFlavor: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.text,
    },

    submissionBrand: {
      marginTop: 3,
      fontSize: 12,
      color: theme.textSecondary,
    },

    submissionMetaRow: {
      marginTop: 10,
      flexDirection: "row",
      gap: 6,
    },

    metaBadge: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: theme.primaryLight,
    },

    metaBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.primaryDark,
    },

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 13,
      color: theme.textSecondary,
    },

    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
    },

    emptyIcon: {
      width: 70,
      height: 70,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 24,
      backgroundColor: theme.primaryLight,
    },

    emptyTitle: {
      marginTop: 16,
      fontSize: 19,
      fontWeight: "800",
      color: theme.text,
    },

    emptyText: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
      color: theme.textSecondary,
    },

    detailHeader: {
      minHeight: 72,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.card,
    },

    detailTitle: {
      fontSize: 17,
      fontWeight: "900",
      color: theme.text,
    },

    detailContent: {
      padding: 18,
      paddingBottom: 45,
    },

    detailImage: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: 22,
      backgroundColor: theme.surface,
    },

    detailImagePlaceholder: {
      width: "100%",
      aspectRatio: 1.4,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      backgroundColor: theme.card,
    },

    detailImagePlaceholderText: {
      marginTop: 9,
      fontSize: 12,
      color: theme.textSecondary,
    },

    detailCard: {
      marginTop: 18,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      backgroundColor: theme.card,
    },

    detailRow: {
      paddingHorizontal: 15,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },

    detailRowLast: {
      borderBottomWidth: 0,
    },

    detailLabel: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color: theme.muted,
    },

    detailValue: {
      marginTop: 5,
      fontSize: 14,
      lineHeight: 20,
      color: theme.text,
    },

    detailActions: {
      marginTop: 20,
      flexDirection: "row",
      gap: 10,
    },

    rejectButton: {
      flex: 1,
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: theme.danger,
      borderRadius: 16,
      backgroundColor: theme.card,
    },

    rejectButtonText: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.danger,
    },

    approveButton: {
      flex: 1,
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      borderRadius: 16,
      backgroundColor: theme.primary,
    },

    approveButtonText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    rejectBackdrop: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      backgroundColor: "rgba(0,0,0,0.45)",
    },

    rejectCard: {
      width: "100%",
      maxWidth: 420,
      padding: 20,
      borderRadius: 22,
      backgroundColor: theme.card,
    },

    rejectTitle: {
      fontSize: 19,
      fontWeight: "900",
      color: theme.text,
    },

    rejectText: {
      marginTop: 7,
      fontSize: 12,
      lineHeight: 18,
      color: theme.textSecondary,
    },

    rejectInput: {
      minHeight: 110,
      marginTop: 16,
      padding: 13,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.surface,
      fontSize: 14,
      color: theme.text,
    },

    rejectActions: {
      marginTop: 18,
      flexDirection: "row",
      gap: 10,
    },

    rejectCancelButton: {
      flex: 1,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
    },

    rejectCancelText: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.text,
    },

    rejectConfirmButton: {
      flex: 1,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.danger,
    },

    rejectConfirmText: {
      fontSize: 13,
      fontWeight: "800",
      color: "#FFFFFF",
    },
  })
}