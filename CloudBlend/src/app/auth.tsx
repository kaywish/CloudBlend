import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

export default function AuthScreen() {
  const { signIn, signUp } = useAuth()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit() {
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password) {
      Alert.alert(
        "Missing Information",
        "Please enter your email and password."
      )
      return
    }

    if (password.length < 6) {
      Alert.alert(
        "Password Too Short",
        "Your password must contain at least 6 characters."
      )
      return
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert(
        "Passwords Do Not Match",
        "Please make sure both passwords match."
      )
      return
    }

    setIsSubmitting(true)

    try {
      const result = isSignUp
        ? await signUp(normalizedEmail, password)
        : await signIn(normalizedEmail, password)

     if (result.error) {
  const isEmailNotConfirmed =
    result.error.toLowerCase().includes("email not confirmed")

  Alert.alert(
    isSignUp
      ? "Could Not Create Account"
      : isEmailNotConfirmed
        ? "Email Not Confirmed"
        : "Could Not Sign In",
    isEmailNotConfirmed
      ? "Please check your inbox and click the confirmation link before signing in."
      : result.error
  )

  return
}

      if (isSignUp) {
        Alert.alert(
          "Check Your Email",
          "We sent you a confirmation link. Confirm your email, then return to CloudBlend and sign in."
        )

        setIsSignUp(false)
        setPassword("")
        setConfirmPassword("")
        return
      }

      router.replace("/(tabs)")
    } catch (error) {
      console.error("Authentication error:", error)

      Alert.alert(
        "Something Went Wrong",
        "Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="close"
              size={24}
              color={theme.text}
            />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons
                name="flask"
                size={34}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.appName}>CloudBlend</Text>

            <Text style={styles.subtitle}>
              {isSignUp
                ? "Create an account to save and share your mixes."
                : "Sign in to access your saved mixes."}
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {isSignUp ? "Create Account" : "Welcome Back"}
            </Text>

            <Text style={styles.label}>Email</Text>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />

            <Text style={styles.label}>Password</Text>

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType={
                  isSignUp ? "newPassword" : "password"
                }
              />

              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((value) => !value)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={21}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {isSignUp ? (
              <>
                <Text style={styles.label}>Confirm Password</Text>

                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Enter your password again"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                />
              </>
            ) : null}

            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              disabled={isSubmitting}
              onPress={handleSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isSignUp ? "Create Account" : "Sign In"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              disabled={isSubmitting}
              onPress={() => {
                setIsSignUp((value) => !value)
                setPassword("")
                setConfirmPassword("")
              }}
            >
              <Text style={styles.switchText}>
                {isSignUp
                  ? "Already have an account? "
                  : "Don't have an account? "}
              </Text>

              <Text style={styles.switchAction}>
                {isSignUp ? "Sign In" : "Create One"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },

  logoContainer: {
    marginTop: 26,
    alignItems: "center",
  },

  logoIcon: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: theme.primary,
  },

  appName: {
    marginTop: 15,
    fontSize: 29,
    fontWeight: "800",
    color: theme.text,
  },

  subtitle: {
    maxWidth: 310,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: theme.textSecondary,
  },

  formCard: {
    marginTop: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 22,
    backgroundColor: theme.card,
  },

  formTitle: {
    marginBottom: 21,
    fontSize: 22,
    fontWeight: "800",
    color: theme.text,
  },

  label: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "700",
    color: theme.text,
  },

  input: {
    height: 54,
    marginBottom: 18,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 15,
    fontSize: 15,
    color: theme.text,
    backgroundColor: theme.background,
  },

  passwordContainer: {
    height: 54,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 15,
    backgroundColor: theme.background,
  },

  passwordInput: {
    flex: 1,
    height: "100%",
    paddingLeft: 15,
    fontSize: 15,
    color: theme.text,
  },

  eyeButton: {
    width: 48,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  submitButton: {
    height: 54,
    marginTop: 5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: theme.primary,
  },

  submitButtonDisabled: {
    opacity: 0.65,
  },

  submitButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  switchButton: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
  },

  switchText: {
    fontSize: 13,
    color: theme.textSecondary,
  },

  switchAction: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.primary,
  },
})