import { Platform } from "react-native"
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases"

const IOS_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY

const ANDROID_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY

export const PRO_ENTITLEMENT_ID = "pro"

let isConfigured = false

export async function configureRevenueCat() {
  if (isConfigured || Platform.OS === "web") {
    return
  }

  const apiKey =
    Platform.OS === "ios"
      ? IOS_API_KEY
      : ANDROID_API_KEY

  if (!apiKey) {
    console.warn(
      `Missing RevenueCat API key for ${Platform.OS}.`
    )
    return
  }

  Purchases.setLogLevel(LOG_LEVEL.DEBUG)

  Purchases.configure({
    apiKey,
  })

  isConfigured = true
}

export async function identifyRevenueCatUser(
  userId: string
) {
  if (Platform.OS === "web") {
    return null
  }

  const result = await Purchases.logIn(userId)
  return result.customerInfo
}

export async function logOutRevenueCatUser() {
  if (Platform.OS === "web") {
    return
  }

  await Purchases.logOut()
}

export async function getRevenueCatCustomerInfo() {
  if (Platform.OS === "web") {
    return null
  }

  return Purchases.getCustomerInfo()
}

export async function getCurrentOfferingPackage(): Promise<
  PurchasesPackage | null
> {
  if (Platform.OS === "web") {
    return null
  }

  const offerings = await Purchases.getOfferings()

  return (
    offerings.current?.monthly ??
    offerings.current?.availablePackages?.[0] ??
    null
  )
}

export async function purchaseRevenueCatPackage(
  selectedPackage: PurchasesPackage
): Promise<CustomerInfo> {
  const result = await Purchases.purchasePackage(
    selectedPackage
  )

  return result.customerInfo
}

export async function restoreRevenueCatPurchases() {
  if (Platform.OS === "web") {
    return null
  }

  return Purchases.restorePurchases()
}

export function customerHasPro(
  customerInfo: CustomerInfo | null
) {
  return Boolean(
    customerInfo?.entitlements.active[
      PRO_ENTITLEMENT_ID
    ]
  )
}