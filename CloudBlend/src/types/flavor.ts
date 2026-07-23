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
  imageSource: string | null
  imageCredit: string | null
  imageLicense: string | null
  imageApproved: boolean
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

export type FlavorImageSubmissionStatus =
  | "pending"
  | "approved"
  | "rejected"

export type FlavorImageSubmission = {
  id: string
  flavorId: string
  submittedBy: string
  imageUrl: string
  storagePath: string
  creditName: string | null
  notes: string | null
  status: FlavorImageSubmissionStatus
  permissionConfirmed: boolean
  isPrimary: boolean
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}

export type SubmitFlavorImageInput = {
  flavorId: string
  imageUri: string
  creditName?: string
  notes?: string
  permissionConfirmed: boolean
}