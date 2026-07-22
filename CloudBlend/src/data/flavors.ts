import { Flavor } from "@/types"

export const flavors: Flavor[] = [
  {
    id: "blueberry-mint",
    name: "Blueberry Mint",
    brand: "Al Fakher",
    description:
      "Sweet blueberry flavor with a smooth and refreshing mint finish.",
    categories: ["Fruity", "Minty", "Sweet"],
    image:
      "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800",
    sweetness: 8,
    mintLevel: 5,
    strength: 6,
    averageRating: 4.7,
    ratingCount: 128,
  },
  {
    id: "mango",
    name: "Mango",
    brand: "Al Fakher",
    description:
      "A ripe tropical mango flavor with a bold and naturally sweet profile.",
    categories: ["Fruity", "Sweet"],
    image:
      "https://images.unsplash.com/photo-1553279768-865429fa0078?w=800",
    sweetness: 9,
    mintLevel: 0,
    strength: 7,
    averageRating: 4.5,
    ratingCount: 94,
  },
  {
    id: "lemon-mint",
    name: "Lemon Mint",
    brand: "Starbuzz",
    description:
      "A bright citrus flavor balanced with a cool and refreshing mint.",
    categories: ["Citrus", "Minty"],
    image:
      "https://images.unsplash.com/photo-1590502593747-42a996133562?w=800",
    sweetness: 5,
    mintLevel: 8,
    strength: 7,
    averageRating: 4.8,
    ratingCount: 173,
  },
  {
    id: "double-apple",
    name: "Double Apple",
    brand: "Nakhla",
    description:
      "A traditional apple blend with sweet, spiced and slightly anise notes.",
    categories: ["Fruity", "Spiced"],
    image:
      "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800",
    sweetness: 7,
    mintLevel: 0,
    strength: 8,
    averageRating: 4.4,
    ratingCount: 76,
  },
]