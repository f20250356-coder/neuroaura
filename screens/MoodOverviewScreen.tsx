// screens/MoodOverviewScreen.tsx
import React, { useMemo, useRef, useEffect } from "react";
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

type Props = NativeStackScreenProps<RootStackParamList, "MoodOverview">;

// Pastel palette
const PASTEL_PURPLE = "#F0D9EF";
const PASTEL_PINK = "#FCDCE1";
const PASTEL_PEACH = "#FFE6BB";
const PASTEL_YELLOW = "#E9ECCE";
const PASTEL_GREEN = "#CDE9DC";
const PASTEL_BLUE = "#C4DFE5";

// We’ll normalize everything into these keys
type MoodKey = MoodType | "idk";

const MOOD_META: Record<MoodKey, { label: string; emoji: string; color: string }> = {
  calm: { label: "Calm", emoji: "😌", color: PASTEL_GREEN },
  okay: { label: "Okay", emoji: "🙂", color: PASTEL_BLUE },
  anxious: { label: "Anxious", emoji: "😵‍💫", color: PASTEL_PINK },
  angry: { label: "Angry", emoji: "😡", color: PASTEL_PEACH },
  sad: { label: "Sad", emoji: "😢", color: PASTEL_PURPLE },
  idk: { label: "I don’t know", emoji: "🤷", color: PASTEL_BLUE },
};

// ---------- helpers ----------

