
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { Platform } from "react-native"
import type {
  CustomerInfo,
  PurchasesPackage,
} from "react-native-purchases"

import { useAuth } from "@/context/AuthContext"
import {
  configureRevenueCat,
  customerHasPro,
  getCurrentOfferingPackage,
  getRevenueCatCustomerInfo,
  identifyRevenueCatUser,
  logOutRevenueCatUser,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
} from "@/services/revenueCat"

type PurchaseResult = {
  success: boolean
  cancelled?: boolean
  error: string | null
}

type ProContextValue = {
  hasPro: boolean
  isLoadingPro: boolean
  isPurchasing: boolean
  currentPackage: PurchasesPackage | null
  customerInfo: CustomerInfo | null
  refreshProStatus: () => Promise<void>
  purchasePro: () => Promise<PurchaseResult>
  restorePurchases: () => Promise<PurchaseResult>
}

type ProProviderProps = {
  children: ReactNode
}

const ProContext =
  createContext<ProContextValue | undefined>(undefined)

export function ProProvider({
  children,
}: ProProviderProps) {
  const { user, isLoading: isLoadingAuth } = useAuth()

  const [hasPro, setHasPro] = useState(false)
  const [isLoadingPro, setIsLoadingPro] =
    useState(true)
  const [isPurchasing, setIsPurchasing] =
    useState(false)

  const [currentPackage, setCurrentPackage] =
    useState<PurchasesPackage | null>(null)

  const [customerInfo, setCustomerInfo] =
    useState<CustomerInfo | null>(null)

  const applyCustomerInfo = useCallback(
    (info: CustomerInfo | null) => {
      setCustomerInfo(info)
      setHasPro(customerHasPro(info))
    },
    []
  )

  const clearProState = useCallback(() => {
    setHasPro(false)
    setCustomerInfo(null)
    setCurrentPackage(null)
  }, [])

  const loadCurrentPackage = useCallback(async () => {
    const availablePackage =
      await getCurrentOfferingPackage()

    setCurrentPackage(availablePackage)

    return availablePackage
  }, [])

  const refreshProStatus = useCallback(async () => {
    if (Platform.OS === "web") {
      clearProState()
      setIsLoadingPro(false)
      return
    }

    try {
      setIsLoadingPro(true)

      await configureRevenueCat()

      if (!user) {
        clearProState()
        return
      }

      const info =
        await getRevenueCatCustomerInfo()

      applyCustomerInfo(info)

      await loadCurrentPackage()
    } catch (error) {
      console.error(
        "Could not load KloudIt Pro subscription:",
        error
      )

      clearProState()
    } finally {
      setIsLoadingPro(false)
    }
  }, [
    applyCustomerInfo,
    clearProState,
    loadCurrentPackage,
    user,
  ])

  useEffect(() => {
    if (isLoadingAuth) {
      return
    }

    let isActive = true

    async function syncRevenueCatUser() {
      if (Platform.OS === "web") {
        if (isActive) {
          clearProState()
          setIsLoadingPro(false)
        }

        return
      }

      try {
        setIsLoadingPro(true)

        await configureRevenueCat()

        if (!user) {
          try {
            await logOutRevenueCatUser()
          } catch (error) {
            console.log(
              "RevenueCat user was already signed out:",
              error
            )
          }

          if (isActive) {
            clearProState()
          }

          return
        }

        const info =
          await identifyRevenueCatUser(user.id)

        const availablePackage =
          await getCurrentOfferingPackage()

        if (!isActive) {
          return
        }

        applyCustomerInfo(info)
        setCurrentPackage(availablePackage)
      } catch (error) {
        console.error(
          "Could not synchronize KloudIt RevenueCat user:",
          error
        )

        if (isActive) {
          clearProState()
        }
      } finally {
        if (isActive) {
          setIsLoadingPro(false)
        }
      }
    }

    void syncRevenueCatUser()

    return () => {
      isActive = false
    }
  }, [
    applyCustomerInfo,
    clearProState,
    isLoadingAuth,
    user?.id,
  ])

  const purchasePro = useCallback(
    async (): Promise<PurchaseResult> => {
      if (Platform.OS === "web") {
        return {
          success: false,
          error:
            "KloudIt Pro purchases are currently available in the mobile app.",
        }
      }

      if (!user) {
        return {
          success: false,
          error:
            "Sign in before purchasing KloudIt Pro.",
        }
      }

      try {
        setIsPurchasing(true)

        await configureRevenueCat()

        const selectedPackage =
          currentPackage ??
          (await getCurrentOfferingPackage())

        if (!selectedPackage) {
          return {
            success: false,
            error:
              "KloudIt Pro is currently unavailable. Check your RevenueCat offering and App Store product.",
          }
        }

        const info =
          await purchaseRevenueCatPackage(
            selectedPackage
          )

        applyCustomerInfo(info)

        if (!customerHasPro(info)) {
          return {
            success: false,
            error:
              "The purchase completed, but the KloudIt Pro entitlement was not found.",
          }
        }

        return {
          success: true,
          error: null,
        }
      } catch (error: any) {
        if (error?.userCancelled) {
          return {
            success: false,
            cancelled: true,
            error: null,
          }
        }

        console.error(
          "KloudIt Pro purchase failed:",
          error
        )

        return {
          success: false,
          error:
            error?.message ??
            "The purchase could not be completed.",
        }
      } finally {
        setIsPurchasing(false)
      }
    },
    [
      applyCustomerInfo,
      currentPackage,
      user,
    ]
  )

  const restorePurchases = useCallback(
    async (): Promise<PurchaseResult> => {
      if (Platform.OS === "web") {
        return {
          success: false,
          error:
            "Purchases can only be restored in the KloudIt mobile app.",
        }
      }

      if (!user) {
        return {
          success: false,
          error:
            "Sign in to the KloudIt account associated with your subscription before restoring purchases.",
        }
      }

      try {
        setIsPurchasing(true)

        await configureRevenueCat()

        /*
         * Attach RevenueCat to the currently signed-in
         * KloudIt user before restoring purchases.
         */
        await identifyRevenueCatUser(user.id)

        const info =
          await restoreRevenueCatPurchases()

        applyCustomerInfo(info)

        if (!customerHasPro(info)) {
          return {
            success: false,
            error:
              "No active KloudIt Pro subscription was found for this App Store or Google Play account.",
          }
        }

        return {
          success: true,
          error: null,
        }
      } catch (error: any) {
        console.error(
          "Could not restore KloudIt purchases:",
          error
        )

        return {
          success: false,
          error:
            error?.message ??
            "Your KloudIt purchases could not be restored.",
        }
      } finally {
        setIsPurchasing(false)
      }
    },
    [
      applyCustomerInfo,
      user,
    ]
  )

  const value = useMemo<ProContextValue>(
    () => ({
      hasPro,
      isLoadingPro,
      isPurchasing,
      currentPackage,
      customerInfo,
      refreshProStatus,
      purchasePro,
      restorePurchases,
    }),
    [
      hasPro,
      isLoadingPro,
      isPurchasing,
      currentPackage,
      customerInfo,
      refreshProStatus,
      purchasePro,
      restorePurchases,
    ]
  )

  return (
    <ProContext.Provider value={value}>
      {children}
    </ProContext.Provider>
  )
}

export function usePro() {
  const context = useContext(ProContext)

  if (!context) {
    throw new Error(
      "usePro must be used inside a ProProvider."
    )
  }

  return context
}

