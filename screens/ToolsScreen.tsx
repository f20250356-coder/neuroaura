// screens/ToolsScreen.tsx

import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../context/UserContext";
import { useRoute, RouteProp } from "@react-navigation/native";

import MoodOverviewScreen from "./MoodOverviewScreen";
import MoodStatisticsScreen from "./MoodStatisticsScreen";
import ScheduleCalendarScreen from "./ScheduleCalendarScreen";

const BG = "#020617";
const CARD_BG = "#0F172A";
const TEXT_PRIMARY = "#E5E7EB";
const TEXT_MUTED = "#9CA3AF";
const PRIMARY = "#6366F1";

type ToolsTabKey = "overview" | "stats" | "schedule";

// Route type just for this screen (avoids circular import with App.tsx)
type ToolsRouteParam = {
  Tools: { initialTab?: ToolsTabKey } | undefined;
};

const ToolsScreen: React.FC = () => {
  const { user } = useUser();
  const userId = user?.id || "guest";

  // 🔥 Read initialTab from navigation params (so overflow can open Schedule directly)
  const route = useRoute<RouteProp<ToolsRouteParam, "Tools">>();
  const routeInitialTab = route.params?.initialTab;

  const [activeTab, setActiveTab] = useState<ToolsTabKey>(
    routeInitialTab ?? "overview"
  );

  const renderContent = () => {
    if (activeTab === "overview") {
      return <MoodOverviewScreen />;
    }
    if (activeTab === "stats") {
      return <MoodStatisticsScreen />;
    }
    if (activeTab === "schedule") {
      // Pass userId through route.params so ScheduleCalendarScreen can persist per user
      return <ScheduleCalendarScreen route={{ params: { userId } }} />;
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Mood tools</Text>
            <Text style={styles.headerSubtitle}>
              Visualize your moods, track patterns and plan your routines.
            </Text>
          </View>
          <View style={styles.headerIconWrapper}>
            <Ionicons name="sparkles-outline" size={24} color={PRIMARY} />
          </View>
        </View>

        {/* Segmented control */}
        <View style={styles.tabsRow}>
          <TabButton
            label="Overview"
            icon="analytics-outline"
            active={activeTab === "overview"}
            onPress={() => setActiveTab("overview")}
          />
          <TabButton
            label="Statistics"
            icon="bar-chart-outline"
            active={activeTab === "stats"}
            onPress={() => setActiveTab("stats")}
          />
          <TabButton
            label="Schedule"
            icon="calendar-outline"
            active={activeTab === "schedule"}
            onPress={() => setActiveTab("schedule")}
          />
        </View>

        {/* Content */}
        <View style={styles.contentCard}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {renderContent()}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

type TabButtonProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
};

const TabButton: React.FC<TabButtonProps> = ({
  label,
  icon,
  active,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? BG : TEXT_MUTED}
      />
      <Text
        style={[
          styles.tabButtonLabel,
          active && styles.tabButtonLabelActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default ToolsScreen;

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
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#020617",
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: "#1F2937",
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tabButtonActive: {
    backgroundColor: PRIMARY,
  },
  tabButtonLabel: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  tabButtonLabelActive: {
    color: BG,
    fontWeight: "600",
  },
  contentCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1F2937",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
});