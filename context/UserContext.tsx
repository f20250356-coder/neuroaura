// context/UserContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
} from "react";

export type MoodType =
  | "calm"
  | "okay"
  | "overwhelmed"
  | "angry"
  | "sad"
  | "idk";

export type UserRole = "individual" | "parent" | "under18" | "guest";

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
}

export interface CheckIn {
  id: string;
  timestamp: number;
  mood: MoodType;
  symptoms: string[];
}

export type AlertEventType =
  | "shake"
  | "noise_high"
  | "light_high"
  | "manual_high_risk";

export interface AlertEvent {
  id: string;
  type: AlertEventType;
  message: string;
  timestamp: number;
}

interface UserContextValue {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;

  checkIns: CheckIn[];
  addCheckIn: (mood: MoodType, symptoms: string[]) => void;

  alerts: AlertEvent[];
  logAlertEvent: (type: AlertEventType, message: string) => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);

  const addCheckIn = (mood: MoodType, symptoms: string[]) => {
    const entry: CheckIn = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      timestamp: Date.now(),
      mood,
      symptoms,
    };
    setCheckIns((prev) => [entry, ...prev]);
  };

  const logAlertEvent = (type: AlertEventType, message: string) => {
    const evt: AlertEvent = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type,
      message,
      timestamp: Date.now(),
    };
    setAlerts((prev) => [evt, ...prev]);

    // later you can sync this with a backend / parent dashboard view
  };

  const value = useMemo(
    () => ({
      profile,
      setProfile,
      checkIns,
      addCheckIn,
      alerts,
      logAlertEvent,
    }),
    [profile, checkIns, alerts]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextValue => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used inside a UserProvider");
  }
  return ctx;
};