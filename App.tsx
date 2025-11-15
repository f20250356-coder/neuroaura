// App.tsx
import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import { Accelerometer } from "expo-sensors";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import * as Brightness from "expo-brightness";

import { UserProvider, useUser } from "./context/UserContext";

import AuthScreen from "./screens/AuthScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import HomeScreen from "./screens/HomeScreen";
import CheckInScreen from "./screens/CheckInScreen";
import ToolsScreen from "./screens/ToolsScreen";
import CoachScreen from "./screens/CoachScreen";
import ParentScreen from "./screens/ParentScreen";
import MoodOverviewScreen from "./screens/MoodOverviewScreen";
import MoodStatisticsScreen from "./screens/MoodStatisticsScreen";
import ScheduleCalendarScreen from "./screens/ScheduleCalendarScreen";
import ScreenTimeRegulatorScreen from "./screens/ScreenTimeRegulatorScreen";

// 👇 Comet-powered chatbot overlay ("Your Friend")
// file is in src/components/YourFriendChat.tsx
import YourFriendChat from "./src/components/YourFriendChat";

// ----------------------------------------------------
// Notifications config – for local notifications
// ----------------------------------------------------
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ----------------------------------------------------
// Navigation types
// ----------------------------------------------------
export type RootStackParamList = {
  Auth: { role?: "individual" | "parent" | "under18" } | undefined;
  Onboarding: undefined;
  Home: undefined;
  CheckIn: undefined;
  Tools: { initialTab?: "overview" | "stats" | "schedule" } | undefined;
  Coach: { highRisk?: boolean } | undefined;
  Parent: undefined;
  MoodOverview: undefined;
  MoodStats: undefined;
  ScheduleCalendar: { userId?: string } | undefined;
  ScreenTimeRegulator: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ----------------------------------------------------
// GLOBAL SHAKE WATCHER – anger / overload detection
// ----------------------------------------------------
const GlobalShakeWatcher: React.FC = () => {
  const { addCheckIn, logAlertEvent } = useUser();

  const addCheckInRef = useRef(addCheckIn);
  const logAlertEventRef = useRef(logAlertEvent);

  useEffect(() => {
    addCheckInRef.current = addCheckIn;
    logAlertEventRef.current = logAlertEvent;
  }, [addCheckIn, logAlertEvent]);

  const [_shakeValue, setShakeValue] = useState(0);
  const [_accelAvailable, setAccelAvailable] = useState<boolean | null>(null);

  // Ask notification permission once
  useEffect(() => {
    const setupNotifications = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        await Notifications.requestPermissionsAsync();
      }
    };
    setupNotifications();
  }, []);

  useEffect(() => {
    let subscription: any = null;
    let lastShakeTime = 0;

    const setup = async () => {
      if (Platform.OS === "web") {
        setAccelAvailable(false);
        return;
      }

      const available = await Accelerometer.isAvailableAsync();
      setAccelAvailable(available);
      if (!available) {
        console.log("Accelerometer not available on this device.");
        return;
      }

      Accelerometer.setUpdateInterval(100); // 100 ms

      subscription = Accelerometer.addListener(({ x, y, z }) => {
        const total = Math.sqrt(x * x + y * y + z * z);
        setShakeValue(total);

        const now = Date.now();
        const SHAKE_THRESHOLD = 2.3; // needs a real hard shake
        const COOLDOWN_MS = 6000; // 6s

        if (total > SHAKE_THRESHOLD && now - lastShakeTime > COOLDOWN_MS) {
          lastShakeTime = now;

          // 1) Haptic warning
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

          // 2) Log a high-risk check-in (we detect these as sensor-style in stats)
          addCheckInRef.current?.("angry", [
            "Phone shaken hard",
            "Possible anger / overload moment",
          ]);

          // 3) Log event for parent dashboard
          logAlertEventRef.current?.(
            "shake",
            "Strong phone movement detected (possible anger / overload)."
          );

          // 4) Soft, supportive notification
          Notifications.scheduleNotificationAsync({
            content: {
              title: "NeuroAura: big feelings detected 💛",
              body:
                "It felt like your phone was shaken really hard. If you’re upset or overwhelmed, try a slow breath and open NeuroAura to use your calm tools. You’re doing your best and that’s enough.",
              sound: "default",
              data: { type: "high_risk_shake" },
            },
            trigger: null,
          }).catch((err) =>
            console.warn("Failed to schedule shake notification:", err)
          );
        }
      });
    };

    setup();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  return null; // invisible
};

// ----------------------------------------------------
// GLOBAL NOISE WATCHER – loud environments
// ----------------------------------------------------
const GlobalNoiseWatcher: React.FC = () => {
  const { addCheckIn, logAlertEvent } = useUser();

  const addCheckInRef = useRef(addCheckIn);
  const logAlertEventRef = useRef(logAlertEvent);

  useEffect(() => {
    addCheckInRef.current = addCheckIn;
    logAlertEventRef.current = logAlertEvent;
  }, [addCheckIn, logAlertEvent]);

  const [_noiseDebug, setNoiseDebug] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const startNoiseLoop = async () => {
      try {
        if (Platform.OS === "web") return;

        // Mic permission
        const existing = await Audio.getPermissionsAsync();
        let status = existing.status;
        if (status !== "granted") {
          const req = await Audio.requestPermissionsAsync();
          status = req.status;
        }
        if (status !== "granted") {
          console.log("Mic permission not granted; skipping noise watch.");
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        let lastNoiseAlert = 0;

        while (!cancelled) {
          const recording = new Audio.Recording();
          let maxLevel = -160;

          try {
            await recording.prepareToRecordAsync({
              ...Audio.RecordingOptionsPresets.LOW_QUALITY,
              // @ts-ignore – metering flag not typed
              isMeteringEnabled: true,
            });

            recording.setOnRecordingStatusUpdate((status) => {
              const s = status as any;
              if (typeof s.metering === "number") {
                setNoiseDebug(s.metering);
                if (s.metering > maxLevel) maxLevel = s.metering;
              }
            });

            await recording.startAsync();
            await new Promise((res) => setTimeout(res, 2500)); // ~2.5s window

            try {
              await recording.stopAndUnloadAsync();
            } catch (err) {
              console.warn("Noise recording stop error:", err);
            }
          } catch (err) {
            console.warn("Noise recording error:", err);
          }

          const now = Date.now();
          const VERY_LOUD_THRESHOLD = -12; // extreme volume
          const COOLDOWN_MS = 5 * 60 * 1000; // 5 min

          if (maxLevel > VERY_LOUD_THRESHOLD && now - lastNoiseAlert > COOLDOWN_MS) {
            lastNoiseAlert = now;

            // 1) Log an overwhelmed moment
            addCheckInRef.current?.("overwhelmed", [
              "Very loud environment",
              "Possible sound overload moment",
            ]);

            // 2) Parent log
            logAlertEventRef.current?.(
              "manual_high_risk",
              "Very loud environment detected (noise overload risk)."
            );

            // 3) Immediate notification
            Notifications.scheduleNotificationAsync({
              content: {
                title: "NeuroAura: this place is VERY loud 🚨",
                body:
                  "The sound level here is extremely high. If noise is a trigger for you, try moving to a quieter spot or using headphones. You’re allowed to protect your senses.",
                sound: "default",
                data: { type: "noise_high" },
              },
              trigger: null,
            }).catch((err) =>
              console.warn("Failed to schedule noise notification:", err)
            );

            // 4) Follow-up check-in notification
            Notifications.scheduleNotificationAsync({
              content: {
                title: "NeuroAura: quick check-in 💭",
                body:
                  "That place was really loud a moment ago. Are you still feeling overwhelmed, or is it a bit better now? If you want, open NeuroAura and log how you feel so I can support you.",
                sound: "default",
                data: { type: "noise_followup" },
              },
              trigger: { seconds: 90 },
            }).catch((err) =>
              console.warn(
                "Failed to schedule noise follow-up notification:",
                err
              )
            );
          }

          if (cancelled) break;

          // sample every 30s
          await new Promise((res) => setTimeout(res, 30000));
        }

        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      } catch (err) {
        console.warn("Global noise watcher error:", err);
      }
    };

    startNoiseLoop();

    return () => {
      cancelled = true;
    };
  }, []);

  return null; // invisible
};

