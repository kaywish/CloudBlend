export type FlavorStrength = "light" | "medium" | "strong"

export type Brand = {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  website: string | null
  country: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export type BrandStatistics = Brand & {
  flavorCount: number
  averageRating: number
  ratingCount: number
}

export type Flavor = {
  id: string
  brandId: string
  brandName: string
  brandSlug: string | null
  brandLogoUrl: string | null

  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  category: string | null
  strength: FlavorStrength | null
  isDarkLeaf: boolean
  isActive: boolean

  averageRating: number
  ratingCount: number
  favoriteCount: number
  publicMixCount: number

  createdAt?: string
  updatedAt?: string
}

export type FlavorRating = {
  id: string
  flavorId: string
  userId: string
  rating: number
  review: string | null
  createdAt: string
  updatedAt: string
}

export type CreateFlavorRatingInput = {
  flavorId: string
  userId: string
  rating: number
  review?: string | null
}