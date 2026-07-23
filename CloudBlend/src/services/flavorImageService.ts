import * as ImagePicker from "expo-image-picker"

import { supabase } from "@/lib/supabase"

import type {
  FlavorImageSubmission,
  SubmitFlavorImageInput,
} from "@/types/flavor"

type FlavorImageSubmissionRow = {
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
}

function mapFlavorImageSubmission(
  row: FlavorImageSubmissionRow
): FlavorImageSubmission {
  return {
    id: row.id,
    flavorId: row.flavor_id,
    submittedBy: row.submitted_by,
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

export async function chooseFlavorImage() {
  const permission =
    await ImagePicker.requestMediaLibraryPermissionsAsync()

  if (!permission.granted) {
    throw new Error(
      "Photo library permission is required to submit a photo."
    )
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  })

  if (result.canceled || !result.assets[0]) {
    return null
  }

  return result.assets[0]
}

export async function fetchApprovedFlavorImages(
  flavorId: string
): Promise<FlavorImageSubmission[]> {
  const { data, error } = await supabase
    .from("flavor_image_submissions")
    .select(`
      id,
      flavor_id,
      submitted_by,
      image_url,
      storage_path,
      credit_name,
      notes,
      status,
      permission_confirmed,
      is_primary,
      reviewed_by,
      reviewed_at,
      created_at
    `)
    .eq("flavor_id", flavorId)
    .eq("status", "approved")
    .order("is_primary", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) =>
    mapFlavorImageSubmission(
      row as FlavorImageSubmissionRow
    )
  )
}

export async function fetchUserFlavorImageSubmissions(
  userId: string,
  flavorId?: string
): Promise<FlavorImageSubmission[]> {
  let query = supabase
    .from("flavor_image_submissions")
    .select(`
      id,
      flavor_id,
      submitted_by,
      image_url,
      storage_path,
      credit_name,
      notes,
      status,
      permission_confirmed,
      is_primary,
      reviewed_by,
      reviewed_at,
      created_at
    `)
    .eq("submitted_by", userId)
    .order("created_at", {
      ascending: false,
    })

  if (flavorId) {
    query = query.eq("flavor_id", flavorId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []).map((row) =>
    mapFlavorImageSubmission(
      row as FlavorImageSubmissionRow
    )
  )
}

export async function submitFlavorImage(
  input: SubmitFlavorImageInput,
  userId: string
): Promise<FlavorImageSubmission> {
  if (!input.permissionConfirmed) {
    throw new Error(
      "You must confirm that you own the photo or have permission to submit it."
    )
  }

  const fileExtension =
    input.imageUri
      .split(".")
      .pop()
      ?.split("?")[0]
      ?.toLowerCase() || "jpg"

  const normalizedExtension = [
    "jpg",
    "jpeg",
    "png",
    "webp",
    "heic",
  ].includes(fileExtension)
    ? fileExtension
    : "jpg"

  const fileName = `photo-${Date.now()}.${normalizedExtension}`

  const storagePath = [
    userId,
    input.flavorId,
    fileName,
  ].join("/")

  const response = await fetch(input.imageUri)

  if (!response.ok) {
    throw new Error("Could not read the selected photo.")
  }

  const arrayBuffer = await response.arrayBuffer()

  const contentType =
    normalizedExtension === "png"
      ? "image/png"
      : normalizedExtension === "webp"
        ? "image/webp"
        : normalizedExtension === "heic"
          ? "image/heic"
          : "image/jpeg"

  const { error: uploadError } = await supabase.storage
    .from("flavor-submissions")
    .upload(storagePath, arrayBuffer, {
      contentType,
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data: publicUrlData } = supabase.storage
    .from("flavor-submissions")
    .getPublicUrl(storagePath)

  const { data, error: submissionError } = await supabase
    .from("flavor_image_submissions")
    .insert({
      flavor_id: input.flavorId,
      submitted_by: userId,
      image_url: publicUrlData.publicUrl,
      storage_path: storagePath,
      credit_name: input.creditName?.trim() || null,
      notes: input.notes?.trim() || null,
      permission_confirmed: true,
      status: "pending",
      is_primary: false,
    })
    .select(`
      id,
      flavor_id,
      submitted_by,
      image_url,
      storage_path,
      credit_name,
      notes,
      status,
      permission_confirmed,
      is_primary,
      reviewed_by,
      reviewed_at,
      created_at
    `)
    .single()

  if (submissionError) {
    await supabase.storage
      .from("flavor-submissions")
      .remove([storagePath])

    throw submissionError
  }

  return mapFlavorImageSubmission(
    data as FlavorImageSubmissionRow
  )
}