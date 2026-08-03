import { supabase } from "@/lib/supabase"

export type CatalogSubmissionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "merged"

export type CatalogSubmissionStrength =
  | "light"
  | "medium"
  | "strong"

export type CatalogSubmissionImage = {
  uri: string
  mimeType?: string | null
  fileName?: string | null
}

export type CreateCatalogSubmissionInput = {
  existingBrandId?: string | null
  proposedBrandName?: string | null

  proposedFlavorName: string
  category: string
  strength?: CatalogSubmissionStrength | null
  isDarkLeaf: boolean
  description?: string | null

  brandImage?: CatalogSubmissionImage | null
  flavorImage?: CatalogSubmissionImage | null

  permissionConfirmed: boolean
}

export type CatalogSubmission = {
  id: string
  submittedBy: string

  existingBrandId: string | null
  existingBrandName: string | null
  proposedBrandName: string | null

  proposedFlavorName: string
  category: string
  strength: CatalogSubmissionStrength | null
  isDarkLeaf: boolean
  description: string | null

  brandImageUrl: string | null
  brandImageStoragePath: string | null

  flavorImageUrl: string | null
  flavorImageStoragePath: string | null

  permissionConfirmed: boolean
  status: CatalogSubmissionStatus

  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}

type CatalogSubmissionRow = {
  id: string
  submitted_by: string

  existing_brand_id: string | null
  proposed_brand_name: string | null
  proposed_flavor_name: string

  category: string
  strength: CatalogSubmissionStrength | null
  is_dark_leaf: boolean
  description: string | null

  brand_image_url: string | null
  brand_image_storage_path: string | null

  flavor_image_url: string | null
  flavor_image_storage_path: string | null

  permission_confirmed: boolean
  status: CatalogSubmissionStatus

  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string

  brands:
    | {
        name: string
      }
    | {
        name: string
      }[]
    | null
}

type UploadedImage = {
  publicUrl: string
  storagePath: string
}

const STORAGE_BUCKET = "catalog-submissions"

function mapCatalogSubmission(
  row: CatalogSubmissionRow
): CatalogSubmission {
  const existingBrandName = Array.isArray(row.brands)
    ? row.brands[0]?.name ?? null
    : row.brands?.name ?? null

  return {
    id: row.id,
    submittedBy: row.submitted_by,

    existingBrandId: row.existing_brand_id,
    existingBrandName,
    proposedBrandName: row.proposed_brand_name,

    proposedFlavorName: row.proposed_flavor_name,
    category: row.category,
    strength: row.strength,
    isDarkLeaf: row.is_dark_leaf,
    description: row.description,

    brandImageUrl: row.brand_image_url,
    brandImageStoragePath:
      row.brand_image_storage_path,

    flavorImageUrl: row.flavor_image_url,
    flavorImageStoragePath:
      row.flavor_image_storage_path,

    permissionConfirmed: row.permission_confirmed,
    status: row.status,

    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  }
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throw new Error(error.message)
  }

  const userId = data.user?.id

  if (!userId) {
    throw new Error(
      "You must be signed in to suggest a brand or flavor."
    )
  }

  return userId
}

function normalizeOptionalText(
  value?: string | null
): string | null {
  const normalized = value?.trim() ?? ""

  return normalized.length > 0
    ? normalized
    : null
}

function validateSubmission(
  input: CreateCatalogSubmissionInput
): void {
  const existingBrandId =
    normalizeOptionalText(input.existingBrandId)

  const proposedBrandName =
    normalizeOptionalText(input.proposedBrandName)

  if (!existingBrandId && !proposedBrandName) {
    throw new Error(
      "Choose an existing brand or enter a new brand name."
    )
  }

  if (!input.proposedFlavorName.trim()) {
    throw new Error("Enter the flavor name.")
  }

  if (!input.category.trim()) {
    throw new Error("Choose a flavor category.")
  }

  if (!input.permissionConfirmed) {
    throw new Error(
      "You must confirm that you have permission to submit the images."
    )
  }
}

function getFileExtension(
  image: CatalogSubmissionImage
): string {
  const fileNameExtension = image.fileName
    ?.split(".")
    .pop()
    ?.toLowerCase()

  if (
    fileNameExtension &&
    /^[a-z0-9]+$/.test(fileNameExtension)
  ) {
    return fileNameExtension
  }

  const uriWithoutQuery = image.uri.split("?")[0]

  const uriExtension = uriWithoutQuery
    .split(".")
    .pop()
    ?.toLowerCase()

  if (
    uriExtension &&
    /^[a-z0-9]+$/.test(uriExtension) &&
    uriExtension.length <= 5
  ) {
    return uriExtension
  }

  switch (image.mimeType?.toLowerCase()) {
    case "image/png":
      return "png"

    case "image/webp":
      return "webp"

    case "image/heic":
      return "heic"

    case "image/heif":
      return "heif"

    default:
      return "jpg"
  }
}

function getContentType(
  image: CatalogSubmissionImage,
  extension: string
): string {
  if (image.mimeType?.startsWith("image/")) {
    return image.mimeType
  }

  switch (extension) {
    case "png":
      return "image/png"

    case "webp":
      return "image/webp"

    case "heic":
      return "image/heic"

    case "heif":
      return "image/heif"

    default:
      return "image/jpeg"
  }
}

function createUniqueFileName(
  kind: "brand" | "flavor",
  extension: string
): string {
  const randomPart = Math.random()
    .toString(36)
    .slice(2, 10)

  return `${Date.now()}-${randomPart}-${kind}.${extension}`
}

