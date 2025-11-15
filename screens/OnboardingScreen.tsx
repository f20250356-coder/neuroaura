// screens/OnboardingScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { useUser } from "../context/UserContext";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

const DISORDER_OPTIONS = [
  "ADHD",
  "Autism / ASD",
  "Anxiety / Panic",
  "Sensory processing",
  "Other / not sure",
];

const SENSITIVITY_OPTIONS = [
  "Loud sounds",
  "Bright lights",
  "Crowds / many people",
  "Strong smells",
  "Being touched / crowded",
];

const ALLERGY_OPTIONS = [
  "Dust / pollen",
  "Perfume / strong smells",
  "Dairy",
  "Gluten",
  "Nuts",
  "Animal fur",
];

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ar", label: "Arabic" },
  { code: "es", label: "Spanish" },
];

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { setProfile } = useUser();
  const [name, setName] = useState("");
  const [ageMode, setAgeMode] = useState<"teen" | "adult">("teen");

  const [disorders, setDisorders] = useState<string[]>([]);
  const [sensitivities, setSensitivities] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [otherAllergy, setOtherAllergy] = useState("");
  const [language, setLanguage] = useState<string>("en");

  const toggleInList = (value: string, list: string[], setter: (v: string[]) => void) => {
    if (list.includes(value)) {
      setter(list.filter((x) => x !== value));
    } else {
      setter([...list, value]);
    }
  };

  const handleContinue = () => {
    if (!name.trim()) return;

    const finalAllergies = otherAllergy.trim()
      ? [...allergies, otherAllergy.trim()]
      : allergies;

    setProfile({
      name: name.trim(),
      ageMode,
      disorders,
      sensitivities,
      allergies: finalAllergies,
      language,
    });

    navigation.replace("Home");
  };

  const canContinue = !!name.trim();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollInner}>
        <Text style={styles.title}>Welcome to NeuroAura 🧠✨</Text>
        <Text style={styles.subtitle}>
          I’ll ask a few questions so I can protect your energy better.
        </Text>

        {/* Name */}
        <Text style={styles.label}>What should I call you?</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name or nickname"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
        />

        {/* Age mode */}
        <Text style={styles.label}>Which describes you best?</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.chip,
              ageMode === "teen" && styles.chipActive,
            ]}
            onPress={() => setAgeMode("teen")}
          >
            <Text
              style={[
                styles.chipText,
                ageMode === "teen" && styles.chipTextActive,
              ]}
            >
              Teen (12–17)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.chip,
              ageMode === "adult" && styles.chipActive,
            ]}
            onPress={() => setAgeMode("adult")}
          >
            <Text
              style={[
                styles.chipText,
                ageMode === "adult" && styles.chipTextActive,
              ]}
            >
              Adult (18+)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Disorders */}
        <Text style={styles.label}>
          Have you been told you might have any of these? (optional)
        </Text>
        <View style={styles.wrapRow}>
          {DISORDER_OPTIONS.map((d) => {
            const active = disorders.includes(d);
            return (
              <TouchableOpacity
                key={d}
                style={[styles.chipTag, active && styles.chipTagActive]}
                onPress={() => toggleInList(d, disorders, setDisorders)}
              >
                <Text
                  style={[
                    styles.chipTagText,
                    active && styles.chipTagTextActive,
                  ]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sensitivities */}
        <Text style={styles.label}>
          Which things usually bother you the most?
        </Text>
        <View style={styles.wrapRow}>
          {SENSITIVITY_OPTIONS.map((s) => {
            const active = sensitivities.includes(s);
            return (
              <TouchableOpacity
                key={s}
                style={[styles.chipTag, active && styles.chipTagActive]}
                onPress={() => toggleInList(s, sensitivities, setSensitivities)}
              >
                <Text
                  style={[
                    styles.chipTagText,
                    active && styles.chipTagTextActive,
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Allergies */}
        <Text style={styles.label}>
          Do you have any allergies or strong physical reactions?
        </Text>
        <View style={styles.wrapRow}>
          {ALLERGY_OPTIONS.map((a) => {
            const active = allergies.includes(a);
            return (
              <TouchableOpacity
                key={a}
                style={[styles.chipTag, active && styles.chipTagActive]}
                onPress={() => toggleInList(a, allergies, setAllergies)}
              >
                <Text
                  style={[
                    styles.chipTagText,
                    active && styles.chipTagTextActive,
                  ]}
                >
                  {a}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          placeholder="Other allergy (optional)"
          placeholderTextColor="#999"
          value={otherAllergy}
          onChangeText={setOtherAllergy}
        />

        {/* Language */}
        <Text style={styles.label}>Preferred language for messages</Text>
        <View style={styles.toggleRow}>
          {LANGUAGE_OPTIONS.map((lang) => {
            const active = language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.chip,
                  active && styles.chipActive,
                ]}
                onPress={() => setLanguage(lang.code)}
              >
                <Text
                  style={[
                    styles.chipText,
                    active && styles.chipTextActive,
                  ]}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            !canContinue && { opacity: 0.5 },
          ]}
          disabled={!canContinue}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>Let’s get started 💛</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F3FF",
  },
  scrollInner: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2D0A5F",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#4B3F72",
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2D0A5F",
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "white",
    fontSize: 15,
  },
  toggleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "white",
  },
  chipActive: {
    backgroundColor: "#6D28D9",
    borderColor: "#6D28D9",
  },
  chipText: {
    fontSize: 14,
    color: "#4B3F72",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "white",
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chipTag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "white",
  },
  chipTagActive: {
    backgroundColor: "#8B5CF6",
    borderColor: "#8B5CF6",
  },
  chipTagText: {
    fontSize: 13,
    color: "#4B5563",
  },
  chipTagTextActive: {
    color: "white",
    fontWeight: "600",
  },
  button: {
    marginTop: 32,
    backgroundColor: "#8B5CF6",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});