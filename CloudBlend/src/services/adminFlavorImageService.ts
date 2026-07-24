import { supabase } from "@/lib/supabase"
import { createNotification } from "@/services/notificationService"

import type {
  AdminFlavorImageSubmission,
} from "@/types/flavor"

type SubmissionProfileRow = {
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

type SubmissionRow = {
  id: string
  flavor_id: string
  submitted_by: string
  image_url: string
  storage_path: string
  credit_name: string | null
  notes: string | null
  status: "pending" | "approved" | "rejected"
  permission_confirmed: boolean
  is_primary: boolean
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string

  flavors:
    | {
        id: string
        name: string
        brands:
          | {
              name: string
            }
          | null
      }
    | null

  profiles: SubmissionProfileRow | null
}

type ApproveFlavorImageInput = {
  submissionId: string
  flavorId: string
  flavorName: string
  submittedBy: string
  imageUrl: string
  makePrimary: boolean
  creditName?: string | null
  submitterName?: string | null
}

type RejectFlavorImageInput = {
  submissionId: string
  reason?: string
}

function mapSubmission(
  row: SubmissionRow
): AdminFlavorImageSubmission {
  const submitterName =
    row.profiles?.display_name ??
    row.profiles?.username ??
    "CloudBlend user"

  return {
    id: row.id,

    flavorId: row.flavor_id,
    flavorName: row.flavors?.name ?? "Unknown flavor",
    brandName: row.flavors?.brands?.name ?? null,

    submittedBy: row.submitted_by,
    submitterName,

    submitterUsername: row.profiles?.username ?? null,
    submitterDisplayName:
      row.profiles?.display_name ?? null,
    submitterAvatarUrl:
      row.profiles?.avatar_url ?? null,

    imageUrl: row.image_url,
    storagePath: row.storage_path,

    creditName: row.credit_name,
    notes: row.notes,

    status: row.status,
    permissionConfirmed: row.permission_confirmed,
    isPrimary: row.is_primary,

    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  }
}

async function getCurrentAdminId(): Promise<string> {
  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  const adminId = userData.user?.id

  if (!adminId) {
    throw new Error("You must be signed in.")
  }

  const isAdmin = await checkIsAdmin()

  if (!isAdmin) {
    throw new Error(
      "You do not have permission to review photo submissions."
    )
  }

  return adminId
}

export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin")

  if (error) {
    throw new Error(error.message)
  }

  return data === true
}

export async function fetchPendingFlavorImages(): Promise<
  AdminFlavorImageSubmission[]
> {
  const { data, error } = await supabase
    .from("flavor_image_submissions")
    .select(
      `
        id,
        flavor_id,
        submitted_by,
        image_url,
        storage_path,
        credit_name,
        notes,
        permission_confirmed,
        status,
        is_primary,
        reviewed_by,
        reviewed_at,
        created_at,

        flavors (
          id,
          name,
          brands (
            name
          )
        ),

        profiles!flavor_image_submissions_submitted_by_profiles_fkey (
          username,
          display_name,
          avatar_url
        )
      `
    )
    .eq("status", "pending")
    .order("created_at", {
      ascending: true,
    })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as unknown as SubmissionRow[]).map(
    mapSubmission
  )
}

export async function approveFlavorImage({
  submissionId,
  flavorId,
  flavorName,
  submittedBy,
  imageUrl,
  makePrimary,
  creditName,
  submitterName,
}: ApproveFlavorImageInput): Promise<void> {
  const adminId = await getCurrentAdminId()
  const reviewedAt = new Date().toISOString()

  if (makePrimary) {
    const { error: clearPrimaryError } = await supabase
      .from("flavor_image_submissions")
      .update({
        is_primary: false,
      })
      .eq("flavor_id", flavorId)
      .eq("status", "approved")
      .eq("is_primary", true)

    if (clearPrimaryError) {
      throw new Error(clearPrimaryError.message)
    }
  }

  const {
    data: updatedSubmission,
    error: approvalError,
  } = await supabase
    .from("flavor_image_submissions")
    .update({
      status: "approved",
      is_primary: makePrimary,
      reviewed_by: adminId,
      reviewed_at: reviewedAt,
    })
    .eq("id", submissionId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle()

  if (approvalError) {
    throw new Error(approvalError.message)
  }

  if (!updatedSubmission) {
    throw new Error(
      "This submission is no longer pending or could not be found."
    )
  }

  if (makePrimary) {
    const { error: flavorError } = await supabase
      .from("flavors")
      .update({
        image_url: imageUrl,
        image_source: "community",
        image_credit:
          creditName?.trim() ||
          submitterName?.trim() ||
          null,
        image_license: "community-submission",
        image_approved: true,
      })
      .eq("id", flavorId)

    if (flavorError) {
      throw new Error(flavorError.message)
    }
  }

  await createNotification({
    userId: submittedBy,
    title: makePrimary
      ? "Photo Selected as Main Image"
      : "Photo Approved",
    message: makePrimary
      ? `Your photo of ${flavorName} was approved and selected as the main image.`
      : `Your photo of ${flavorName} was approved and added to the community gallery.`,
    type: "photo-approved",
    data: {
      flavorId,
      submissionId,
      makePrimary,
    },
  })
}

export async function rejectFlavorImage({
  submissionId,
  reason,
}: RejectFlavorImageInput): Promise<void> {
  await getCurrentAdminId()

  const {
    data: submission,
    error: fetchError,
  } = await supabase
    .from("flavor_image_submissions")
    .select(
      `
        id,
        submitted_by,
        storage_path,
        flavors (
          name
        )
      `
    )
    .eq("id", submissionId)
    .eq("status", "pending")
    .maybeSingle()

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  if (!submission) {
    throw new Error(
      "Photo submission was not found or is no longer pending."
    )
  }

  const flavorRelation = submission.flavors as
    | {
        name: string
      }
    | {
        name: string
      }[]
    | null

  const flavorName = Array.isArray(flavorRelation)
    ? flavorRelation[0]?.name ?? "this flavor"
    : flavorRelation?.name ?? "this flavor"

  /*
   * Create the notification before deleting the submission.
   * The notification does not depend on the submission row afterward.
   */
  await createNotification({
    userId: submission.submitted_by,
    title: "Photo Not Approved",
    message:
      reason?.trim() ||
      `Your photo of ${flavorName} was not approved. Please make sure the photo is clear, shows the correct product, and that you have permission to upload it.`,
    type: "photo-rejected",
    data: {
      flavorName,
    },
  })

  if (submission.storage_path) {
    const { error: storageError } = await supabase.storage
      .from("flavor-submissions")
      .remove([submission.storage_path])

    if (storageError) {
      throw new Error(
        `The notification was created, but the image could not be removed: ${storageError.message}`
      )
    }
  }

  const { error: deleteError } = await supabase
    .from("flavor_image_submissions")
    .delete()
    .eq("id", submissionId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }
}