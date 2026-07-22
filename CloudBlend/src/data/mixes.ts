import { FlavorMix } from "@/types"

export const mixes: FlavorMix[] = [
  {
    id: "tropical-storm",
    name: "Tropical Storm",
    description:
      "A sweet tropical mix with mango, peach and a refreshing mint finish.",
    image:
      "https://images.unsplash.com/photo-1546548970-71785318a17b?w=800",
    ingredients: [
      {
        flavorId: "mango",
        flavorName: "Mango",
        percentage: 50,
      },
      {
        flavorId: "peach",
        flavorName: "Peach",
        percentage: 30,
      },
      {
        flavorId: "mint",
        flavorName: "Mint",
        percentage: 20,
      },
    ],
    categories: ["Fruity", "Sweet", "Minty"],
    averageRating: 4.6,
    ratingCount: 128,
    createdBy: "CloudMix",
    isFeatured: true,
  },
  {
    id: "berry-mint-blast",
    name: "Berry Mint Blast",
    description:
      "A balanced mix of sweet berries with a refreshing mint finish.",
    image:
      "https://images.unsplash.com/photo-1425934398893-310a009a77f9?w=800",
    ingredients: [
      {
        flavorId: "blueberry-mint",
        flavorName: "Blueberry Mint",
        percentage: 50,
      },
      {
        flavorId: "grape",
        flavorName: "Grape",
        percentage: 30,
      },
      {
        flavorId: "lemon-mint",
        flavorName: "Lemon Mint",
        percentage: 20,
      },
    ],
    categories: ["Fruity", "Minty"],
    averageRating: 4.7,
    ratingCount: 94,
    createdBy: "CloudKing",
    isFeatured: true,
  },
  {
    id: "lemon-ice-punch",
    name: "Lemon Ice Punch",
    description:
      "Sharp lemon citrus combined with a strong cooling mint sensation.",
    image:
      "https://images.unsplash.com/photo-1582284540020-8acbe03f4924?w=800",
    ingredients: [
      {
        flavorId: "lemon-mint",
        flavorName: "Lemon Mint",
        percentage: 70,
      },
      {
        flavorId: "mint",
        flavorName: "Mint",
        percentage: 30,
      },
    ],
    categories: ["Citrus", "Minty"],
    averageRating: 4.5,
    ratingCount: 112,
    createdBy: "HookahMaster",
  },
]