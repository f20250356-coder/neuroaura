// screens/ScreenTimeRegulatorScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const BG = "#020617";
const CARD_BG = "#0F172A";
const ACCENT = "#6366F1";
const ACCENT_SOFT = "#1D2440";
const TEXT_PRIMARY = "#E5E7EB";
const TEXT_MUTED = "#9CA3AF";
const DANGER = "#F97373";

const GOAL_KEY = "@neuroaura_screen_time_goal_minutes";
const USAGE_PREFIX = "@neuroaura_screen_time_usage_"; // per-day key

type FocusPreset = 15 | 30 | 60;

const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const ScreenTimeRegulatorScreen: React.FC = () => {
  const [dailyGoal, setDailyGoal] = useState<number>(180); // minutes
  const [usedMinutes, setUsedMinutes] = useState<number>(0);

  const [activePreset, setActivePreset] = useState<FocusPreset | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isRunning, setIsRunning] = useState(false);

  // Animations
  const introOpacity = useRef(new Animated.Value(0)).current;
  const introTranslateY = useRef(new Animated.Value(16)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Load goal + today usage
  useEffect(() => {
    const load = async () => {
      try {
        const goalRaw = await AsyncStorage.getItem(GOAL_KEY);
        if (goalRaw) {
          const g = parseInt(goalRaw, 10);
          if (!Number.isNaN(g) && g > 0) setDailyGoal(g);
        }

        const usageKey = `${USAGE_PREFIX}${todayKey()}`;
        const usageRaw = await AsyncStorage.getItem(usageKey);
        if (usageRaw) {
          const u = parseInt(usageRaw, 10);
          if (!Number.isNaN(u) && u >= 0) setUsedMinutes(u);
        }
      } catch (err) {
        console.warn("Failed to load screen-time data", err);
      }
    };
    load();
  }, []);

  // Save goal
  useEffect(() => {
    const saveGoal = async () => {
      try {
        await AsyncStorage.setItem(GOAL_KEY, String(dailyGoal));
      } catch (err) {
        console.warn("Failed to save goal", err);
      }
    };
    saveGoal();
  }, [dailyGoal]);

  // Save today usage
  useEffect(() => {
    const saveUsage = async () => {
      try {
        const usageKey = `${USAGE_PREFIX}${todayKey()}`;
        await AsyncStorage.setItem(usageKey, String(usedMinutes));
      } catch (err) {
        console.warn("Failed to save usage", err);
      }
    };
    saveUsage();
  }, [usedMinutes]);

  // Intro + breathing animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(introTranslateY, {
        toValue: 0,
        duration: 550,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.95,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [introOpacity, introTranslateY, pulse]);

  // Animated progress based on usedMinutes / dailyGoal
  useEffect(() => {
    const ratio =
      dailyGoal > 0 ? Math.min(usedMinutes / dailyGoal, 1) : 0;
    Animated.timing(progressAnim, {
      toValue: ratio,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false, // animating width
    }).start();
  }, [usedMinutes, dailyGoal, progressAnim]);

  // Timer loop
  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;

    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Session finished
          setIsRunning(false);
          setActivePreset(null);
          // Convert the intended session length into minutes & add to used
          // (We could track exact time, but this is chill for now.)
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isRunning, secondsLeft]);

  // When a session finishes naturally (secondsLeft hits 0 while isRunning false),
  // add the full preset length to usedMinutes.
  useEffect(() => {
    if (secondsLeft === 0 && !isRunning && activePreset === null) {
      // Nothing to do: we only add usage when we KNOW a session was running.
      // We'll handle increment in startSession instead + manual button.
    }
  }, [secondsLeft, isRunning, activePreset]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleGoalChange = (delta: number) => {
    setDailyGoal((prev) => {
      const next = Math.min(Math.max(prev + delta, 30), 600); // clamp 30min–10h
      return next;
    });
  };

  const startSession = (minutes: FocusPreset) => {
    // If a timer is already running, tapping again will reset
    setActivePreset(minutes);
    setSecondsLeft(minutes * 60);
    setIsRunning(true);
  };

  const stopSession = () => {
    setIsRunning(false);
    setActivePreset(null);
    setSecondsLeft(0);
  };

  const addPresetToUsage = (minutes: number) => {
    setUsedMinutes((prev) => prev + minutes);
  };

  const usedLabel = `${Math.floor(usedMinutes / 60)}h ${
    usedMinutes % 60
  }m`;
  const goalLabel = `${Math.floor(dailyGoal / 60)}h ${
    dailyGoal % 60
  }m`;
  const remaining = Math.max(dailyGoal - usedMinutes, 0);
  const remainingLabel = `${Math.floor(remaining / 60)}h ${
    remaining % 60
  }m`;

  const isOverLimit = usedMinutes >= dailyGoal;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <Animated.View
        style={[
          styles.container,
          {
            opacity: introOpacity,
            transform: [{ translateY: introTranslateY }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Screen time regulator</Text>
            <Text style={styles.headerSubtitle}>
              Protect your brain from endless scrolling with gentle limits
              and focus sessions.
            </Text>
          </View>
          <View style={styles.headerIconWrapper}>
            <Ionicons name="phone-portrait-outline" size={24} color={ACCENT} />
          </View>
        </View>

        {/* Main card with animated progress */}
        <Animated.View
          style={[
            styles.mainCard,
            {
              transform: [{ scale: pulse }],
            },
          ]}
        >
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressTitle}>Today&apos;s screen time</Text>
            {isOverLimit ? (
              <View style={styles.tagDanger}>
                <Ionicons
                  name="alert-circle-outline"
                  size={14}
                  color={DANGER}
                />
                <Text style={styles.tagDangerText}>Limit crossed</Text>
              </View>
            ) : (
              <View style={styles.tagSafe}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={ACCENT}
                />
                <Text style={styles.tagSafeText}>Protected mode</Text>
              </View>
            )}
          </View>

          {/* Animated progress bar */}
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
          </View>

          {/* Numbers row */}
          <View style={styles.metricsRow}>
            <View>
              <Text style={styles.metricLabel}>Used</Text>
              <Text style={styles.metricValue}>{usedLabel}</Text>
            </View>
            <View>
              <Text style={styles.metricLabel}>Goal</Text>
              <Text style={styles.metricValue}>{goalLabel}</Text>
            </View>
            <View>
              <Text style={styles.metricLabel}>
                {isOverLimit ? "Over by" : "Remaining"}
              </Text>
              <Text
                style={[
                  styles.metricValue,
                  isOverLimit && { color: DANGER },
                ]}
              >
                {isOverLimit
                  ? `${Math.floor((usedMinutes - dailyGoal) / 60)}h ${
                      (usedMinutes - dailyGoal) % 60
                    }m`
                  : remainingLabel}
              </Text>
            </View>
          </View>

          {/* Goal adjust */}
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Daily limit</Text>
            <View style={styles.goalControls}>
              <TouchableOpacity
                style={styles.goalButton}
                onPress={() => handleGoalChange(-15)}
              >
                <Ionicons
                  name="remove-outline"
                  size={18}
                  color={TEXT_MUTED}
                />
              </TouchableOpacity>
              <Text style={styles.goalValue}>{goalLabel}</Text>
              <TouchableOpacity
                style={styles.goalButton}
                onPress={() => handleGoalChange(15)}
              >
                <Ionicons
                  name="add-outline"
                  size={18}
                  color={TEXT_MUTED}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Focus session section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Focus sessions</Text>
              <Text style={styles.sectionSubtitle}>
                Pick a mini break from your phone. When you finish, log it
                towards your healthy screen time.
              </Text>
            </View>
            <Ionicons
              name="eye-off-outline"
              size={22}
              color={TEXT_MUTED}
            />
          </View>

          <View style={styles.presetsRow}>
            {[15, 30, 60].map((m) => {
              const active = activePreset === m && isRunning;
              return (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.presetChip,
                    active && styles.presetChipActive,
                  ]}
                  onPress={() => startSession(m as FocusPreset)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.presetText,
                      active && styles.presetTextActive,
                    ]}
                  >
                    {m} min
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Timer + controls */}
          <View style={styles.timerCard}>
            <View style={styles.timerLeft}>
              <Text style={styles.timerLabel}>
                {isRunning ? "Session in progress" : "No session running"}
              </Text>
              <Text style={styles.timerValue}>
                {secondsLeft > 0
                  ? formatTime(secondsLeft)
                  : activePreset
                  ? formatTime(activePreset * 60)
                  : "00:00"}
              </Text>
              {activePreset && !isRunning && secondsLeft === 0 && (
                <Text style={styles.timerHint}>
                  Session ended. Add it to today&apos;s usage if you stayed
                  off your phone.
                </Text>
              )}
            </View>
            <View style={styles.timerButtons}>
              {isRunning ? (
                <TouchableOpacity
                  style={[styles.timerBtn, styles.timerBtnStop]}
                  onPress={stopSession}
                >
                  <Ionicons
                    name="stop-circle-outline"
                    size={18}
                    color={DANGER}
                  />
                  <Text style={styles.timerBtnTextStop}>Stop</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.timerBtn, styles.timerBtnStart]}
                  onPress={() => {
                    if (!activePreset) startSession(15);
                    else startSession(activePreset);
                  }}
                >
                  <Ionicons
                    name="play-circle-outline"
                    size={18}
                    color={ACCENT}
                  />
                  <Text style={styles.timerBtnTextStart}>Start</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.timerBtn, styles.timerBtnAdd]}
                onPress={() => {
                  if (!activePreset) {
                    // default add 15 min if nothing selected
                    addPresetToUsage(15);
                  } else {
                    addPresetToUsage(activePreset);
                  }
                }}
              >
                <Ionicons
                  name="checkmark-done-outline"
                  size={18}
                  color={ACCENT}
                />
                <Text style={styles.timerBtnTextAdd}>Log as used</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Gentle note */}
        <View style={styles.footerNoteBox}>
          <Ionicons
            name="sparkles-outline"
            size={16}
            color={TEXT_MUTED}
          />
          <Text style={styles.footerNoteText}>
            Screen time limits here are soft & self-guided. NeuroAura will
            never shame you – just gently nudge you back to balance. 💛
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

export default ScreenTimeRegulatorScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  headerSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 4,
    maxWidth: "90%",
  },
  headerIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
  },
  mainCard: {
    borderRadius: 20,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 16,
    marginBottom: 12,
  },
  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  tagSafe: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0B1220",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: ACCENT_SOFT,
  },
  tagSafeText: {
    fontSize: 11,
    color: ACCENT,
    fontWeight: "600",
  },
  tagDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#180C14",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: DANGER,
  },
  tagDangerText: {
    fontSize: 11,
    color: DANGER,
    fontWeight: "600",
  },
  progressBarWrapper: {
    marginTop: 4,
    marginBottom: 10,
  },
  progressTrack: {
    height: 14,
    borderRadius: 999,
    backgroundColor: "#020617",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    marginTop: 2,
  },
  goalRow: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#111827",
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalLabel: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  goalControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  goalValue: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    fontWeight: "600",
  },
  sectionCard: {
    borderRadius: 20,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 16,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    color: TEXT_PRIMARY,
    fontWeight: "600",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  presetsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
  },
  presetChipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  presetText: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  presetTextActive: {
    color: BG,
    fontWeight: "600",
  },
  timerCard: {
    marginTop: 6,
    borderRadius: 16,
    backgroundColor: "#050816",
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  timerLeft: {
    flex: 1.4,
  },
  timerLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  timerValue: {
    fontSize: 22,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginTop: 4,
  },
  timerHint: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  timerButtons: {
    flex: 1,
    alignItems: "flex-end",
    gap: 6,
  },
  timerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  timerBtnStart: {
    borderColor: ACCENT,
    backgroundColor: "#020617",
  },
  timerBtnStop: {
    borderColor: DANGER,
    backgroundColor: "#020617",
  },
  timerBtnAdd: {
    borderColor: "#1F2937",
    backgroundColor: "#020617",
  },
  timerBtnTextStart: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: "600",
  },
  timerBtnTextStop: {
    fontSize: 12,
    color: DANGER,
    fontWeight: "600",
  },
  timerBtnTextAdd: {
    fontSize: 12,
    color: TEXT_PRIMARY,
    fontWeight: "600",
  },
  footerNoteBox: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#111827",
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  footerNoteText: {
    fontSize: 11,
    color: TEXT_MUTED,
    flex: 1,
  },
});