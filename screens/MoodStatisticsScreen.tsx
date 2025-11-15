// screens/MoodStatisticsScreen.tsx
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
  Dimensions,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { useUser } from "../context/UserContext";
import { LineChart } from "react-native-chart-kit";

type Props = NativeStackScreenProps<RootStackParamList, "MoodStats">;

const screenWidth = Dimensions.get("window").width - 40;

// Pastel palette
const PASTEL_PURPLE = "#F0D9EF";
const PASTEL_PINK = "#FCDCE1";
const PASTEL_PEACH = "#FFE6BB";
const PASTEL_YELLOW = "#E9ECCE";
const PASTEL_GREEN = "#CDE9DC";
const PASTEL_BLUE = "#C4DFE5";

type MoodKey = "calm" | "okay" | "anxious" | "angry" | "sad" | "idk";

const MOOD_META: Record<MoodKey, { label: string; emoji: string; color: string }> =
  {
    calm: { label: "Calm", emoji: "😌", color: PASTEL_GREEN },
    okay: { label: "Okay", emoji: "🙂", color: PASTEL_BLUE },
    anxious: { label: "Anxious", emoji: "😵‍💫", color: PASTEL_PINK },
    angry: { label: "Angry", emoji: "😡", color: PASTEL_PEACH },
    sad: { label: "Sad", emoji: "😢", color: PASTEL_PURPLE },
    idk: { label: "I don’t know", emoji: "🤷", color: PASTEL_BLUE },
  };

// Map mood → “sensory load %”
const MOOD_LOAD: Record<MoodKey, number> = {
  calm: 20,     // low
  okay: 35,     // low / medium
  anxious: 70,  // medium / high
  angry: 90,    // high
  sad: 60,      // medium
  idk: 45,      // mid
};

// ---------- helpers ----------

