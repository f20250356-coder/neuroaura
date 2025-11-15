// screens/ParentScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { useUser } from "../context/UserContext";
import { t, getLangFromProfile } from "../utils/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Parent">;

const ParentScreen: React.FC<Props> = ({ navigation }) => {
  const { profile, lastCheckIn } = useUser();
  const lang = getLangFromProfile(profile);

  const name = profile?.name || "your child";
  const isTeen = profile?.ageMode === "teen";

  // Mood + risk summarization
  let moodText = "No recent mood check";
  let zoneLabel = "No zone yet";
  let zoneColor = "#9CA3AF";
  let riskExplanation =
    "Once your child logs how they feel, you’ll see a summary of their stress level here.";

  if (lastCheckIn) {
    switch (lastCheckIn.mood) {
      case "calm":
        moodText = "Calm / manageable";
        break;
      case "okay":
        moodText = "Mostly okay";
        break;
      case "sad":
        moodText = "Feeling low";
        break;
      case "overwhelmed":
        moodText = "Overwhelmed / overloaded";
        break;
      case "angry":
        moodText = "Very stressed / angry";
        break;
    }

    let riskScore = 0;
    switch (lastCheckIn.mood) {
      case "calm":
        riskScore = 15;
        break;
      case "okay":
        riskScore = 35;
        break;
      case "sad":
        riskScore = 55;
        break;
      case "overwhelmed":
        riskScore = 70;
        break;
      case "angry":
        riskScore = 80;
        break;
    }
    riskScore += (lastCheckIn.symptoms?.length || 0) * 5;
    if (lastCheckIn.sleepQuality === "bad") riskScore += 10;
    if (lastCheckIn.sleepQuality === "good") riskScore -= 5;
    if (riskScore < 0) riskScore = 0;
    if (riskScore > 100) riskScore = 100;

    if (riskScore <= 30) {
      zoneLabel = "Green zone (low stress)";
      zoneColor = "#22C55E";
      riskExplanation =
        "Their system looks relatively calm right now. This is a good window for regular tasks or schoolwork.";
    } else if (riskScore <= 65) {
      zoneLabel = "Yellow zone (rising stress)";
      zoneColor = "#FACC15";
      riskExplanation =
        "They might be getting stretched or overstimulated. Gentle breaks, quieter spaces, or headphones may help.";
    } else {
      zoneLabel = "Red zone (high stress)";
      zoneColor = "#EF4444";
      riskExplanation =
        "Their system is likely overloaded. This is where meltdown, shutdown, or panic is more likely if support isn’t given.";
    }
  }

  const symptomsLine =
    lastCheckIn && lastCheckIn.symptoms.length > 0
      ? lastCheckIn.symptoms.join(", ")
      : "None logged in the last check-in.";

  let sleepLine = "Not logged yet.";
  if (lastCheckIn && lastCheckIn.sleepQuality) {
    if (lastCheckIn.sleepQuality === "good") {
      sleepLine = "Slept fairly well last night.";
    } else if (lastCheckIn.sleepQuality === "ok") {
      sleepLine = "Sleep was okay-ish last night.";
    } else if (lastCheckIn.sleepQuality === "bad") {
      sleepLine = "Reported very low sleep last night (extra sensitive).";
    }
  }

  const watchList =
    profile && (profile.sensitivities.length > 0 || profile.allergies.length > 0)
      ? [...profile.sensitivities, ...profile.allergies].join(", ")
      : "Not specified yet.";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.header}>{t("parent_header", lang)}</Text>
        <Text style={styles.subheader}>
          {t("parent_subheader", lang).replace("{name}", name)}
        </Text>

        {!isTeen && (
          <Text style={styles.infoBanner}>
            Note: This profile is currently set as “Adult (18+)”. In a real
            deployment, parent alerts are only active for teen accounts.
          </Text>
        )}

        {/* Zone card */}
        <View style={styles.zoneCard}>
          <Text style={styles.cardTitle}>Stress & sensory zone</Text>
          <Text style={[styles.zoneLabel, { color: zoneColor }]}>
            {zoneLabel}
          </Text>
          <View style={styles.zoneBar}>
            <View style={[styles.segment, { backgroundColor: "#22C55E" }]} />
            <View style={[styles.segment, { backgroundColor: "#FACC15" }]} />
            <View style={[styles.segment, { backgroundColor: "#EF4444" }]} />
          </View>
          <Text style={styles.cardBody}>{riskExplanation}</Text>
        </View>

        {/* Mood + body summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last check-in summary</Text>

          <Text style={styles.label}>Mood:</Text>
          <Text style={styles.value}>{moodText}</Text>

          <Text style={styles.label}>Body signals they reported:</Text>
          <Text style={styles.value}>{symptomsLine}</Text>

          <Text style={styles.label}>Sleep context:</Text>
          <Text style={styles.value}>{sleepLine}</Text>
        </View>

        {/* Triggers / sensitivities */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Their sensitivities & triggers</Text>
          <Text style={styles.value}>{watchList}</Text>
          <Text style={styles.hint}>
            In real use, NeuroAura can warn them (and you) when the environment
            looks risky for these triggers (e.g., loud spaces, bright rooms,
            crowded events).
          </Text>
        </View>

        {/* "Alert" explanation */}
        <View style={styles.cardSoft}>
          <Text style={styles.cardTitle}>How parent alerts would work</Text>
          <Text style={styles.value}>
            When {name} enters a Red zone moment (very high stress or overload),
            NeuroAura can:
          </Text>
          <Text style={styles.bullet}>
            • Nudge them to step away and use coping tools.
          </Text>
          <Text style={styles.bullet}>
            • Optionally notify you with a short summary like:
          </Text>
          <Text style={styles.quote}>
            “High stress moment detected: overwhelmed in a noisy / crowded
            environment. This may be a good time to check in.”
          </Text>
          <Text style={styles.hint}>
            For this hackathon prototype, alerts are shown here in the app. In a
            full version, this could be SMS, email, or a parent mobile app.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.replace("Home")}
        >
          <Text style={styles.backButtonText}>Back to main view</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ParentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  subheader: {
    fontSize: 14,
    color: "#4B5563",
    marginTop: 6,
    marginBottom: 16,
  },
  infoBanner: {
    fontSize: 12,
    color: "#92400E",
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 8,
    marginBottom: 14,
  },
  zoneCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  cardSoft: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  zoneLabel: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
    marginBottom: 4,
  },
  zoneBar: {
    flexDirection: "row",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 6,
  },
  segment: {
    flex: 1,
    height: 8,
  },
  cardBody: {
    fontSize: 13,
    color: "#4B5563",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 6,
  },
  value: {
    fontSize: 13,
    color: "#111827",
    marginTop: 2,
  },
  hint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
  },
  bullet: {
    fontSize: 13,
    color: "#111827",
    marginTop: 4,
  },
  quote: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 6,
    fontStyle: "italic",
  },
  backButton: {
    marginTop: 8,
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  backButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});