// Convert whatever’s stored in checkIns into a usable timestamp (ms)
const getTimestampMs = (ts: any): number | null => {
  if (typeof ts === "number") return ts;
  if (typeof ts === "string") {
    const parsed = Date.parse(ts);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
};

// Normalize any mood string to one of our MoodKey values
const normalizeMood = (raw: any): MoodKey => {
  const m = String(raw || "").trim().toLowerCase();

  if (m === "calm") return "calm";
  if (m === "okay" || m === "ok") return "okay";
  if (["anxious", "anxiety", "overwhelmed", "stressed", "stress"].includes(m))
    return "anxious";
  if (["angry", "mad", "frustrated"].includes(m)) return "angry";
  if (["sad", "down"].includes(m)) return "sad";
  if (["idk", "i dont know", "i don't know"].includes(m)) return "idk";

  return "idk";
};

// Rough heuristic: is this check-in likely coming from sensors?
const isSensorLike = (entry: any): boolean => {
  if (entry?.source === "sensor") return true;
  const syms: string[] = Array.isArray(entry?.symptoms) ? entry.symptoms : [];
  const text = syms.join(" ").toLowerCase();
  if (text.includes("phone shaken hard")) return true;
  if (text.includes("very loud environment")) return true;
  if (text.includes("very bright screen")) return true;
  return false;
};

const MoodOverviewScreen: React.FC<Props> = ({ navigation }) => {
  const { profile, checkIns = [] } = useUser() as any;

  const name = profile?.name || "friend";

  // Animated mood ring
  const ringAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [ringAnim]);

  // ====== CORE STATS (only MANUAL check-ins, robust timestamps) ======
  const {
    counts,
    total,
    dominantMood,
    streak,
    todayEntries,
    daysBuckets,
  } = useMemo(() => {
    const now = Date.now();
    const sevenAgo = now - 7 * 24 * 60 * 60 * 1000;

    // 1) Parse timestamps and drop anything unusable
    const parsed = (checkIns || [])
      .map((c: any) => {
        const ts = getTimestampMs(c.timestamp);
        if (ts == null) return null;
        return { ...c, _ts: ts };
      })
      .filter(Boolean) as Array<any & { _ts: number }>;

    // 2) Last 7 days only
    const last7All = parsed.filter((c) => c._ts >= sevenAgo);

    // 3) Remove sensor-style entries (we only want manual ones in this chart)
    const last7Manual = last7All.filter((c) => !isSensorLike(c));

    // 4) Count moods
    const counts: Record<MoodKey, number> = {
      calm: 0,
      okay: 0,
      anxious: 0,
      angry: 0,
      sad: 0,
      idk: 0,
    };

    last7Manual.forEach((c) => {
      const key = normalizeMood(c.mood);
      counts[key] = (counts[key] || 0) + 1;
    });

    const total = last7Manual.length;

    // 5) Dominant mood
    let dominantMood: MoodKey = "idk";
    let maxCount = 0;
    (Object.keys(counts) as MoodKey[]).forEach((m) => {
      if (counts[m] > maxCount) {
        maxCount = counts[m];
        dominantMood = m;
      }
    });

    // 6) Streak (consecutive days with >=1 manual check-in)
    const daySet = new Set<string>();
    last7Manual.forEach((c) => {
      const d = new Date(c._ts);
      daySet.add(d.toDateString());
    });

    let streak = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      if (daySet.has(d.toDateString())) {
        streak++;
      } else {
        break;
      }
    }

    // 7) Today entries
    const todayKey = new Date().toDateString();
    const todayEntries = last7Manual.filter(
      (c) => new Date(c._ts).toDateString() === todayKey
    );

    // 8) Buckets per day for mini timeline
    const daysBuckets: {
      key: string;
      label: string;
      moods: MoodKey[];
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = d.toDateString();
      const label = d.toLocaleDateString(undefined, {
        weekday: "short",
      });

      const moods: MoodKey[] = last7Manual
        .filter((c) => new Date(c._ts).toDateString() === key)
        .map((c) => normalizeMood(c.mood));

      daysBuckets.push({ key, label, moods });
    }

    return {
      counts,
      total,
      dominantMood,
      streak,
      todayEntries,
      daysBuckets,
    };
  }, [checkIns]);
  // ====== END CORE STATS ======

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });
  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.8],
  });

  const domMeta = MOOD_META[dominantMood];

  return (
    <SafeAreaView style={styles.container}>
      {/* blobs */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.appTitle}>Mood overview</Text>
          <Text style={styles.appSubtitle}>Last 7 days · {name}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {total === 0 ? (
        <View style={styles.emptyStateWrap}>
          <Text style={styles.emptyTitle}>No data yet 🌱</Text>
          <Text style={styles.emptyBody}>
            Once you’ve done a few check-ins, NeuroAura will turn them into a
            living mood map with trends, streaks, and gentle insights.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate("CheckIn")}
          >
            <Text style={styles.emptyButtonText}>Do a first check-in</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Animated mood ring */}
          <View style={styles.ringSection}>
            <Animated.View
              style={[
                styles.ringOuter,
                {
                  backgroundColor: domMeta.color,
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
            <View style={styles.ringInner}>
              <Text style={styles.ringEmoji}>{domMeta.emoji}</Text>
              <Text style={styles.ringLabel}>{domMeta.label}</Text>
              <Text style={styles.ringSubTop}>Most common mood this week</Text>
              <Text style={styles.ringSubBottom}>
                {total} check-ins logged
              </Text>
            </View>
          </View>

          {/* mini stats row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: PASTEL_GREEN }]}>
              <Text style={styles.statLabel}>Check-in streak</Text>
              <Text style={styles.statValue}>{streak} days</Text>
              <Text style={styles.statSub}>In a row with at least 1 entry</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: PASTEL_BLUE }]}>
              <Text style={styles.statLabel}>Today’s check-ins</Text>
              <Text style={styles.statValue}>{todayEntries.length}</Text>
              <Text style={styles.statSub}>You showed up today 💛</Text>
            </View>
          </View>

          {/* horizontal mood balance bars */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mood balance this week</Text>
            <Text style={styles.sectionSub}>
              Each bar grows based on how often you logged that mood (manual
              check-ins only).
            </Text>

            {(["calm", "okay", "anxious", "angry", "sad", "idk"] as MoodKey[]).map(
              (m) => {
                const meta = MOOD_META[m];
                const count = counts[m] || 0;
                const ratio = total === 0 ? 0 : count / total;
                const width = Math.max(0.12, ratio); // keep bar slightly visible

                return (
                  <View key={m} style={styles.barRow}>
                    <Text style={styles.barMoodEmoji}>{meta.emoji}</Text>
                    <View style={styles.barTrack}>
                      <Animated.View
                        style={[
                          styles.barFill,
                          {
                            backgroundColor: meta.color,
                            flex: width,
                          },
                        ]}
                      />
                      <View style={{ flex: 1 - width }} />
                    </View>
                    <Text style={styles.barCount}>{count}</Text>
                  </View>
                );
              }
            )}
          </View>

          {/* timeline by day */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Week at a glance</Text>
            <Text style={styles.sectionSub}>
              Tap a day to see what your nervous system was trying to say.
            </Text>

            <View style={styles.timelineRow}>
              {daysBuckets.map((day) => {
                const hasData = day.moods.length > 0;

                let dom: MoodKey = "idk";
                let max = 0;
                const countsDay: Record<MoodKey, number> = {
                  calm: 0,
                  okay: 0,
                  anxious: 0,
                  angry: 0,
                  sad: 0,
                  idk: 0,
                };
                day.moods.forEach((m) => {
                  countsDay[m] = (countsDay[m] || 0) + 1;
                });
                (Object.keys(countsDay) as MoodKey[]).forEach((m) => {
                  if (countsDay[m] > max) {
                    max = countsDay[m];
                    dom = m;
                  }
                });
                const meta = MOOD_META[dom];

                return (
                  <TouchableOpacity
                    key={day.key}
                    style={[
                      styles.timelineDotWrap,
                      hasData && { backgroundColor: meta.color + "AA" },
                    ]}
                    activeOpacity={hasData ? 0.8 : 1}
                    onPress={() => {
                      if (!hasData) return;
                      const labelList = day.moods
                        .map((m) => MOOD_META[m].label)
                        .join(", ");
                      alert(
                        `${day.label}: you logged ${day.moods.length} time(s).\n\nMoods noticed: ${labelList}.`
                      );
                    }}
                  >
                    <Text style={styles.timelineLabel}>{day.label}</Text>
                    <View style={styles.timelineDot}>
                      <Text style={styles.timelineEmoji}>
                        {hasData ? meta.emoji : "•"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* gentle insight card */}
          <View style={styles.section}>
            <View style={styles.insightCard}>
              <Text style={styles.insightTitle}>Tiny reflection ✨</Text>
              <Text style={styles.insightBody}>
                NeuroAura isn’t here to judge patterns — only to notice them
                with you. Over time, this view will help you and your parents /
                therapist see when school, people, or environments are helping
                you feel safe… or pushing you toward overload.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default MoodOverviewScreen;

// ---------- styles ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PASTEL_YELLOW,
  },
  blobTopRight: {
    position: "absolute",
    top: -80,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 120,
    backgroundColor: PASTEL_PURPLE,
    opacity: 0.4,
  },
  blobBottomLeft: {
    position: "absolute",
    bottom: -100,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 140,
    backgroundColor: PASTEL_PINK,
    opacity: 0.45,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 4,
  },
  backText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  appTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  appSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  emptyStateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 13,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: PASTEL_BLUE,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  ringSection: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  ringOuter: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  ringInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#FFFFFFEE",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  ringEmoji: {
    fontSize: 38,
    marginBottom: 4,
  },
  ringLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  ringSubTop: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  ringSubBottom: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 12,
    marginHorizontal: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  statSub: {
    fontSize: 11,
    color: "#4B5563",
    marginTop: 4,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  barMoodEmoji: {
    width: 26,
    textAlign: "center",
    fontSize: 20,
  },
  barTrack: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
    height: 16,
  },
  barFill: {
    borderRadius: 999,
  },
  barCount: {
    width: 26,
    textAlign: "center",
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
  },
  timelineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timelineDotWrap: {
    flex: 1,
    borderRadius: 16,
    marginHorizontal: 2,
    paddingVertical: 8,
    alignItems: "center",
  },
  timelineLabel: {
    fontSize: 11,
    color: "#374151",
    marginBottom: 4,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  timelineEmoji: {
    fontSize: 18,
  },
  insightCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFFEE",
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  insightBody: {
    fontSize: 12,
    color: "#4B5563",
  },
});