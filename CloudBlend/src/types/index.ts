export type FlavorCategory =
  | "Fruity"
  | "Minty"
  | "Sweet"
  | "Citrus"
  | "Creamy"
  | "Spiced"
  | "Floral"

export type Flavor = {
  id: string
  name: string
  brand: string
  description: string
  categories: FlavorCategory[]
  image: string
  sweetness: number
  mintLevel: number
  strength: number
  averageRating: number
  ratingCount: number
}

export type MixIngredient = {
  flavorId: string
  flavorName: string
  percentage: number
}

export type FlavorMix = {
  id: string
  name: string
  description: string
  image: string
  ingredients: MixIngredient[]
  categories: FlavorCategory[]
  averageRating: number
  ratingCount: number
  createdBy: string
  isFeatured?: boolean
}