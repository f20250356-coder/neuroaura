// screens/CheckInScreen.tsx
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { useUser, MoodType } from "../context/UserContext";

type Props = NativeStackScreenProps<RootStackParamList, "CheckIn">;

const PASTEL_PURPLE = "#F0D9EF";
const PASTEL_PINK = "#FCDCE1";
const PASTEL_PEACH = "#FFE6BB";
const PASTEL_YELLOW = "#E9ECCE";
const PASTEL_GREEN = "#CDE9DC";
const PASTEL_BLUE = "#C4DFE5";

type MoodKey = MoodType | "idk";

const MOOD_META: Record<
  MoodKey,
  { label: string; emoji: string; color: string }
> = {
  calm: { label: "Calm", emoji: "😌", color: PASTEL_GREEN },
  okay: { label: "Okay", emoji: "🙂", color: PASTEL_BLUE },
  overwhelmed: { label: "Anxious", emoji: "😵‍💫", color: PASTEL_PINK },
  angry: { label: "Angry", emoji: "😡", color: PASTEL_PEACH },
  sad: { label: "Sad", emoji: "😢", color: PASTEL_PURPLE },
  idk: { label: "I don’t know", emoji: "🤷", color: PASTEL_BLUE },
};

const BODY_OPTIONS = [
  "Headache",
  "Heart beating fast",
  "Stomach feels weird",
  "Noise too much",
  "Lights too bright",
  "Hard to sit still",
  "Very tired",
];

