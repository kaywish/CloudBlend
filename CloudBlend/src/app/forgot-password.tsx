import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useEffect, useState } from "react"
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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordScreen() {
  const { sendPasswordResetEmail } = useAuth()

  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] =
    useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] =
    useState(0)

  const normalizedEmail = email.trim().toLowerCase()

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return
    }

    const timer = setInterval(() => {
      setCooldownSeconds((current) =>
        Math.max(0, current - 1)
      )
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldownSeconds])

  async function handleSendResetLink() {
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address."
      )
      return
    }

    setIsSubmitting(true)

    try {
      const result =
        await sendPasswordResetEmail(normalizedEmail)

      if (result.error) {
        if (
          result.errorCode ===
          "over_email_send_rate_limit"
        ) {
          setCooldownSeconds(
            result.retryAfterSeconds ?? 60
          )

          Alert.alert(
            "Please Wait",
            "Too many reset emails were requested. Please wait a few minutes before trying again."
          )
          return
        }

        Alert.alert(
          "Could Not Send Email",
          result.error
        )
        return
      }

      setCooldownSeconds(60)
      setEmailSent(true)
    } catch (error) {
      console.error(
        "Unexpected password reset error:",
        error
      )

      Alert.alert(
        "Connection Error",
        "Could not send the reset email. Please try again."
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={theme.text}
            />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.iconOuter}>
              <View style={styles.iconInner}>
                <Ionicons
                  name={
                    emailSent
                      ? "mail-open-outline"
                      : "key-outline"
                  }
                  size={34}
                  color="#FFFFFF"
                />
              </View>
            </View>

            <Text style={styles.title}>
              {emailSent
                ? "Check your email"
                : "Forgot your password?"}
            </Text>

            <Text style={styles.subtitle}>
              {emailSent
                ? `We sent password reset instructions to ${normalizedEmail}.`
                : "Enter the email connected to your CloudBlend account and we’ll send you a reset link."}
            </Text>

            <View style={styles.card}>
              {emailSent ? (
                <>
                  <View style={styles.successBox}>
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#16A34A"
                    />
                    <Text style={styles.successText}>
                      Open the email and tap the reset link
                      to choose a new password.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => router.back()}
                  >
                    <Text style={styles.primaryButtonText}>
                      Back to Sign In
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setEmailSent(false)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Use Another Email
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.label}>
                    Email Address
                  </Text>

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
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="emailAddress"
                      editable={!isSubmitting}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      (isSubmitting ||
                        cooldownSeconds > 0) &&
                        styles.buttonDisabled,
                    ]}
                    onPress={handleSendResetLink}
                    disabled={
                      isSubmitting || cooldownSeconds > 0
                    }
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text
                          style={styles.primaryButtonText}
                        >
                          {cooldownSeconds > 0
                            ? `Try Again in ${cooldownSeconds}s`
                            : "Send Reset Link"}
                        </Text>
                        <Ionicons
                          name={
                            cooldownSeconds > 0
                              ? "time-outline"
                              : "arrow-forward"
                          }
                          size={18}
                          color="#FFFFFF"
                        />
                      </>
                    )}
                  </TouchableOpacity>

                  {cooldownSeconds > 0 ? (
                    <Text style={styles.cooldownText}>
                      Reset emails are limited to protect
                      your account from abuse.
                    </Text>
                  ) : null}
                </>
              )}
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
  backButton: {
    width: 42,
    height: 42,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 21,
    backgroundColor: theme.card,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 70,
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
    maxWidth: 340,
    marginTop: 10,
    alignSelf: "center",
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
  primaryButton: {
    height: 56,
    marginTop: 18,
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
  secondaryButton: {
    height: 48,
    marginTop: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.primary,
  },
  cooldownText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    color: theme.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  successBox: {
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: "#16A34A12",
  },
  successText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: theme.text,
  },
})