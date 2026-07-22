import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useEffect, useRef, useState } from "react"
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

type UsernameStatus =
  | "idle"
  | "checking"
  | "available"
  | "unavailable"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_PATTERN = /^[a-z0-9_]+$/

export default function AuthScreen() {
  const {
    signIn,
    signUp,
    checkUsernameAvailability,
  } = useAuth()

  const [isSignUp, setIsSignUp] = useState(false)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [usernameStatus, setUsernameStatus] =
    useState<UsernameStatus>("idle")
  const [usernameMessage, setUsernameMessage] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false)

  const usernameRequestRef = useRef(0)

  const normalizedUsername = username.trim().toLowerCase()
  const normalizedEmail = email.trim().toLowerCase()

  const usernameIsValid =
    normalizedUsername.length >= 3 &&
    normalizedUsername.length <= 20 &&
    USERNAME_PATTERN.test(normalizedUsername)

  const emailIsValid = EMAIL_PATTERN.test(normalizedEmail)

  useEffect(() => {
    if (!isSignUp) {
      setUsernameStatus("idle")
      setUsernameMessage("")
      return
    }

    if (!normalizedUsername) {
      setUsernameStatus("idle")
      setUsernameMessage("")
      return
    }

    if (normalizedUsername.length < 3) {
      setUsernameStatus("unavailable")
      setUsernameMessage(
        "Username must be at least 3 characters."
      )
      return
    }

    if (normalizedUsername.length > 20) {
      setUsernameStatus("unavailable")
      setUsernameMessage(
        "Username cannot exceed 20 characters."
      )
      return
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setUsernameStatus("unavailable")
      setUsernameMessage(
        "Use only letters, numbers, and underscores."
      )
      return
    }

    const requestId = ++usernameRequestRef.current

    setUsernameStatus("checking")
    setUsernameMessage("Checking availability...")

    const timer = setTimeout(async () => {
      const result =
        await checkUsernameAvailability(normalizedUsername)

      if (requestId !== usernameRequestRef.current) {
        return
      }

      if (result.available) {
        setUsernameStatus("available")
        setUsernameMessage("Username is available")
      } else {
        setUsernameStatus("unavailable")
        setUsernameMessage(
          result.error ?? "That username is unavailable."
        )
      }
    }, 450)

    return () => clearTimeout(timer)
  }, [
    isSignUp,
    normalizedUsername,
    checkUsernameAvailability,
  ])

  function showError(title: string, message: string) {
    Alert.alert(title, message)
  }

  function resetFormForMode(nextIsSignUp: boolean) {
    setIsSignUp(nextIsSignUp)
    setUsername("")
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setUsernameStatus("idle")
    setUsernameMessage("")
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  async function handleSubmit() {
    if (isSignUp && !normalizedUsername) {
      showError(
        "Username Required",
        "Please choose a username."
      )
      return
    }

    if (isSignUp && !usernameIsValid) {
      showError(
        "Invalid Username",
        usernameMessage ||
          "Use 3–20 letters, numbers, or underscores."
      )
      return
    }

    if (
      isSignUp &&
      usernameStatus !== "available"
    ) {
      showError(
        "Username Unavailable",
        usernameStatus === "checking"
          ? "Please wait while we check your username."
          : usernameMessage ||
              "Please choose another username."
      )
      return
    }

    if (!normalizedEmail || !password) {
      showError(
        "Missing Information",
        "Please enter your email and password."
      )
      return
    }

    if (!emailIsValid) {
      showError(
        "Invalid Email",
        "Please enter a valid email address."
      )
      return
    }

    if (password.length < 6) {
      showError(
        "Password Too Short",
        "Your password must contain at least 6 characters."
      )
      return
    }

    if (isSignUp && password !== confirmPassword) {
      showError(
        "Passwords Do Not Match",
        "Please make sure both passwords match."
      )
      return
    }

    setIsSubmitting(true)

    try {
      const result = isSignUp
        ? await signUp(
            normalizedUsername,
            normalizedEmail,
            password
          )
        : await signIn(normalizedEmail, password)

      if (result.error) {
        switch (result.errorCode) {
          case "invalid_credentials":
            showError(
              "Invalid Login",
              "The email or password you entered is incorrect."
            )
            break

          case "email_not_confirmed":
            showError(
              "Email Not Confirmed",
              "Please confirm your email before signing in."
            )
            break

          case "username_unavailable":
            setUsernameStatus("unavailable")
            setUsernameMessage(result.error)
            showError(
              "Username Unavailable",
              result.error
            )
            break

          default:
            showError(
              isSignUp
                ? "Could Not Create Account"
                : "Could Not Sign In",
              result.error
            )
        }

        return
      }

      if (isSignUp) {
        if (result.requiresEmailConfirmation) {
          Alert.alert(
            "Check Your Email",
            "Your account was created. Confirm your email, then return to CloudBlend and sign in."
          )

          resetFormForMode(false)
          return
        }

        Alert.alert(
          "Welcome to CloudBlend",
          "Your account was created successfully."
        )
      }

      router.replace("/(tabs)")
    } catch (error) {
      console.error(
        "Unexpected authentication error:",
        error
      )

      showError(
        "Connection Error",
        "CloudBlend could not connect. Check your internet connection and try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitDisabled =
    isSubmitting ||
    (isSignUp && usernameStatus === "checking")

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
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
              accessibilityLabel="Close authentication screen"
            >
              <Ionicons
                name="close"
                size={23}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.hero}>
            <View style={styles.logoOuter}>
              <View style={styles.logoIcon}>
                <Ionicons
                  name="flask"
                  size={34}
                  color="#FFFFFF"
                />
              </View>
            </View>

            <Text style={styles.appName}>CloudBlend</Text>

            <Text style={styles.heroTitle}>
              {isSignUp
                ? "Create your flavor identity"
                : "Welcome back"}
            </Text>

            <Text style={styles.subtitle}>
              {isSignUp
                ? "Save your favorite blends, publish mixes, and discover creators."
                : "Sign in to continue building and sharing your best mixes."}
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.modeSwitch}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  !isSignUp && styles.modeButtonActive,
                ]}
                onPress={() => resetFormForMode(false)}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    !isSignUp &&
                      styles.modeButtonTextActive,
                  ]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  isSignUp && styles.modeButtonActive,
                ]}
                onPress={() => resetFormForMode(true)}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    isSignUp &&
                      styles.modeButtonTextActive,
                  ]}
                >
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {!isSignUp ? (
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={() => router.push("/forgot-password")}
                disabled={isSubmitting}
              >
                <Text style={styles.forgotPasswordText}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            ) : null}

            {isSignUp ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Username</Text>

                <View
                  style={[
                    styles.inputContainer,
                    usernameStatus === "available" &&
                      styles.inputSuccess,
                    usernameStatus === "unavailable" &&
                      normalizedUsername.length > 0 &&
                      styles.inputError,
                  ]}
                >
                  <Ionicons
                    name="at-outline"
                    size={19}
                    color={theme.textSecondary}
                  />

                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={(value) =>
                      setUsername(
                        value
                          .toLowerCase()
                          .replace(/\s/g, "")
                      )
                    }
                    placeholder="your_username"
                    placeholderTextColor={
                      theme.textSecondary
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={20}
                    textContentType="username"
                    editable={!isSubmitting}
                  />

                  {usernameStatus === "checking" ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.primary}
                    />
                  ) : null}

                  {usernameStatus === "available" ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={21}
                      color="#16A34A"
                    />
                  ) : null}

                  {usernameStatus === "unavailable" &&
                  normalizedUsername.length > 0 ? (
                    <Ionicons
                      name="alert-circle"
                      size={21}
                      color="#DC2626"
                    />
                  ) : null}
                </View>

                <View style={styles.fieldMetaRow}>
                  <Text
                    style={[
                      styles.helperText,
                      usernameStatus === "available" &&
                        styles.successText,
                      usernameStatus ===
                        "unavailable" &&
                        styles.errorText,
                    ]}
                  >
                    {usernameMessage ||
                      "3–20 letters, numbers, or underscores"}
                  </Text>

                  <Text style={styles.characterCount}>
                    {normalizedUsername.length}/20
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={19}
                  color={theme.textSecondary}
                />

                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={
                    theme.textSecondary
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!isSubmitting}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>

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
                  textContentType={
                    isSignUp
                      ? "newPassword"
                      : "password"
                  }
                  editable={!isSubmitting}
                />

                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() =>
                    setShowPassword((value) => !value)
                  }
                  disabled={isSubmitting}
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
            </View>

            {isSignUp ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
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
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                    editable={!isSubmitting}
                  />

                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() =>
                      setShowConfirmPassword(
                        (value) => !value
                      )
                    }
                    disabled={isSubmitting}
                  >
                    <Ionicons
                      name={
                        showConfirmPassword
                          ? "eye-off-outline"
                          : "eye-outline"
                      }
                      size={21}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {confirmPassword.length > 0 ? (
                  <Text
                    style={[
                      styles.passwordMatchText,
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
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.submitButton,
                submitDisabled &&
                  styles.submitButtonDisabled,
              ]}
              disabled={submitDisabled}
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    {isSignUp
                      ? "Create My Account"
                      : "Sign In"}
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color="#FFFFFF"
                  />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.securityRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={theme.textSecondary}
              />
              <Text style={styles.securityText}>
                Your account information is securely
                protected.
              </Text>
            </View>
          </View>

          <Text style={styles.footerText}>
            By continuing, you agree to CloudBlend’s Terms
            of Service and Privacy Policy.
          </Text>
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
    bottom: 70,
    left: -110,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: `${theme.primary}10`,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  topBar: {
    height: 50,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  closeButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 21,
    backgroundColor: theme.card,
  },

  hero: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 26,
  },

  logoOuter: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    backgroundColor: `${theme.primary}16`,
  },

  logoIcon: {
    width: 66,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: theme.primary,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 7,
  },

  appName: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: theme.primary,
  },

  heroTitle: {
    marginTop: 7,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: "900",
    textAlign: "center",
    color: theme.text,
  },

  subtitle: {
    maxWidth: 330,
    marginTop: 9,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: theme.textSecondary,
  },

  formCard: {
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 26,
    backgroundColor: theme.card,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 5,
  },

  modeSwitch: {
    height: 48,
    marginBottom: 24,
    padding: 4,
    flexDirection: "row",
    borderRadius: 16,
    backgroundColor: theme.background,
  },

  modeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
  },

  modeButtonActive: {
    backgroundColor: theme.card,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },

  modeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.textSecondary,
  },

  modeButtonTextActive: {
    color: theme.text,
  },

  fieldGroup: {
    marginBottom: 17,
  },

  label: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "800",
    color: theme.text,
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

  inputSuccess: {
    borderColor: "#16A34A",
  },

  inputError: {
    borderColor: "#DC2626",
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

  fieldMetaRow: {
    minHeight: 22,
    marginTop: 6,
    paddingHorizontal: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  helperText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: theme.textSecondary,
  },

  characterCount: {
    fontSize: 12,
    color: theme.textSecondary,
  },

  successText: {
    color: "#16A34A",
  },

  errorText: {
    color: "#DC2626",
  },

  passwordMatchText: {
    marginTop: 7,
    paddingHorizontal: 2,
    fontSize: 12,
    fontWeight: "600",
  },

  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginTop: -7,
    marginBottom: 17,
    paddingVertical: 4,
  },

  forgotPasswordText: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.primary,
  },

  submitButton: {
    height: 56,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 17,
    backgroundColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 5,
  },

  submitButtonDisabled: {
    opacity: 0.58,
  },

  submitButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  securityRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  securityText: {
    fontSize: 11,
    color: theme.textSecondary,
  },

  footerText: {
    maxWidth: 310,
    marginTop: 22,
    alignSelf: "center",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    color: theme.textSecondary,
  },
})