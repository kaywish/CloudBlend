import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { AuthProvider } from "@/context/AuthContext"
import {
  AppThemeProvider,
  useAppTheme,
} from "@/context/AppThemeContext"
import { FlavorProvider } from "@/context/FlavorContext"
import { MixProvider } from "@/context/MixContext"
import { ProProvider } from "@/context/ProContext"
import { ProfileProvider } from "@/context/ProfileContext"
import { FollowProvider } from "@/context/FollowContext"

function AppNavigator() {
  const { theme, resolvedTheme } = useAppTheme()

  return (
    <>
      <StatusBar
        style={
          resolvedTheme === "dark"
            ? "light"
            : "dark"
        }
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
        <Stack.Screen name="user/[id]" />

        <Stack.Screen
          name="pro"
          options={{
            presentation: "modal",
          }}
        />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
<AppThemeProvider>
  <AuthProvider>
    <ProProvider>
      <FollowProvider>
        <ProfileProvider>
          <MixProvider>
            <FlavorProvider>
              <AppNavigator />
            </FlavorProvider>
          </MixProvider>
        </ProfileProvider>
      </FollowProvider>
    </ProProvider>
  </AuthProvider>
</AppThemeProvider>
  )
}