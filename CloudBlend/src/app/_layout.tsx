import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { MixProvider } from "@/context/MixContext"
import { AuthProvider } from "@/context/AuthContext"

import { colors } from "@/constants/colors"

export default function RootLayout() {
  return (
    <AuthProvider>
      <MixProvider>
        <StatusBar style="dark" />

        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: colors.light.background,
            },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="flavor/[id]" />
          <Stack.Screen name="mix/[id]" />
        </Stack>
      </MixProvider>
    </AuthProvider>
  )
}