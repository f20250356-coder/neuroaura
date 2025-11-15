// screens/AuthScreen.tsx
import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import * as SecureStore from "expo-secure-store";
import { useUser, UserRole } from "../context/UserContext";

type Props = NativeStackScreenProps<RootStackParamList, "Auth">;

const PASTEL_PURPLE = "#F0D9EF";
const PASTEL_PINK = "#FCDCE1";
const PASTEL_PEACH = "#FFE6BB";
const PASTEL_YELLOW = "#E9ECCE";
const PASTEL_GREEN = "#CDE9DC";
const PASTEL_BLUE = "#C4DFE5";

type AuthMode = "login" | "signup";

interface StoredUser {
  name: string;
  email: string;
  password: string; // ⚠️ demo only
  role?: UserRole;
}

const USER_KEY = "neuroaura_user";

async function saveUser(user: StoredUser) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

async function loadUser(): Promise<StoredUser | null> {
  try {
    const v = await SecureStore.getItemAsync(USER_KEY);
    if (!v) return null;
    return JSON.parse(v);
  } catch (e) {
    console.warn("Failed to parse stored user", e);
    return null;
  }
}

const AuthScreen: React.FC<Props> = ({ navigation, route }) => {
  const { setProfile } = useUser();

  const incomingRole: UserRole =
    (route.params?.role as UserRole) || "individual";

  const [mode, setMode] = useState<AuthMode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedEmailHint, setSavedEmailHint] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const existing = await loadUser();
      if (existing) {
        setSavedEmailHint(existing.email);
      }
    })();
  }, []);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setPassword("");
    setConfirm("");
  };

  const handleSignup = async () => {
    if (!name.trim()) {
      Alert.alert("Tell me your name 💛", "We’ll use it to greet you inside.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Email missing", "Add an email so we can remember you.");
      return;
    }
    if (!password || password.length < 4) {
      Alert.alert(
        "Password too short",
        "Use at least 4 characters for this demo."
      );
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords don’t match", "Double-check both fields.");
      return;
    }

    setLoading(true);
    const user: StoredUser = {
      name: name.trim(),
      email: email.trim(),
      password,
      role: incomingRole,
    };
    await saveUser(user);

    // 🔥 update global profile for the rest of the app
    setProfile({
      name: user.name,
      email: user.email,
      role: user.role || "individual",
    });

    setLoading(false);

    Alert.alert(
      "Account created 🎉",
      "Welcome to NeuroAura! Let’s go check in.",
      [
        {
          text: "Continue",
          onPress: () => {
            navigation.replace("CheckIn");
          },
        },
      ]
    );
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Type your email and password to continue.");
      return;
    }

    setLoading(true);
    const existing = await loadUser();
    setLoading(false);

    if (!existing) {
      Alert.alert(
        "No account found",
        "I couldn’t find any saved account on this device. Try signing up first."
      );
      return;
    }

    if (existing.email !== email.trim() || existing.password !== password) {
      Alert.alert(
        "Oops",
        "Email or password doesn’t match what’s saved on this device."
      );
      return;
    }

    // 🔥 update profile with stored data (and role)
    const roleToUse: UserRole = existing.role || incomingRole || "individual";

    setProfile({
      name: existing.name,
      email: existing.email,
      role: roleToUse,
    });

    Alert.alert(
      "Welcome back 💫",
      `Hi ${existing.name}, let’s check in.`,
      [
        {
          text: "Go to check-in",
          onPress: () => {
            navigation.replace("CheckIn");
          },
        },
      ]
    );
  };

  const roleLabel =
    incomingRole === "parent"
      ? "Parent / guardian"
      : incomingRole === "under18"
      ? "Under 18"
      : "Individual";

  return (
    <SafeAreaView style={styles.container}>
      {/* Pastel blobs */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.inner}>
          {/* App title */}
          <View style={styles.header}>
            <Text style={styles.logoText}>NeuroAura</Text>
            <Text style={styles.rolePill}>{roleLabel} mode</Text>
            <Text style={styles.logoSub}>
              Log in or sign up to enter your calm dashboard 🧠✨
            </Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.modeToggleWrapper}>
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  mode === "signup" && styles.modeButtonActive,
                ]}
                onPress={() => switchMode("signup")}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.modeText,
                    mode === "signup" && styles.modeTextActive,
                  ]}
                >
                  Sign up
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  mode === "login" && styles.modeButtonActive,
                ]}
                onPress={() => switchMode("login")}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.modeText,
                    mode === "login" && styles.modeTextActive,
                  ]}
                >
                  Log in
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            {mode === "signup" && (
              <>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="What should I call you? 😊"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#777"
                  autoCapitalize="words"
                />
              </>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder={
                savedEmailHint && mode === "login"
                  ? `Try: ${savedEmailHint}`
                  : "you@example.com"
              }
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#777"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder={mode === "signup" ? "Create a password" : "••••••••"}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#777"
            />

            {mode === "signup" && (
              <>
                <Text style={styles.label}>Confirm password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Type it again"
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                  placeholderTextColor="#777"
                />
              </>
            )}

            <Text style={styles.helperText}>
              For this hackathon build, your account is{" "}
              <Text style={{ fontWeight: "700" }}>stored only on this device</Text>.
              In a real launch we’ll plug in secure cloud auth.
            </Text>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryDisabled]}
              onPress={mode === "signup" ? handleSignup : handleLogin}
              disabled={loading}
              activeOpacity={0.95}
            >
              <Text style={styles.primaryText}>
                {loading
                  ? "Please wait…"
                  : mode === "signup"
                  ? "Create my NeuroAura account ✨"
                  : "Log me in 🚪"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                // guest profile; still set something so UI has a name
                setProfile({
                  name: "friend",
                  email: "guest@neuroaura",
                  role: incomingRole || "guest",
                });
                navigation.replace("CheckIn");
              }}
            >
              <Text style={styles.secondaryText}>
                Continue as guest (no saving) →
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerNote}>
            Designed for teens & adults (12+), with gentle colours and zero
            judgement 🌸
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PASTEL_BLUE,
  },
  blobTopRight: {
    position: "absolute",
    top: -80,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 120,
    backgroundColor: PASTEL_PINK,
    opacity: 0.4,
  },
  blobBottomLeft: {
    position: "absolute",
    bottom: -90,
    left: -60,
    width: 230,
    height: 230,
    borderRadius: 140,
    backgroundColor: PASTEL_YELLOW,
    opacity: 0.45,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  header: {
    alignItems: "center",
    marginBottom: 10,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#222",
  },
  rolePill: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FFFFFFCC",
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  logoSub: {
    fontSize: 13,
    color: "#444",
    marginTop: 6,
    textAlign: "center",
  },
  modeToggleWrapper: {
    alignItems: "center",
    marginBottom: 16,
    marginTop: 4,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "#FFFFFFAA",
    borderRadius: 999,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: "#FFFFFF",
  },
  modeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
  },
  modeTextActive: {
    color: "#111827",
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#FFFFFFEE",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  helperText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 10,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  primaryDisabled: {
    opacity: 0.7,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 6,
  },
  secondaryText: {
    fontSize: 12,
    color: "#374151",
    textDecorationLine: "underline",
  },
  footerNote: {
    fontSize: 11,
    color: "#4B5563",
    textAlign: "center",
    marginTop: 14,
  },
});