// ----------------------------------------------------
// GLOBAL LIGHT WATCHER – brightness overload
// ----------------------------------------------------
const GlobalLightWatcher: React.FC = () => {
  const { addCheckIn, logAlertEvent } = useUser();

  const addCheckInRef = useRef(addCheckIn);
  const logAlertEventRef = useRef(logAlertEvent);

  useEffect(() => {
    addCheckInRef.current = addCheckIn;
    logAlertEventRef.current = logAlertEvent;
  }, [addCheckIn, logAlertEvent]);

  const [_lightDebug, setLightDebug] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const startLightLoop = async () => {
      try {
        if (Platform.OS === "web") return;

        const existing = await Brightness.getPermissionsAsync();
        let status = existing.status;
        if (status !== "granted") {
          const req = await Brightness.requestPermissionsAsync();
          status = req.status;
        }
        if (status !== "granted") {
          console.log("Brightness permission not granted; skipping light watch.");
          return;
        }

        let lastLightAlert = 0;

        while (!cancelled) {
          let level = 0;
          try {
            level = await Brightness.getSystemBrightnessAsync();
          } catch {
            try {
              level = await Brightness.getBrightnessAsync();
            } catch (err) {
              console.warn("Light reading error:", err);
            }
          }

          setLightDebug(level);
          const now = Date.now();
          const VERY_BRIGHT_THRESHOLD = 0.85;
          const COOLDOWN_MS = 5 * 60 * 1000;

          if (level >= VERY_BRIGHT_THRESHOLD && now - lastLightAlert > COOLDOWN_MS) {
            lastLightAlert = now;

            // 1) Log as overwhelmed
            addCheckInRef.current?.("overwhelmed", [
              "Very bright screen / light",
              "Possible light sensitivity trigger",
            ]);

            // 2) Parent log
            logAlertEventRef.current?.(
              "manual_high_risk",
              "Very bright screen / ambient light detected (light overload risk)."
            );

            // 3) Notification
            Notifications.scheduleNotificationAsync({
              content: {
                title: "NeuroAura: light is very harsh here 🌞",
                body:
                  "The brightness around your device is really intense. If bright light triggers headaches or sensory overload, try moving to shade, dimming your screen, or using tinted glasses.",
                sound: "default",
                data: { type: "light_high" },
              },
              trigger: null,
            }).catch((err) =>
              console.warn("Failed to schedule light notification:", err)
            );
          }

          if (cancelled) break;

          await new Promise((res) => setTimeout(res, 30000)); // check every 30s
        }
      } catch (err) {
        console.warn("Global light watcher error:", err);
      }
    };

    startLightLoop();

    return () => {
      cancelled = true;
    };
  }, []);

  return null; // invisible
};

// ----------------------------------------------------
// ROOT APP
// ----------------------------------------------------
export default function App() {
  return (
    <UserProvider>
      <NavigationContainer>
        {/* Global background sensors while the app is open */}
        <GlobalShakeWatcher />
        <GlobalNoiseWatcher />
        <GlobalLightWatcher />

        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="CheckIn" component={CheckInScreen} />
          <Stack.Screen name="Tools" component={ToolsScreen} />
          <Stack.Screen name="Coach" component={CoachScreen} />
          <Stack.Screen name="Parent" component={ParentScreen} />
          <Stack.Screen name="MoodOverview" component={MoodOverviewScreen} />
          <Stack.Screen name="MoodStats" component={MoodStatisticsScreen} />
          <Stack.Screen
            name="ScheduleCalendar"
            component={ScheduleCalendarScreen}
          />
          <Stack.Screen
            name="ScreenTimeRegulator"
            component={ScreenTimeRegulatorScreen}
          />
        </Stack.Navigator>

        {/* Floating Comet-powered "Your Friend" chatbot on every screen */}
        <YourFriendChat />
      </NavigationContainer>
    </UserProvider>
  );
}