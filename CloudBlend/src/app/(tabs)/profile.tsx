import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { colors } from "@/constants/colors"
import { useAuth } from "@/context/AuthContext"

const theme = colors.light

export default function ProfileScreen() {
  const { user, signOut, isLoading } = useAuth()

  async function handleSignOut() {
    const result = await signOut()

    if (result.error) {
      Alert.alert("Could Not Sign Out", result.error)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          Manage your CloudBlend account.
        </Text>

        {isLoading ? (
          <Text style={styles.loadingText}>Loading account...</Text>
        ) : user ? (
          <View style={styles.accountCard}>
            <View style={styles.profileIcon}>
              <Ionicons
                name="person"
                size={30}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.accountLabel}>Signed in as</Text>

            <Text style={styles.email}>
              {user.email ?? "CloudBlend user"}
            </Text>

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={theme.danger}
              />

              <Text style={styles.signOutButtonText}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.accountCard}>
            <View style={styles.profileIcon}>
              <Ionicons
                name="person-outline"
                size={30}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.cardTitle}>
              Save your mixes online
            </Text>

            <Text style={styles.cardText}>
              Sign in or create an account to sync your mixes and
              access them from other devices.
            </Text>

            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => router.push("/auth")}
            >
              <Ionicons
                name="log-in-outline"
                size={20}
                color="#FFFFFF"
              />

              <Text style={styles.signInButtonText}>
                Sign In or Create Account
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: theme.text,
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    color: theme.textSecondary,
  },

  loadingText: {
    marginTop: 30,
    fontSize: 14,
    color: theme.textSecondary,
  },

  accountCard: {
    marginTop: 28,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 22,
    backgroundColor: theme.card,
  },

  profileIcon: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: theme.primary,
  },

  accountLabel: {
    marginTop: 18,
    fontSize: 12,
    color: theme.textSecondary,
  },

  email: {
    marginTop: 5,
    fontSize: 17,
    fontWeight: "700",
    color: theme.text,
  },

  cardTitle: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: "800",
    color: theme.text,
  },

  cardText: {
    marginTop: 8,
    maxWidth: 310,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: theme.textSecondary,
  },

  signInButton: {
    width: "100%",
    height: 54,
    marginTop: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    backgroundColor: theme.primary,
  },

  signInButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  signOutButton: {
    width: "100%",
    height: 52,
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: theme.danger,
    borderRadius: 16,
  },

  signOutButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.danger,
  },
})