// screens/ScheduleCalendarScreen.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRIMARY_COLOR = "#6366F1";
const CARD_BG = "#0F172A";
const BG = "#020617";
const TEXT_PRIMARY = "#E5E7EB";
const TEXT_MUTED = "#9CA3AF";

const TYPE_COLORS: Record<string, string> = {
  CHECK_IN: "#F97316", // orange
  ACTIVITY: "#22C55E", // green
  THERAPY: "#6366F1", // indigo
  MEDICATION: "#EC4899", // pink
  OTHER: "#06B6D4", // cyan
};

const SCHEDULE_STORAGE_KEY_PREFIX = "@neuroaura_schedule_";

type ScheduleItem = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: "CHECK_IN" | "ACTIVITY" | "THERAPY" | "MEDICATION" | "OTHER";
  time: string; // "09:30 pm"
  repeat: "NONE" | "DAILY" | "WEEKLY";
  completed: boolean;
};

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTypeLabel(type: ScheduleItem["type"]): string {
  switch (type) {
    case "CHECK_IN":
      return "Mood check-in";
    case "ACTIVITY":
      return "Self-care activity";
    case "THERAPY":
      return "Therapy / session";
    case "MEDICATION":
      return "Medication";
    default:
      return "Other";
  }
}

function formatRepeatLabel(repeat: ScheduleItem["repeat"]): string {
  switch (repeat) {
    case "DAILY":
      return "Daily";
    case "WEEKLY":
      return "Weekly";
    default:
      return "One-time";
  }
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

interface CalendarDayCell {
  dayNumber?: number;
  dateString?: string;
}

interface ScheduleCalendarScreenProps {
  route?: { params?: { userId?: string } };
}

const ScheduleCalendarScreen: React.FC<ScheduleCalendarScreenProps> = ({
  route,
}) => {
  const userId = route?.params?.userId || "guest";

  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateString(new Date())
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formType, setFormType] =
    useState<ScheduleItem["type"]>("CHECK_IN");
  const [formRepeat, setFormRepeat] =
    useState<ScheduleItem["repeat"]>("NONE");

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // current month to show in calendar
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // -----------------------------
  // Load + persist schedule items
  // -----------------------------
  useEffect(() => {
    const load = async () => {
      try {
        const key = `${SCHEDULE_STORAGE_KEY_PREFIX}${userId}`;
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        }
      } catch (e) {
        console.warn("Failed to load schedule items", e);
      }
    };
    load();
  }, [userId]);

  useEffect(() => {
    const save = async () => {
      try {
        const key = `${SCHEDULE_STORAGE_KEY_PREFIX}${userId}`;
        await AsyncStorage.setItem(key, JSON.stringify(items));
      } catch (e) {
        console.warn("Failed to save schedule items", e);
      }
    };
    save();
  }, [items, userId]);

  // -----------------------------
  // Intro animation
  // -----------------------------
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 550,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // -----------------------------
  // Marks per date (for dots)
  // -----------------------------
  const marksByDate = useMemo(() => {
    const map: Record<string, { colors: string[] }> = {};
    items.forEach((item) => {
      if (!map[item.date]) {
        map[item.date] = { colors: [] };
      }
      const col = TYPE_COLORS[item.type] || PRIMARY_COLOR;
      if (!map[item.date].colors.includes(col)) {
        map[item.date].colors.push(col);
      }
    });
    return map;
  }, [items]);

  // -----------------------------
  // Build month grid for custom calendar
  // -----------------------------
  const monthMatrix: CalendarDayCell[][] = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth(); // 0-11

    const firstDayOfMonth = new Date(year, month, 1);
    const firstWeekdayIndex = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: CalendarDayCell[] = [];

    // Leading blanks
    for (let i = 0; i < firstWeekdayIndex; i++) {
      cells.push({});
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dateString = formatDateString(dateObj);
      cells.push({ dayNumber: day, dateString });
    }

    // Trailing blanks so length is multiple of 7
    while (cells.length % 7 !== 0) {
      cells.push({});
    }

    // Chunk into weeks
    const weeks: CalendarDayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  }, [currentMonth]);

  // Keep currentMonth synced if selectedDate jumps to another month
  useEffect(() => {
    if (!selectedDate) return;
    const [y, m] = selectedDate.split("-").map((s) => parseInt(s, 10));
    const curYear = currentMonth.getFullYear();
    const curMonthIdx = currentMonth.getMonth() + 1;
    if (y !== curYear || m !== curMonthIdx) {
      setCurrentMonth(new Date(y, m - 1, 1));
    }
  }, [selectedDate, currentMonth]);

  const itemsForSelectedDate = useMemo(
    () =>
      items
        .filter((i) => i.date === selectedDate)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [items, selectedDate]
  );

  // -----------------------------
  // Actions
  // -----------------------------
  const openModal = () => {
    setFormTitle("");
    setFormTime("");
    setFormType("CHECK_IN");
    setFormRepeat("NONE");
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleAdd = () => {
    if (!formTitle.trim()) {
      Alert.alert("Title required", "Give this schedule a name.");
      return;
    }
    if (!formTime.trim()) {
      Alert.alert("Time required", 'Add a time like "09:30 pm".');
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const newItem: ScheduleItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: selectedDate,
      title: formTitle.trim(),
      type: formType,
      time: formTime.trim(),
      repeat: formRepeat,
      completed: false,
    };

    setItems((prev) => [...prev, newItem]);
    closeModal();
  };

  const toggleComplete = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const confirmDelete = (id: string) => {
    Alert.alert("Delete schedule?", "This will remove it from your calendar.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          LayoutAnimation.configureNext(
            LayoutAnimation.Presets.easeInEaseOut
          );
          setItems((prev) => prev.filter((i) => i.id !== id));
        },
      },
    ]);
  };

  const quickAdd = (
    title: string,
    type: ScheduleItem["type"],
    time: string,
    repeat: ScheduleItem["repeat"] = "NONE"
  ) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newItem: ScheduleItem = {
      id: `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      date: selectedDate,
      title,
      type,
      time,
      repeat,
      completed: false,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const goPrevMonth = () => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    setCurrentMonth(new Date(y, m - 1, 1));
  };

  const goNextMonth = () => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    setCurrentMonth(new Date(y, m + 1, 1));
  };

  const renderItem = ({ item }: { item: ScheduleItem }) => (
    <TouchableOpacity
      onPress={() => toggleComplete(item.id)}
      onLongPress={() => confirmDelete(item.id)}
      style={[styles.taskCard, item.completed && styles.taskCardDone]}
      activeOpacity={0.9}
    >
      <View style={styles.taskLeft}>
        <View
          style={[
            styles.typeDot,
            { backgroundColor: TYPE_COLORS[item.type] || PRIMARY_COLOR },
          ]}
        />
        <View style={styles.taskTextWrapper}>
          <Text
            style={[styles.taskTitle, item.completed && styles.taskTitleDone]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.taskMeta} numberOfLines={1}>
            {formatTypeLabel(item.type)} • {item.time}
            {item.repeat !== "NONE"
              ? ` • ${formatRepeatLabel(item.repeat)}`
              : ""}
          </Text>
        </View>
      </View>
      <Ionicons
        name={item.completed ? "checkmark-circle" : "ellipse-outline"}
        size={24}
        color={item.completed ? PRIMARY_COLOR : "#4B5563"}
      />
    </TouchableOpacity>
  );

  const completedCount = itemsForSelectedDate.filter((i) => i.completed).length;

  const currentMonthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Schedule calendar</Text>
            <Text style={styles.headerSubtitle}>
              Plan check-ins, self-care and sessions in one place.
            </Text>
          </View>
          <View style={styles.headerIconWrapper}>
            <Ionicons
              name="calendar"
              size={26}
              color={PRIMARY_COLOR}
            />
          </View>
        </View>

        {/* Custom Calendar Card */}
        <View style={styles.calendarCard}>
          {/* Month header */}
          <View style={styles.monthHeaderRow}>
            <TouchableOpacity
              onPress={goPrevMonth}
              style={styles.monthArrow}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{currentMonthLabel}</Text>
            <TouchableOpacity
              onPress={goNextMonth}
              style={styles.monthArrow}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>
          </View>

          {/* Weekday labels */}
          <View style={styles.weekdayRow}>
            {WEEKDAY_SHORT.map((d) => (
              <Text key={d} style={styles.weekdayLabel}>
                {d}
              </Text>
            ))}
          </View>

          {/* Grid */}
          {monthMatrix.map((week, wi) => (
            <View key={`week-${wi}`} style={styles.weekRow}>
              {week.map((cell, ci) => {
                if (!cell.dateString || !cell.dayNumber) {
                  return (
                    <View
                      key={`cell-${wi}-${ci}`}
                      style={styles.dayCellEmpty}
                    />
                  );
                }

                const isSelected = selectedDate === cell.dateString;
                const marks = marksByDate[cell.dateString];
                const hasDots =
                  !!marks && marks.colors.length > 0;

                return (
                  <TouchableOpacity
                    key={`cell-${wi}-${ci}`}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                    ]}
                    onPress={() =>
                      setSelectedDate(cell.dateString!)
                    }
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        isSelected && styles.dayNumberSelected,
                      ]}
                    >
                      {cell.dayNumber}
                    </Text>
                    {hasDots && (
                      <View style={styles.dotsRow}>
                        {marks.colors.slice(0, 3).map((col, idx) => (
                          <View
                            key={idx}
                            style={[
                              styles.dot,
                              { backgroundColor: col },
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Summary row */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <Ionicons
              name="time-outline"
              size={16}
              color={PRIMARY_COLOR}
            />
            <Text style={styles.summaryText}>
              {itemsForSelectedDate.length === 0
                ? "No plans today yet"
                : `${itemsForSelectedDate.length} scheduled • ${completedCount} done`}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButtonSmall}
            onPress={openModal}
          >
            <Ionicons
              name="add-circle"
              size={18}
              color={BG}
            />
            <Text style={styles.addButtonSmallText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Quick presets */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickScroll}
        >
          <TouchableOpacity
            style={styles.quickChip}
            onPress={() =>
              quickAdd(
                "Morning mood check-in",
                "CHECK_IN",
                "09:00 am",
                "DAILY"
              )
            }
          >
            <Ionicons
              name="sunny-outline"
              size={16}
              color="#FBBF24"
            />
            <Text style={styles.quickChipText}>
              Daily morning check-in
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickChip}
            onPress={() =>
              quickAdd(
                "Evening reflection & gratitude",
                "CHECK_IN",
                "09:30 pm",
                "DAILY"
              )
            }
          >
            <Ionicons
              name="moon-outline"
              size={16}
              color="#A855F7"
            />
            <Text style={styles.quickChipText}>
              Night reflection
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickChip}
            onPress={() =>
              quickAdd(
                "Deep-breathing / grounding",
                "ACTIVITY",
                "05:00 pm",
                "DAILY"
              )
            }
          >
            <Ionicons
              name="leaf-outline"
              size={16}
              color="#22C55E"
            />
            <Text style={styles.quickChipText}>
              Breathing session
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickChip}
            onPress={() =>
              quickAdd(
                "Therapy / support session",
                "THERAPY",
                "06:00 pm",
                "WEEKLY"
              )
            }
          >
            <Ionicons
              name="chatbubbles-outline"
              size={16}
              color="#60A5FA"
            />
            <Text style={styles.quickChipText}>
              Weekly therapy
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* List for selected day */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderTitle}>Today&apos;s plan</Text>
          {itemsForSelectedDate.length > 0 && (
            <Text style={styles.listHeaderSubtitle}>
              Tap to mark as done • long-press to delete
            </Text>
          )}
        </View>

        {itemsForSelectedDate.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="sparkles-outline"
              size={26}
              color={TEXT_MUTED}
            />
            <Text style={styles.emptyTitle}>
              Nothing scheduled yet
            </Text>
            <Text style={styles.emptyText}>
              Add a routine so NeuroAura can keep you consistent.
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={openModal}
            >
              <Ionicons
                name="add"
                size={18}
                color={BG}
              />
              <Text style={styles.addButtonText}>
                Add a schedule
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={itemsForSelectedDate}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Create / edit modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={closeModal}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>
                  Create schedule
                </Text>
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons
                    name="close"
                    size={22}
                    color={TEXT_MUTED}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>
                {selectedDate} • Plan how you want to feel that
                day.
              </Text>

              {/* Title */}
              <Text style={styles.modalLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="eg. Evening journal & mood check-in"
                placeholderTextColor="#6B7280"
                value={formTitle}
                onChangeText={setFormTitle}
              />

              {/* Time */}
              <Text style={styles.modalLabel}>Time</Text>
              <TextInput
                style={styles.input}
                placeholder="eg. 09:30 pm"
                placeholderTextColor="#6B7280"
                value={formTime}
                onChangeText={setFormTime}
              />

              {/* Type chips */}
              <Text style={styles.modalLabel}>Type</Text>
              <View style={styles.chipRow}>
                {(
                  [
                    "CHECK_IN",
                    "ACTIVITY",
                    "THERAPY",
                    "MEDICATION",
                    "OTHER",
                  ] as ScheduleItem["type"][]
                ).map((type) => {
                  const active = formType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeChip,
                        active && {
                          backgroundColor:
                            TYPE_COLORS[type] || PRIMARY_COLOR,
                          borderColor: "transparent",
                        },
                      ]}
                      onPress={() => setFormType(type)}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          active && {
                            color: BG,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {formatTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Repeat chips */}
              <Text style={styles.modalLabel}>Repeat</Text>
              <View style={styles.chipRow}>
                {(
                  ["NONE", "DAILY", "WEEKLY"] as ScheduleItem["repeat"][]
                ).map((rep) => {
                  const active = formRepeat === rep;
                  return (
                    <TouchableOpacity
                      key={rep}
                      style={[
                        styles.repeatChip,
                        active && {
                          borderColor: PRIMARY_COLOR,
                          backgroundColor: "#111827",
                        },
                      ]}
                      onPress={() => setFormRepeat(rep)}
                    >
                      <Text
                        style={[
                          styles.repeatChipText,
                          active && {
                            color: PRIMARY_COLOR,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {formatRepeatLabel(rep)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Buttons */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalSecondary}
                  onPress={closeModal}
                >
                  <Text style={styles.modalSecondaryText}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalPrimary}
                  onPress={handleAdd}
                >
                  <Ionicons
                    name="save"
                    size={18}
                    color={BG}
                  />
                  <Text style={styles.modalPrimaryText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </SafeAreaView>
  );
};

export default ScheduleCalendarScreen;

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
  calendarCard: {
    borderRadius: 20,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: "#1F2937",
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
  },
  monthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  monthLabel: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "600",
  },
  monthArrow: {
    padding: 4,
    borderRadius: 999,
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  weekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "500",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  dayCellSelected: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
  },
  dayCellEmpty: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
  },
  dayNumber: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: "500",
  },
  dayNumberSelected: {
    color: PRIMARY_COLOR,
    fontWeight: "700",
  },
  dotsRow: {
    flexDirection: "row",
    marginTop: 3,
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 999,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B1220",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  summaryText: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  addButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  addButtonSmallText: {
    color: BG,
    fontSize: 13,
    fontWeight: "600",
  },
  quickScroll: {
    paddingVertical: 6,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#020617",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1F2937",
    marginRight: 8,
    gap: 6,
  },
  quickChipText: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  listHeaderRow: {
    marginTop: 10,
    marginBottom: 6,
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  listHeaderSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    color: TEXT_PRIMARY,
    fontWeight: "600",
    fontSize: 16,
    marginTop: 8,
  },
  emptyText: {
    color: TEXT_MUTED,
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 260,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 6,
  },
  addButtonText: {
    color: BG,
    fontWeight: "600",
    fontSize: 14,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
    marginBottom: 8,
    justifyContent: "space-between",
  },
  taskCardDone: {
    opacity: 0.6,
    borderColor: PRIMARY_COLOR,
  },
  taskLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  typeDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  taskTextWrapper: {
    flex: 1,
  },
  taskTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  taskTitleDone: {
    textDecorationLine: "line-through",
    color: TEXT_MUTED,
  },
  taskMeta: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.85)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 26,
    borderTopWidth: 1,
    borderColor: "#1F2937",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  modalSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 4,
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 6,
    marginBottom: 4,
  },
  input: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: TEXT_PRIMARY,
    fontSize: 13,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  typeChipText: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  repeatChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  repeatChipText: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  modalSecondary: {
    flex: 1,
    marginRight: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#374151",
    paddingVertical: 10,
    alignItems: "center",
  },
  modalSecondaryText: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: "500",
  },
  modalPrimary: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 999,
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  modalPrimaryText: {
    color: BG,
    fontSize: 13,
    fontWeight: "600",
  },
});