// Convert stored timestamp into ms
const getTimestampMs = (ts: any): number | null => {
  if (typeof ts === "number") return ts;
  if (typeof ts === "string") {
    const parsed = Date.parse(ts);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
};

// Normalize whatever mood string we stored into a MoodKey
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

// Detect sensor-generated logs so we can ignore them in stats
const isSensorLike = (entry: any): boolean => {
  if (entry?.source === "sensor") return true;
  const syms: string[] = Array.isArray(entry?.symptoms) ? entry.symptoms : [];
  const text = syms.join(" ").toLowerCase();
  if (text.includes("phone shaken hard")) return true;
  if (text.includes("very loud environment")) return true;
  if (text.includes("very bright screen")) return true;
  return false;
};

type DayBucket = {
  key: string; // date.toDateString()
  dateLabel: string; // "12"
  longLabel: string; // "12 Nov"
  moods: MoodKey[];
};

const MoodStatisticsScreen: React.FC<Props> = ({ navigation }) => {
  const { profile, checkIns = [] } = useUser() as any;
  const name = profile?.name || "friend";

  // Fade / scale animation for the whole stats area
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // ========= 1. TODAY'S SENSORY LOAD TIMELINE =========
  const {
    todayLabels,
    todayValues,
    todayAny,
  }: {
    todayLabels: string[];
    todayValues: number[];
    todayAny: boolean;
  } = useMemo(() => {
    const now = new Date();
    const todayKey = now.toDateString();

    const parsed = (checkIns || [])
      .map((c: any) => {
        const ts = getTimestampMs(c.timestamp);
        if (ts == null) return null;
        return { ...c, _ts: ts };
      })
      .filter(Boolean) as Array<any & { _ts: number }>;

    const todayManual = parsed
      .filter(
        (c) =>
          new Date(c._ts).toDateString() === todayKey && !isSensorLike(c)
      )
      .sort((a, b) => a._ts - b._ts);

    if (todayManual.length === 0) {
      return { todayLabels: [], todayValues: [], todayAny: false };
    }

    const todayLabels: string[] = [];
    const todayValues: number[] = [];

    todayManual.forEach((entry) => {
      const d = new Date(entry._ts);
      const hours = d.getHours();
      const minutes = d.getMinutes();
      const label = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;

      const moodKey = normalizeMood(entry.mood);
      const load = MOOD_LOAD[moodKey] ?? 40;

      todayLabels.push(label);
      todayValues.push(load);
    });

    return { todayLabels, todayValues, todayAny: true };
  }, [checkIns]);

  // ========= 2. LAST 4 WEEKS CALENDAR STATS =========
  const {
    weeks,
    legendCounts,
    loggedDayCount,
    totalDays,
    anyData,
  }: {
    weeks: DayBucket[][];
    legendCounts: Record<MoodKey, number>;
    loggedDayCount: number;
    totalDays: number;
    anyData: boolean;
  } = useMemo(() => {
    const now = Date.now();
    const rangeDays = 28; // last 4 weeks

    const parsed = (checkIns || [])
      .map((c: any) => {
        const ts = getTimestampMs(c.timestamp);
        if (ts == null) return null;
        return { ...c, _ts: ts };
      })
      .filter(Boolean) as Array<any & { _ts: number }>;

    const earliest = now - rangeDays * 24 * 60 * 60 * 1000;
    const recentManual = parsed.filter(
      (c) => c._ts >= earliest && !isSensorLike(c)
    );

    const dayMap = new Map<string, DayBucket>();
    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(now - (rangeDays - 1 - i) * 24 * 60 * 60 * 1000);
      const key = d.toDateString();
      const dateLabel = String(d.getDate());
      const longLabel = d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      });

      dayMap.set(key, {
        key,
        dateLabel,
        longLabel,
        moods: [],
      });
    }

    recentManual.forEach((entry) => {
      const d = new Date(entry._ts);
      const key = d.toDateString();
      const bucket = dayMap.get(key);
      if (!bucket) return;
      bucket.moods.push(normalizeMood(entry.mood));
    });

    const days = Array.from(dayMap.values());

    const weeks: DayBucket[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    const legendCounts: Record<MoodKey, number> = {
      calm: 0,
      okay: 0,
      anxious: 0,
      angry: 0,
      sad: 0,
      idk: 0,
    };

    days.forEach((day) => {
      if (day.moods.length === 0) return;
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
      let dom: MoodKey = "idk";
      let max = 0;
      (Object.keys(countsDay) as MoodKey[]).forEach((m) => {
        if (countsDay[m] > max) {
          max = countsDay[m];
          dom = m;
        }
      });
      legendCounts[dom] = (legendCounts[dom] || 0) + 1;
    });

    const loggedDayCount = days.filter((d) => d.moods.length > 0).length;
    const totalDays = days.length;
    const anyData = loggedDayCount > 0;

    return { weeks, legendCounts, loggedDayCount, totalDays, anyData };
  }, [checkIns]);

  const containerStyle = {
    opacity: fadeAnim,
    transform: [
      {
        translateY: fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* background blobs */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.appTitle}>Mood statistics</Text>
          <Text style={styles.appSubtitle}>
            Sensory load & calendar · {name}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <Animated.View style={[styles.animatedContainer, containerStyle]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ========== TODAY'S SENSORY LOAD GRAPH ========== */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today’s sensory risk timeline</Text>
            <Text style={styles.sectionSub}>
              Based on your check-ins and moods logged throughout the day.
            </Text>

            {todayAny ? (
              <View style={styles.chartCard}>
                <LineChart
                  data={{
                    labels: todayLabels,
                    datasets: [
                      {
                        data: todayValues,
                      },
                    ],
                  }}
                  width={screenWidth}
                  height={220}
                  fromZero
                  yAxisSuffix="%"
                  yAxisInterval={1}
                  chartConfig={{
                    backgroundColor: "#FFFFFF",
                    backgroundGradientFrom: "#FFFFFF",
                    backgroundGradientTo: "#FFFFFF",
                    decimalPlaces: 0,
                    color: (opacity = 1) =>
                      `rgba(17, 24, 39, ${opacity})`, // line + labels
                    labelColor: (opacity = 1) =>
                      `rgba(55, 65, 81, ${opacity})`,
                    propsForDots: {
                      r: "5",
                      strokeWidth: "2",
                      stroke: "#FFFFFF",
                    },
                  }}
                  style={styles.chart}
                  bezier
                />

                {/* Legend: low / medium / high */}
                <View style={styles.loadLegendRow}>
                  <View style={styles.loadLegendItem}>
                    <View
                      style={[
                        styles.loadLegendDot,
                        { backgroundColor: PASTEL_GREEN },
                      ]}
                    />
                    <Text style={styles.loadLegendText}>Low sensory load</Text>
                  </View>
                  <View style={styles.loadLegendItem}>
                    <View
                      style={[
                        styles.loadLegendDot,
                        { backgroundColor: PASTEL_PEACH },
                      ]}
                    />
                    <Text style={styles.loadLegendText}>
                      Medium sensory load
                    </Text>
                  </View>
                  <View style={styles.loadLegendItem}>
                    <View
                      style={[
                        styles.loadLegendDot,
                        { backgroundColor: PASTEL_PINK },
                      ]}
                    />
                    <Text style={styles.loadLegendText}>
                      High sensory load
                    </Text>
                  </View>
                </View>

                <Text style={styles.loadHint}>
                  Calm / Okay → low · Anxious / Sad → medium · Angry → high.
                </Text>
              </View>
            ) : (
              <View style={styles.emptyTodayCard}>
                <Text style={styles.emptyTitle}>No check-ins yet today 🌤️</Text>
                <Text style={styles.emptyBody}>
                  Once you log how you’re feeling, I’ll turn it into a line that
                  shows how your sensory load changes across the day.
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate("CheckIn")}
                >
                  <Text style={styles.emptyButtonText}>
                    Do a check-in now
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ========== SUMMARY STRIP & LEGEND ========== */}
          {anyData && (
            <>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Check-in consistency</Text>
                <Text style={styles.summaryBody}>
                  You logged your mood on{" "}
                  <Text style={styles.summaryHighlight}>
                    {loggedDayCount}/{totalDays}
                  </Text>{" "}
                  days in the last 4 weeks. That’s{" "}
                  <Text style={styles.summaryHighlight}>
                    {Math.round((loggedDayCount / totalDays) * 100)}%
                  </Text>{" "}
                  of days. This history helps spot patterns in your week. 💛
                </Text>
              </View>

              <View style={styles.legendRow}>
                {(Object.keys(MOOD_META) as MoodKey[]).map((m) => {
                  const meta = MOOD_META[m];
                  const daysCount = legendCounts[m] || 0;
                  if (daysCount === 0) return null;
                  return (
                    <View key={m} style={styles.legendChip}>
                      <View
                        style={[
                          styles.legendColorDot,
                          { backgroundColor: meta.color },
                        ]}
                      />
                      <Text style={styles.legendText}>
                        {meta.emoji} {meta.label} · {daysCount} day
                        {daysCount === 1 ? "" : "s"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* ========== 4-WEEK MOOD CALENDAR ========== */}
          {anyData && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Mood calendar (4 weeks)</Text>
                <Text style={styles.sectionSub}>
                  Each circle is a day. Tap to see moods logged that day.
                </Text>
              </View>

              <View style={styles.calendarCard}>
                {weeks.map((week, wi) => (
                  <View key={wi} style={styles.weekRow}>
                    <Text style={styles.weekLabel}>W{wi + 1}</Text>
                    {week.map((day) => {
                      const hasData = day.moods.length > 0;

                      let dom: MoodKey = "idk";
                      if (hasData) {
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
                        let max = 0;
                        (Object.keys(countsDay) as MoodKey[]).forEach((m) => {
                          if (countsDay[m] > max) {
                            max = countsDay[m];
                            dom = m;
                          }
                        });
                      }
                      const meta = MOOD_META[dom];

                      return (
                        <TouchableOpacity
                          key={day.key}
                          style={styles.dayCell}
                          activeOpacity={hasData ? 0.8 : 1}
                          onPress={() => {
                            if (!hasData) return;
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

                            const lines = (Object.keys(
                              countsDay
                            ) as MoodKey[])
                              .filter((m) => countsDay[m] > 0)
                              .map(
                                (m) =>
                                  `${MOOD_META[m].label}: ${
                                    countsDay[m]
                                  } time${countsDay[m] === 1 ? "" : "s"}`
                              );

                            alert(
                              `${day.longLabel}\n\nYou checked in ${
                                day.moods.length
                              } time${
                                day.moods.length === 1 ? "" : "s"
                              }.\n\n${lines.join("\n")}`
                            );
                          }}
                        >
                          <View
                            style={[
                              styles.dayDot,
                              {
                                backgroundColor: hasData
                                  ? meta.color
                                  : "rgba(229,231,235,0.8)",
                                borderWidth: hasData ? 0 : 1,
                                borderColor: "rgba(209,213,219,1)",
                              },
                            ]}
                          >
                            <Text style={styles.dayEmoji}>
                              {hasData ? meta.emoji : "·"}
                            </Text>
                          </View>
                          <Text style={styles.dayLabel}>{day.dateLabel}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>

              <View style={styles.footerCard}>
                <Text style={styles.footerTitle}>How to use this view 🧭</Text>
                <Text style={styles.footerBody}>
                  Watch for clusters of anxious or angry days around tests,
                  crowded places, or loud environments. Share this page with
                  parents or a therapist so they can help protect the green &
                  blue days and plan around the pink & purple ones.
                </Text>
              </View>
            </>
          )}

          {!anyData && (
            <View style={{ height: 40 }} />
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

export default MoodStatisticsScreen;

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
  animatedContainer: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
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
  chartCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFFEE",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  chart: {
    borderRadius: 16,
  },
  loadLegendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  loadLegendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  loadLegendText: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "600",
  },
  loadHint: {
    fontSize: 11,
    color: "#4B5563",
    marginTop: 6,
  },
  emptyTodayCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFFEE",
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
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
    alignSelf: "center",
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  summaryCard: {
    backgroundColor: "#FFFFFFEE",
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  summaryBody: {
    fontSize: 12,
    color: "#4B5563",
  },
  summaryHighlight: {
    fontWeight: "800",
    color: "#111827",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    marginRight: 6,
    marginBottom: 6,
  },
  legendColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: "#111827",
    fontWeight: "600",
  },
  sectionHeaderRow: {
    marginBottom: 8,
  },
  calendarCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFFEE",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: 16,
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  weekLabel: {
    width: 28,
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  dayEmoji: {
    fontSize: 18,
  },
  dayLabel: {
    fontSize: 11,
    color: "#374151",
  },
  footerCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFFEE",
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  footerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  footerBody: {
    fontSize: 12,
    color: "#4B5563",
  },
});