const CheckInScreen: React.FC<Props> = ({ navigation }) => {
  const { addCheckIn, profile } = useUser() as any;
  const name = profile?.name || "friend";

  const [selectedMood, setSelectedMood] = useState<MoodKey | null>(null);
  const [selectedBody, setSelectedBody] = useState<string[]>([]);
  const [showSupportCard, setShowSupportCard] = useState(false);

  // Overflow menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(menuAnim, {
      toValue: menuOpen ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [menuOpen, menuAnim]);

  const menuStyle = {
    opacity: menuAnim,
    transform: [
      {
        translateY: menuAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-10, 0],
        }),
      },
      {
        scale: menuAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.95, 1],
        }),
      },
    ],
  };

  // Toggle body symptom chips
  const toggleBody = (label: string) => {
    setSelectedBody((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  };

  // When user taps "Log this check-in"
  const handleConfirm = () => {
    if (!selectedMood) return;

    const bodyCopy =
      selectedBody.length > 0
        ? selectedBody
        : ["No body notes added this time"];

    addCheckIn?.(selectedMood === "idk" ? "idk" : selectedMood, bodyCopy);
    setShowSupportCard(true);
  };

  // Mood-specific supportive suggestions
  const supportText = useMemo(() => {
    if (!selectedMood)
      return {
        title: "I hear you. It sounds like a lot right now 💛",
        body:
          "Once you pick how you feel and what your body is doing, I can suggest a tiny next step — not to fix everything, just to make this moment 1% easier.",
      };

    if (selectedMood === "calm") {
      return {
        title: "Love this calm moment for you 💚",
        body:
          "You checked in with Calm. This is a great time to recharge, enjoy something you like, or prepare gently for your next task. Want to lock this feeling in with a quick ritual?",
      };
    }
    if (selectedMood === "okay") {
      return {
        title: "Not bad, just floating along 🌤️",
        body:
          "You checked in with Okay. Things might not be perfect, but they’re manageable. Together we can keep it from sliding into overwhelm.",
      };
    }
    if (selectedMood === "overwhelmed") {
      return {
        title: "It’s a lot. I’m staying with you here 💛",
        body:
          "You checked in with Anxious. Your brain is trying to protect you by scanning for danger. Let’s give it a tiny break with something grounding.",
      };
    }
    if (selectedMood === "angry") {
      return {
        title: "Big anger = big energy 🔥",
        body:
          "You checked in with Angry. That energy is valid. Before it explodes outward, let’s give it a safe exit — a shake, a stomp, or a deep breath.",
      };
    }
    if (selectedMood === "sad") {
      return {
        title: "Sad doesn’t mean weak 🌧️",
        body:
          "You checked in with Sad. Your feelings are telling you something important. We don’t have to fix it right now — just soften it a bit.",
      };
    }
    // idk
    return {
      title: "Not sure how you feel? That’s okay too 🤍",
      body:
        "Sometimes it’s hard to find the right word. Logging “I don’t know” is still data. We can still try a gentle tool that might help.",
    };
  }, [selectedMood]);

  return (
    <SafeAreaView style={styles.container}>
      {/* soft blobs */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      {/* HEADER */}
      <View style={styles.headerRow}>
        {/* burger / overflow */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuOpen((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.appTitle}>NeuroAura</Text>
          <Text style={styles.appSubtitle}>Check-in time ⏰</Text>
        </View>

        {/* simple profile pill */}
        <View style={styles.profilePill}>
          <Text style={styles.profileEmoji}>🫶</Text>
        </View>
      </View>

      {/* BIG DROPDOWN MENU */}
      {menuOpen && (
        <Animated.View style={[styles.menuOverlay, menuStyle]}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>Dashboard</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                navigation.navigate("MoodOverview");
              }}
            >
              <Text style={styles.menuItemEmoji}>📊</Text>
              <View style={styles.menuItemTextWrap}>
                <Text style={styles.menuItemTitle}>Mood overview</Text>
                <Text style={styles.menuItemSubtitle}>
                  Most common moods, streaks & weekly trends.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                navigation.navigate("MoodStats");
              }}
            >
              <Text style={styles.menuItemEmoji}>📈</Text>
              <View style={styles.menuItemTextWrap}>
                <Text style={styles.menuItemTitle}>Mood statistics</Text>
                <Text style={styles.menuItemSubtitle}>
                  Sensory risk timeline & calendar graph.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                alert("Schedule calendar coming soon 💡");
              }}
            >
              <Text style={styles.menuItemEmoji}>🗓️</Text>
              <View style={styles.menuItemTextWrap}>
                <Text style={styles.menuItemTitle}>Schedule calendar</Text>
                <Text style={styles.menuItemSubtitle}>
                  See how events line up with your moods. (Soon)
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                alert("Screen time regulator coming soon 📵");
              }}
            >
              <Text style={styles.menuItemEmoji}>📱</Text>
              <View style={styles.menuItemTextWrap}>
                <Text style={styles.menuItemTitle}>Screen time regulator</Text>
                <Text style={styles.menuItemSubtitle}>
                  Gentle nudges when scrolling gets too heavy. (Soon)
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                alert("Support tools minigames coming soon 🎮");
              }}
            >
              <Text style={styles.menuItemEmoji}>🧩</Text>
              <View style={styles.menuItemTextWrap}>
                <Text style={styles.menuItemTitle}>Support tools</Text>
                <Text style={styles.menuItemSubtitle}>
                  Mini-games & coping tools designed for your brain.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                alert("Rewards & points system coming soon ⭐");
              }}
            >
              <Text style={styles.menuItemEmoji}>🏅</Text>
              <View style={styles.menuItemTextWrap}>
                <Text style={styles.menuItemTitle}>Rewards</Text>
                <Text style={styles.menuItemSubtitle}>
                  Earn points for check-ins & calm actions.
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* MAIN SCROLL AREA */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greetingWrap}>
          <Text style={styles.greetingTitle}>Hi {name},</Text>
          <Text style={styles.greetingBody}>
            Let’s check how your brain and body are doing right now. You can tap
            more than one thing — there are no wrong answers here 💛
          </Text>
        </View>

        {/* Mood grid */}
        <Text style={styles.sectionLabel}>What’s your mood right now? 👇</Text>
        <View style={styles.moodGrid}>
          {(["calm", "okay", "overwhelmed", "angry", "sad", "idk"] as MoodKey[])
            .map((mood) => {
              const meta = MOOD_META[mood];
              const isActive = selectedMood === mood;
              return (
                <TouchableOpacity
                  key={mood}
                  style={[
                    styles.moodCard,
                    { backgroundColor: meta.color },
                    isActive && styles.moodCardActive,
                  ]}
                  activeOpacity={0.9}
                  onPress={() => {
                    setSelectedMood(mood);
                    setShowSupportCard(false);
                  }}
                >
                  <Text style={styles.moodEmoji}>{meta.emoji}</Text>
                  <Text style={styles.moodLabel}>{meta.label}</Text>
                </TouchableOpacity>
              );
            })}
        </View>

        {/* Body section */}
        <Text style={styles.sectionLabel}>What is your body saying? 👇</Text>
        <Text style={styles.sectionHelper}>
          You can tap more than one. This helps me understand if you’re getting
          close to anxiety / overload.
        </Text>

        <View style={styles.chipWrap}>
          {BODY_OPTIONS.map((opt) => {
            const active = selectedBody.includes(opt);
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => {
                  toggleBody(opt);
                  setShowSupportCard(false);
                }}
                activeOpacity={0.9}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !selectedMood && { opacity: 0.4 },
          ]}
          disabled={!selectedMood}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmText}>
            ✅ Log this check-in & get support
          </Text>
        </TouchableOpacity>

        {/* SUPPORTIVE RESPONSE CARD */}
        {showSupportCard && selectedMood && (
          <View style={styles.supportCard}>
            <Text style={styles.supportTitle}>{supportText.title}</Text>
            <Text style={styles.supportBody}>{supportText.body}</Text>

            <TouchableOpacity
              style={[styles.supportAction, { backgroundColor: PASTEL_GREEN }]}
              onPress={() =>
                alert(
                  "Here we’ll start a 2-minute breathing animation with a calming timer."
                )
              }
            >
              <Text style={styles.supportActionText}>
                🧘 Start a 2-minute breathing exercise
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.supportAction, { backgroundColor: PASTEL_BLUE }]}
              onPress={() =>
                alert(
                  "Here we’ll open a 5-sense grounding mini-game (touch, see, hear, smell, taste)."
                )
              }
            >
              <Text style={styles.supportActionText}>
                🧩 Try a 5-sense grounding game
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.supportAction, { backgroundColor: "#F5F5F5" }]}
              onPress={() => setShowSupportCard(false)}
            >
              <Text style={[styles.supportActionText, { color: "#111827" }]}>
                📒 No thanks, just logging for now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowSupportCard(false)}
              style={styles.supportClose}
            >
              <Text style={styles.supportCloseText}>Close for now ✨</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default CheckInScreen;

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PASTEL_YELLOW,
  },
  blobTopRight: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 140,
    backgroundColor: PASTEL_PURPLE,
    opacity: 0.4,
  },
  blobBottomLeft: {
    position: "absolute",
    bottom: -120,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 160,
    backgroundColor: PASTEL_PINK,
    opacity: 0.45,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 8,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#F9FAFBCC",
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: {
    fontSize: 20,
    color: "#111827",
    fontWeight: "700",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  appSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  profilePill: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#F9FAFBCC",
    alignItems: "center",
    justifyContent: "center",
  },
  profileEmoji: {
    fontSize: 22,
  },
  menuOverlay: {
    position: "absolute",
    top: 70,
    left: 16,
    right: 16,
    zIndex: 50,
  },
  menuCard: {
    borderRadius: 24,
    backgroundColor: "#FFFFFFEE",
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: "flex-start",
  },
  menuItemEmoji: {
    fontSize: 20,
    marginRight: 8,
    marginTop: 2,
  },
  menuItemTextWrap: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  greetingWrap: {
    marginBottom: 12,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  greetingBody: {
    fontSize: 13,
    color: "#4B5563",
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginTop: 12,
    marginBottom: 4,
  },
  sectionHelper: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  moodCard: {
    width: "48%",
    borderRadius: 24,
    paddingVertical: 18,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "rgba(0,0,0,0.1)",
  },
  moodCardActive: {
    borderColor: "#111827",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  moodEmoji: {
    fontSize: 30,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    marginRight: 6,
    marginBottom: 6,
  },
  chipActive: {
    backgroundColor: PASTEL_BLUE,
  },
  chipText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#111827",
  },
  confirmButton: {
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    fontSize: 14,
    color: "#F9FAFB",
    fontWeight: "700",
  },
  supportCard: {
    borderRadius: 26,
    backgroundColor: "#FFFFFFEE",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  supportBody: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 12,
  },
  supportAction: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  supportActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  supportClose: {
    marginTop: 4,
    alignItems: "center",
  },
  supportCloseText: {
    fontSize: 13,
    color: "#4B5563",
    textDecorationLine: "underline",
  },
});