async function uploadSubmissionImage(
  userId: string,
  kind: "brand" | "flavor",
  image: CatalogSubmissionImage
): Promise<UploadedImage> {
  const extension = getFileExtension(image)
  const contentType = getContentType(
    image,
    extension
  )

  const fileName = createUniqueFileName(
    kind,
    extension
  )

  const storagePath = `${userId}/${fileName}`

  const response = await fetch(image.uri)

  if (!response.ok) {
    throw new Error(
      `Could not read the ${kind} image from this device.`
    )
  }

  const fileData = await response.arrayBuffer()

  const { error: uploadError } =
    await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileData, {
        contentType,
        cacheControl: "3600",
        upsert: false,
      })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data: publicUrlData } =
    supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

  return {
    publicUrl: publicUrlData.publicUrl,
    storagePath,
  }
}

async function removeUploadedFiles(
  storagePaths: string[]
): Promise<void> {
  if (storagePaths.length === 0) {
    return
  }

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove(storagePaths)

  if (error) {
    console.error(
      "Could not clean up catalog submission images:",
      error
    )
  }
}

export async function createCatalogSubmission(
  input: CreateCatalogSubmissionInput
): Promise<CatalogSubmission> {
  validateSubmission(input)

  const userId = await getCurrentUserId()
  const uploadedPaths: string[] = []

  let brandUpload: UploadedImage | null = null
  let flavorUpload: UploadedImage | null = null

  try {
    if (input.brandImage) {
      brandUpload = await uploadSubmissionImage(
        userId,
        "brand",
        input.brandImage
      )

      uploadedPaths.push(
        brandUpload.storagePath
      )
    }

    if (input.flavorImage) {
      flavorUpload = await uploadSubmissionImage(
        userId,
        "flavor",
        input.flavorImage
      )

      uploadedPaths.push(
        flavorUpload.storagePath
      )
    }

    const existingBrandId =
      normalizeOptionalText(
        input.existingBrandId
      )

    const proposedBrandName =
      existingBrandId
        ? null
        : normalizeOptionalText(
            input.proposedBrandName
          )

    const { data, error } = await supabase
      .from("catalog_submissions")
      .insert({
        submitted_by: userId,

        existing_brand_id:
          existingBrandId,

        proposed_brand_name:
          proposedBrandName,

        proposed_flavor_name:
          input.proposedFlavorName.trim(),

        category:
          input.category.trim(),

        strength:
          input.strength ?? null,

        is_dark_leaf:
          input.isDarkLeaf,

        description:
          normalizeOptionalText(
            input.description
          ),

        brand_image_url:
          brandUpload?.publicUrl ?? null,

        brand_image_storage_path:
          brandUpload?.storagePath ?? null,

        flavor_image_url:
          flavorUpload?.publicUrl ?? null,

        flavor_image_storage_path:
          flavorUpload?.storagePath ?? null,

        permission_confirmed:
          input.permissionConfirmed,

        status: "pending",
      })
      .select(
        `
          id,
          submitted_by,
          existing_brand_id,
          proposed_brand_name,
          proposed_flavor_name,
          category,
          strength,
          is_dark_leaf,
          description,
          brand_image_url,
          brand_image_storage_path,
          flavor_image_url,
          flavor_image_storage_path,
          permission_confirmed,
          status,
          reviewed_by,
          reviewed_at,
          created_at,

          brands:existing_brand_id (
            name
          )
        `
      )
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return mapCatalogSubmission(
      data as unknown as CatalogSubmissionRow
    )
  } catch (error) {
    await removeUploadedFiles(
      uploadedPaths
    )

    throw error
  }
}

export async function fetchMyCatalogSubmissions(): Promise<
  CatalogSubmission[]
> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("catalog_submissions")
    .select(
      `
        id,
        submitted_by,
        existing_brand_id,
        proposed_brand_name,
        proposed_flavor_name,
        category,
        strength,
        is_dark_leaf,
        description,
        brand_image_url,
        brand_image_storage_path,
        flavor_image_url,
        flavor_image_storage_path,
        permission_confirmed,
        status,
        reviewed_by,
        reviewed_at,
        created_at,

        brands:existing_brand_id (
          name
        )
      `
    )
    .eq("submitted_by", userId)
    .order("created_at", {
      ascending: false,
    })

  if (error) {
    throw new Error(error.message)
  }

  return (
    (data ?? []) as unknown as CatalogSubmissionRow[]
  ).map(mapCatalogSubmission)
}

export async function deletePendingCatalogSubmission(
  submissionId: string
): Promise<void> {
  const userId = await getCurrentUserId()

  const {
    data: submission,
    error: fetchError,
  } = await supabase
    .from("catalog_submissions")
    .select(
      `
        id,
        brand_image_storage_path,
        flavor_image_storage_path
      `
    )
    .eq("id", submissionId)
    .eq("submitted_by", userId)
    .eq("status", "pending")
    .maybeSingle()

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  if (!submission) {
    throw new Error(
      "This pending submission could not be found."
    )
  }

  const storagePaths = [
    submission.brand_image_storage_path,
    submission.flavor_image_storage_path,
  ].filter(
    (path): path is string =>
      Boolean(path)
  )

  if (storagePaths.length > 0) {
    const { error: storageError } =
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(storagePaths)

    if (storageError) {
      throw new Error(
        storageError.message
      )
    }
  }

  const { error: deleteError } =
    await supabase
      .from("catalog_submissions")
      .delete()
      .eq("id", submissionId)
      .eq("submitted_by", userId)
      .eq("status", "pending")

  if (deleteError) {
    throw new Error(deleteError.message)
  }
}