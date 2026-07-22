import { Ionicons } from "@expo/vector-icons"
import { Tabs } from "expo-router"
import { Platform } from "react-native"

import { colors } from "@/constants/colors"

const theme = colors.light

export default function TabsLayout() {
  return (
    <Tabs
   screenOptions={{
    headerShown: false,

    tabBarActiveTintColor: colors.light.primary,
    tabBarInactiveTintColor: colors.light.muted,

    tabBarStyle: {
      height: 78,
      paddingTop: 8,
      paddingBottom: 10,
      borderTopWidth: 1,
      borderTopColor: colors.light.border,
      backgroundColor: colors.light.background,
    },

    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: "600",
      marginTop: 2,
      marginBottom: 2,
    },

    tabBarItemStyle: {
      paddingVertical: 2,
    },
  }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="flavors"
        options={{
          title: "Flavors",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "leaf" : "leaf-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="builder"
        options={{
          title: "Mix",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "git-merge" : "git-merge-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "heart" : "heart-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  )
}