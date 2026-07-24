import { supabase } from "@/lib/supabase"

import type {
  Brand,
  BrandStatistics,
  CreateFlavorRatingInput,
  Flavor,
  FlavorRating,
} from "@/types/flavor"

type BrandRow = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  website: string | null
  country: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

type BrandStatisticsRow = BrandRow & {
  flavor_count: number | string | null
  average_rating: number | string | null
  rating_count: number | string | null
}

type FlavorStatisticsRow = {
  id: string
  brand_id: string
  brand_name: string
  brand_slug: string | null
  brand_logo_url: string | null

  name: string
  slug: string
  description: string | null
  image_url: string | null
  category: string | null
  strength: "light" | "medium" | "strong" | null
  is_dark_leaf: boolean

  average_rating: number | string | null
  rating_count: number | string | null
  favorite_count: number | string | null
  public_mix_count: number | string | null
}

type FlavorRatingRow = {
  id: string
  flavor_id: string
  user_id: string
  rating: number | string
  review: string | null
  created_at: string
  updated_at: string

  profiles:
    | {
        username: string | null
        display_name: string | null
        avatar_url: string | null
      }
    | null
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

function mapBrandRow(row: BrandRow): Brand {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
    website: row.website,
    country: row.country,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapBrandStatisticsRow(
  row: BrandStatisticsRow
): BrandStatistics {
  return {
    ...mapBrandRow(row),
    flavorCount: toNumber(row.flavor_count),
    averageRating: toNumber(row.average_rating),
    ratingCount: toNumber(row.rating_count),
  }
}

function mapFlavorStatisticsRow(
  row: FlavorStatisticsRow
): Flavor {
  return {
    id: row.id,
    brandId: row.brand_id,
    brandName: row.brand_name,
    brandSlug: row.brand_slug,
    brandLogoUrl: row.brand_logo_url,

    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_url,
    category: row.category,
    strength: row.strength,
    isDarkLeaf: row.is_dark_leaf,
    isActive: true,

    averageRating: toNumber(row.average_rating),
    ratingCount: toNumber(row.rating_count),
    favoriteCount: toNumber(row.favorite_count),
    publicMixCount: toNumber(row.public_mix_count),
  }
}

function mapFlavorRatingRow(
  row: FlavorRatingRow
): FlavorRating {
  return {
    id: row.id,
    flavorId: row.flavor_id,
    userId: row.user_id,
    rating: toNumber(row.rating),
    review: row.review,
    username: row.profiles?.username ?? null,
    displayName: row.profiles?.display_name ?? null,
    avatarUrl: row.profiles?.avatar_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchBrands(): Promise<Brand[]> {
  const { data, error } = await supabase
    .from("brands")
    .select(
      `
        id,
        name,
        slug,
        logo_url,
        website,
        country,
        is_active,
        created_at,
        updated_at
      `
    )
    .eq("is_active", true)
    .order("name", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as BrandRow[]).map(mapBrandRow)
}

export async function fetchBrandStatistics(): Promise<
  BrandStatistics[]
> {
  const { data, error } = await supabase
    .from("brand_statistics")
    .select("*")
    .order("average_rating", { ascending: false })
    .order("rating_count", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as BrandStatisticsRow[]).map(
    mapBrandStatisticsRow
  )
}

export async function fetchFlavorStatistics(): Promise<Flavor[]> {
  const { data, error } = await supabase
    .from("flavor_statistics")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as FlavorStatisticsRow[]).map(
    mapFlavorStatisticsRow
  )
}

export async function fetchFlavorById(
  flavorId: string
): Promise<Flavor | null> {
  const { data, error } = await supabase
    .from("flavor_statistics")
    .select("*")
    .eq("id", flavorId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  return mapFlavorStatisticsRow(data as FlavorStatisticsRow)
}

export async function fetchFlavorRatings(
  flavorId: string
): Promise<FlavorRating[]> {
  const { data, error } = await supabase
    .from("flavor_ratings")
    .select(
      `
        id,
        flavor_id,
        user_id,
        rating,
        review,
        created_at,
        updated_at,
        profiles!flavor_ratings_user_id_profiles_fkey (
          username,
          display_name,
          avatar_url
        )
      `
    )
    .eq("flavor_id", flavorId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Could not fetch flavor ratings:", error)
    throw new Error(error.message)
  }

  return ((data ?? []) as FlavorRatingRow[]).map(
    mapFlavorRatingRow
  )
}

export async function saveFlavorRating(
  input: CreateFlavorRatingInput
): Promise<void> {
  const normalizedRating = Math.max(
    1,
    Math.min(5, input.rating)
  )

  const { error } = await supabase
    .from("flavor_ratings")
    .upsert(
      {
        flavor_id: input.flavorId,
        user_id: input.userId,
        rating: normalizedRating,
        review: input.review?.trim() || null,
      },
      {
        onConflict: "flavor_id,user_id",
      }
    )

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteFlavorRating(
  flavorId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("flavor_ratings")
    .delete()
    .eq("flavor_id", flavorId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchFavoriteFlavorIds(
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("favorite_flavors")
    .select("flavor_id")
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => row.flavor_id)
}

export async function favoriteFlavor(
  flavorId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("favorite_flavors")
    .upsert(
      {
        flavor_id: flavorId,
        user_id: userId,
      },
      {
        onConflict: "user_id,flavor_id",
      }
    )

  if (error) {
    throw new Error(error.message)
  }
}

export async function unfavoriteFlavor(
  flavorId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("favorite_flavors")
    .delete()
    .eq("flavor_id", flavorId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}