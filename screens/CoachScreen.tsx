// screens/CoachScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { useUser } from "../context/UserContext";
import { t, getLangFromProfile } from "../utils/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Coach">;

const CoachScreen: React.FC<Props> = ({ navigation, route }) => {
  const { profile, lastCheckIn } = useUser();
  const lang = getLangFromProfile(profile);
  const name = profile?.name || t("generic_you", lang);
  const highRisk = route.params?.highRisk ?? false;

  // If somehow no lastCheckIn, just go home-ish
  if (!lastCheckIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.inner}>
          <Text style={styles.title}>{t("coach_title", lang)}</Text>
          <Text style={styles.subtitle}>
            I lost track of your last check-in. Let’s go back home and try again.
          </Text>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => navigation.replace("Home")}
          >
            <Text style={styles.buttonPrimaryText}>
              {t("coach_back_home", lang)}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { mood, symptoms, sleepQuality } = lastCheckIn;

  let headline = "";
  let body = "";
  let tips: string[] = [];

  if (highRisk || mood === "overwhelmed" || mood === "angry") {
    headline = "That was a big moment.";
    body = `I’m really proud of you for checking in instead of ignoring it, ${name}. That takes courage.`;

    tips.push(
      "If you can, step a little away from the noise or crowd for 1–2 minutes.",
      "Try 5 slow breaths: in for 4, hold for 4, out for 6.",
      "If you have headphones, putting them on for a bit might help your system calm down."
    );
  } else if (mood === "sad") {
    headline = "Feeling low is still valid.";
    body = `You don’t have to pretend you’re okay right now. I’m glad you told me how you feel, ${name}.`;
    tips.push(
      "If you can, text or talk to someone you trust, even just a few words.",
      "Try a tiny comfort: water, a snack, or a soft object you like.",
      "You don’t have to fix everything today. Just getting through this moment is enough."
    );
  } else {
    headline = "Thanks for checking in 💛";
    body = `Even when things feel okay, noticing your state helps you stay ahead of overload. That’s really smart, ${name}.`;
    tips.push(
      "Keep doing what works today: your brain and body like this rhythm.",
      "If things change later, you can always check in again.",
      "You’re building a habit of listening to yourself. That’s a big deal."
    );
  }

  if (sleepQuality === "bad") {
    tips.push(
      "You slept very little. Your brain might be extra sensitive today—go softer on yourself than usual."
    );
  } else if (sleepQuality === "ok") {
    tips.push(
      "Sleep was okay-ish. If you can, consider an earlier, calmer night soon."
    );
  }

  const symptomLine =
    symptoms.length > 0
      ? `You told me your body feels: ${symptoms.join(
          ", "
        )}. That makes sense with how you’re feeling.`
      : "";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollInner}>
        <Text style={styles.title}>{t("coach_title", lang)}</Text>
        <Text style={styles.subtitle}>{headline}</Text>

        <View style={styles.card}>
          <Text style={styles.cardBody}>{body}</Text>
          {symptomLine !== "" && (
            <Text style={styles.cardSymptom}>{symptomLine}</Text>
          )}
        </View>

        <View style={styles.cardTips}>
          <Text style={styles.cardTitle}>What you can do right now</Text>
          {tips.map((tip, idx) => (
            <View key={idx} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footerText}>
          You’re not “too much” for feeling this way. You’re just a human with a
          sensitive system trying to manage a loud world.
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => navigation.navigate("Tools")}
          >
            <Text style={styles.buttonPrimaryText}>
              {t("coach_use_tools", lang)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => navigation.replace("Home")}
          >
            <Text style={styles.buttonSecondaryText}>
              {t("coach_back_home", lang)}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CoachScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  scrollInner: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 15,
    color: "#4B5563",
    marginTop: 6,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  cardBody: {
    fontSize: 14,
    color: "#111827",
  },
  cardSymptom: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 8,
  },
  cardTips: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
    marginBottom: 8,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#8B5CF6",
    marginTop: 6,
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
  },
  footerText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 16,
  },
  buttonRow: {
    gap: 10,
  },
  buttonPrimary: {
    backgroundColor: "#8B5CF6",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonPrimaryText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonSecondary: {
    marginTop: 6,
    backgroundColor: "white",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  buttonSecondaryText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "600",
  },
});