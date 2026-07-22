import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { colors } from "@/constants/colors"
import { useAuth } from "@/context/AuthContext"

const theme = colors.light

export default function ResetPasswordScreen() {
  const { updatePassword, signOut } = useAuth()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] =
    useState("")
  const [showPassword, setShowPassword] =
    useState(false)
  const [isSubmitting, setIsSubmitting] =
    useState(false)

  async function handleUpdatePassword() {
    if (password.length < 6) {
      Alert.alert(
        "Password Too Short",
        "Your password must contain at least 6 characters."
      )
      return
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords Do Not Match",
        "Please make sure both passwords match."
      )
      return
    }

    setIsSubmitting(true)

    try {
      const result = await updatePassword(password)

      if (result.error) {
        Alert.alert(
          "Could Not Update Password",
          result.error
        )
        return
      }

      Alert.alert(
        "Password Updated",
        "Your password has been changed successfully.",
        [
          {
            text: "Sign In",
            onPress: async () => {
              await signOut()
              router.replace("/auth")
            },
          },
        ]
      )
    } catch (error) {
      console.error(
        "Unexpected password update error:",
        error
      )

      Alert.alert(
        "Connection Error",
        "Could not update your password. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.background}>
        <View style={styles.glowOne} />
        <View style={styles.glowTwo} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === "ios" ? "padding" : undefined
        }
      >
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconOuter}>
              <View style={styles.iconInner}>
                <Ionicons
                  name="lock-open-outline"
                  size={34}
                  color="#FFFFFF"
                />
              </View>
            </View>

            <Text style={styles.title}>
              Create a new password
            </Text>

            <Text style={styles.subtitle}>
              Choose a strong password you have not used
              before.
            </Text>

            <View style={styles.card}>
              <Text style={styles.label}>
                New Password
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={theme.textSecondary}
                />

                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={
                    theme.textSecondary
                  }
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  editable={!isSubmitting}
                />

                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() =>
                    setShowPassword((value) => !value)
                  }
                >
                  <Ionicons
                    name={
                      showPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={21}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, styles.confirmLabel]}>
                Confirm Password
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={19}
                  color={theme.textSecondary}
                />

                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Enter your password again"
                  placeholderTextColor={
                    theme.textSecondary
                  }
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  editable={!isSubmitting}
                />
              </View>

              {confirmPassword.length > 0 ? (
                <Text
                  style={[
                    styles.matchText,
                    password === confirmPassword
                      ? styles.successText
                      : styles.errorText,
                  ]}
                >
                  {password === confirmPassword
                    ? "Passwords match"
                    : "Passwords do not match"}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  isSubmitting &&
                    styles.buttonDisabled,
                ]}
                onPress={handleUpdatePassword}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text
                      style={styles.primaryButtonText}
                    >
                      Update Password
                    </Text>
                    <Ionicons
                      name="checkmark"
                      size={19}
                      color="#FFFFFF"
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  glowOne: {
    position: "absolute",
    top: -90,
    right: -90,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: `${theme.primary}18`,
  },
  glowTwo: {
    position: "absolute",
    bottom: 40,
    left: -100,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: `${theme.primary}10`,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 40,
  },
  iconOuter: {
    width: 82,
    height: 82,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    backgroundColor: `${theme.primary}16`,
  },
  iconInner: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: theme.primary,
  },
  title: {
    marginTop: 22,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: "900",
    textAlign: "center",
    color: theme.text,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: theme.textSecondary,
  },
  card: {
    marginTop: 28,
    padding: 19,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 24,
    backgroundColor: theme.card,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  label: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "800",
    color: theme.text,
  },
  confirmLabel: {
    marginTop: 17,
  },
  inputContainer: {
    height: 56,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    backgroundColor: theme.background,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: theme.text,
  },
  eyeButton: {
    width: 36,
    height: "100%",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  matchText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
  },
  successText: {
    color: "#16A34A",
  },
  errorText: {
    color: "#DC2626",
  },
  primaryButton: {
    height: 56,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 17,
    backgroundColor: theme.primary,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})