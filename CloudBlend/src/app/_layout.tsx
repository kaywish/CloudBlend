import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"

import { AuthProvider } from "@/context/AuthContext"
import { AppThemeProvider, useAppTheme } from "@/context/AppThemeContext"
import { MixProvider } from "@/context/MixContext"
import { ProfileProvider } from "@/context/ProfileContext"
import { FlavorProvider } from "@/context/FlavorContext"

function AppNavigator() {
  const { theme, resolvedTheme } = useAppTheme()

  return (
    <>
      <StatusBar
        style={resolvedTheme === "dark" ? "light" : "dark"}
      />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="flavor/[id]" />
        <Stack.Screen name="mix/[id]" />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
  <AppThemeProvider>
  <AuthProvider>
    <ProfileProvider>
      <MixProvider>
        <FlavorProvider>
          <Stack />
        </FlavorProvider>
      </MixProvider>
    </ProfileProvider>
  </AuthProvider>
</AppThemeProvider>
  )
}