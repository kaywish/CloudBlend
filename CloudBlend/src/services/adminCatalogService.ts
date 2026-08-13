import { supabase } from "@/lib/supabase"
import { createNotification } from "@/services/notificationService"

export type AdminCatalogSubmission = {
  id: string
  submittedBy: string

  existingBrandId: string | null
  existingBrandName: string | null
  proposedBrandName: string | null

  proposedFlavorName: string
  category: string
  strength: "light" | "medium" | "strong" | null
  isDarkLeaf: boolean
  description: string | null

  flavorImageUrl: string | null
  flavorImageStoragePath: string | null

  permissionConfirmed: boolean
  status: "pending" | "approved" | "rejected" | "merged"

  submitterName: string
  submitterAvatarUrl: string | null

  createdAt: string
}

type SubmissionRow = {
  id: string
  submitted_by: string

  existing_brand_id: string | null
  proposed_brand_name: string | null
  proposed_flavor_name: string

  category: string
  strength: "light" | "medium" | "strong" | null
  is_dark_leaf: boolean
  description: string | null

  flavor_image_url: string | null
  flavor_image_storage_path: string | null

  permission_confirmed: boolean
  status: "pending" | "approved" | "rejected" | "merged"

  created_at: string

  brands:
    | {
        id: string
        name: string
      }
    | {
        id: string
        name: string
      }[]
    | null

  profiles:
    | {
        username: string | null
        display_name: string | null
        avatar_url: string | null
      }
    | {
        username: string | null
        display_name: string | null
        avatar_url: string | null
      }[]
    | null
}

type ApproveCatalogSubmissionInput = {
  submissionId: string
  overrideBrandName?: string
  overrideFlavorName?: string
  overrideCategory?: string
  overrideStrength?: "light" | "medium" | "strong" | null
  overrideIsDarkLeaf?: boolean
  overrideDescription?: string | null
}

type RejectCatalogSubmissionInput = {
  submissionId: string
  reason?: string
}

type MergeCatalogSubmissionInput = {
  submissionId: string
  existingFlavorId: string
}

function getSingleRelation<T>(
  relation: T | T[] | null
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null
  }

  return relation
}

function mapSubmission(
  row: SubmissionRow
): AdminCatalogSubmission {
  const brand = getSingleRelation(row.brands)
  const profile = getSingleRelation(row.profiles)

  return {
    id: row.id,
    submittedBy: row.submitted_by,

    existingBrandId: row.existing_brand_id,
    existingBrandName: brand?.name ?? null,
    proposedBrandName: row.proposed_brand_name,

    proposedFlavorName: row.proposed_flavor_name,
    category: row.category,
    strength: row.strength,
    isDarkLeaf: row.is_dark_leaf,
    description: row.description,

    flavorImageUrl: row.flavor_image_url,
    flavorImageStoragePath:
      row.flavor_image_storage_path,

    permissionConfirmed:
      row.permission_confirmed,

    status: row.status,

    submitterName:
      profile?.display_name ??
      profile?.username ??
      "KloudIt user",

    submitterAvatarUrl:
      profile?.avatar_url ?? null,

    createdAt: row.created_at,
  }
}

async function getCurrentAdminId(): Promise<string> {
  const { data, error } =
    await supabase.auth.getUser()

  if (error) {
    throw new Error(error.message)
  }

  const adminId = data.user?.id

  if (!adminId) {
    throw new Error("You must be signed in.")
  }

  const { data: isAdmin, error: adminError } =
    await supabase.rpc("is_admin")

  if (adminError) {
    throw new Error(adminError.message)
  }

  if (isAdmin !== true) {
    throw new Error(
      "You do not have permission to review catalog submissions."
    )
  }

  return adminId
}

async function fetchSubmissionById(
  submissionId: string
): Promise<AdminCatalogSubmission> {
    console.log(
  "FETCHING CATALOG SUBMISSION:",
  submissionId
)
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
        flavor_image_url,
        flavor_image_storage_path,
        permission_confirmed,
        status,
        created_at,

        brands:existing_brand_id (
          id,
          name
        ),

        profiles!catalog_submissions_submitted_by_profiles_fkey (
          username,
          display_name,
          avatar_url
        )
      `
    )
    .eq("id", submissionId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error(
      "Catalog submission was not found."
    )
  }

  return mapSubmission(
    data as unknown as SubmissionRow
  )
}

export async function fetchPendingCatalogSubmissions(): Promise<
  AdminCatalogSubmission[]
> {
  await getCurrentAdminId()

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
        flavor_image_url,
        flavor_image_storage_path,
        permission_confirmed,
        status,
        created_at,

        brands:existing_brand_id (
          id,
          name
        ),

        profiles!catalog_submissions_submitted_by_profiles_fkey (
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

  return (
    (data ?? []) as unknown as SubmissionRow[]
  ).map(mapSubmission)
}

export async function approveCatalogSubmission({
  submissionId,
  overrideBrandName,
  overrideFlavorName,
  overrideCategory,
  overrideStrength,
  overrideIsDarkLeaf,
  overrideDescription,
}: ApproveCatalogSubmissionInput): Promise<void> {
  const adminId = await getCurrentAdminId()

  const submission =
    await fetchSubmissionById(submissionId)

  if (submission.status !== "pending") {
    throw new Error(
      "This submission is no longer pending."
    )
  }

  let brandId = submission.existingBrandId

  if (!brandId) {
    const brandName =
      overrideBrandName?.trim() ||
      submission.proposedBrandName?.trim()

    if (!brandName) {
      throw new Error(
        "A brand name is required."
      )
    }

    const brandSlug = brandName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

    const { data: existingBrand, error: existingBrandError } =
      await supabase
        .from("brands")
        .select("id")
        .eq("slug", brandSlug)
        .maybeSingle()

    if (existingBrandError) {
      throw new Error(
        existingBrandError.message
      )
    }

    if (existingBrand) {
      brandId = existingBrand.id
    } else {
      const { data: createdBrand, error: brandError } =
        await supabase
          .from("brands")
          .insert({
            name: brandName,
            slug: brandSlug,
            is_active: true,
          })
          .select("id")
          .single()

      if (brandError) {
        throw new Error(brandError.message)
      }

      brandId = createdBrand.id
    }
  }

  const flavorName =
    overrideFlavorName?.trim() ||
    submission.proposedFlavorName.trim()

  const flavorSlug = flavorName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  const category =
    overrideCategory?.trim() ||
    submission.category

  const strength =
    overrideStrength !== undefined
      ? overrideStrength
      : submission.strength

  const isDarkLeaf =
    overrideIsDarkLeaf !== undefined
      ? overrideIsDarkLeaf
      : submission.isDarkLeaf

  const description =
    overrideDescription !== undefined
      ? overrideDescription?.trim() || null
      : submission.description

  const { data: existingFlavor, error: existingFlavorError } =
  await supabase
    .from("flavors")
    .select(`
      id,
      name
    `)
    .eq("brand_id", brandId)
    .ilike("name", flavorName)
    .maybeSingle()

  if (existingFlavorError) {
    throw new Error(
      existingFlavorError.message
    )
  }

  let flavorId: string

  if (existingFlavor) {
  throw new Error(
    `${existingFlavor.name} already exists under this brand. Use Merge instead of Approve.`
  )
}else {
    const { data: createdFlavor, error: flavorError } =
      await supabase
        .from("flavors")
        .insert({
          brand_id: brandId,
          name: flavorName,
          slug: flavorSlug,
          description,
          category,
          strength,
          is_dark_leaf: isDarkLeaf,
          image_url:
            submission.flavorImageUrl,
          is_active: true,
        })
        .select("id")
        .single()

    if (flavorError) {
      throw new Error(flavorError.message)
    }

    flavorId = createdFlavor.id
  }

  await createNotification({
    userId: submission.submittedBy,
    type: "catalog_submission_approved",
    title: "Brand & Flavor Approved",
    message: `${flavorName} was approved and is now available in KloudIt.`,
    data: {
      flavorId,
      brandId,
      submissionId,
    },
  })

  const { error: logError } = await supabase
    .from("catalog_moderation_logs")
    .insert({
      submission_id: submission.id,
      submitted_by: submission.submittedBy,
      reviewed_by: adminId,
      decision: "approved",
      official_brand_id: brandId,
      official_flavor_id: flavorId,
      proposed_brand_name:
        submission.proposedBrandName,
      proposed_flavor_name:
        submission.proposedFlavorName,
      reviewed_at: new Date().toISOString(),
    })

  if (logError) {
    throw new Error(logError.message)
  }

  const { error: deleteError } = await supabase
    .from("catalog_submissions")
    .delete()
    .eq("id", submission.id)

  if (deleteError) {
    throw new Error(deleteError.message)
  }
}

export async function rejectCatalogSubmission({
  submissionId,
  reason,
}: RejectCatalogSubmissionInput): Promise<void> {
  const adminId = await getCurrentAdminId()
console.log(
  "SERVICE REJECT SUBMISSION ID:",
  submissionId
)
  const submission =
    await fetchSubmissionById(submissionId)

  if (submission.status !== "pending") {
    throw new Error(
      "This submission is no longer pending."
    )
  }

  await createNotification({
    userId: submission.submittedBy,
    type: "catalog_submission_rejected",
    title: "Catalog Submission Not Approved",
    message:
      reason?.trim() ||
      `Your submission for ${submission.proposedFlavorName} was not approved.`,
    data: {
      submissionId,
    },
  })

  const { error: logError } = await supabase
    .from("catalog_moderation_logs")
    .insert({
      submission_id: submission.id,
      submitted_by: submission.submittedBy,
      reviewed_by: adminId,
      decision: "rejected",
      reason: reason?.trim() || null,
      proposed_brand_name:
        submission.proposedBrandName,
      proposed_flavor_name:
        submission.proposedFlavorName,
      reviewed_at: new Date().toISOString(),
    })

  if (logError) {
    throw new Error(logError.message)
  }

  if (submission.flavorImageStoragePath) {
    const { error: storageError } =
      await supabase.storage
        .from("catalog-submissions")
        .remove([
          submission.flavorImageStoragePath,
        ])

    if (storageError) {
      throw new Error(
        storageError.message
      )
    }
  }

  const { error: deleteError } = await supabase
    .from("catalog_submissions")
    .delete()
    .eq("id", submission.id)

  if (deleteError) {
    throw new Error(deleteError.message)
  }
}

export async function mergeCatalogSubmission({
  submissionId,
  existingFlavorId,
}: MergeCatalogSubmissionInput): Promise<void> {
  const adminId = await getCurrentAdminId()

  const submission =
    await fetchSubmissionById(submissionId)

  if (submission.status !== "pending") {
    throw new Error(
      "This submission is no longer pending."
    )
  }

  const { data: flavor, error: flavorError } =
    await supabase
      .from("flavor_statistics")
      .select(
        `
          id,
          name,
          brand_id
        `
      )
      .eq("id", existingFlavorId)
      .maybeSingle()

  if (flavorError) {
    throw new Error(flavorError.message)
  }

  if (!flavor) {
    throw new Error(
      "The selected flavor could not be found."
    )
  }

  await createNotification({
    userId: submission.submittedBy,
    type: "catalog_submission_merged",
    title: "Submission Matched Existing Flavor",
    message: `Your submission matched the existing flavor ${flavor.name}.`,
    data: {
      flavorId: flavor.id,
      submissionId,
    },
  })

  const { error: logError } = await supabase
    .from("catalog_moderation_logs")
    .insert({
      submission_id: submission.id,
      submitted_by: submission.submittedBy,
      reviewed_by: adminId,
      decision: "merged",
      official_brand_id: flavor.brand_id,
      official_flavor_id: flavor.id,
      proposed_brand_name:
        submission.proposedBrandName,
      proposed_flavor_name:
        submission.proposedFlavorName,
      reviewed_at: new Date().toISOString(),
    })

  if (logError) {
    throw new Error(logError.message)
  }

  if (submission.flavorImageStoragePath) {
    const { error: storageError } =
      await supabase.storage
        .from("catalog-submissions")
        .remove([
          submission.flavorImageStoragePath,
        ])

    if (storageError) {
      throw new Error(
        storageError.message
      )
    }
  }

  const { error: deleteError } = await supabase
    .from("catalog_submissions")
    .delete()
    .eq("id", submission.id)

  if (deleteError) {
    throw new Error(deleteError.message)
  }
}