// screens/HomeScreen.tsx
import React, { useEffect, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const PASTEL_PURPLE = "#F0D9EF";
const PASTEL_PINK = "#FCDCE1";
const PASTEL_PEACH = "#FFE6BB";
const PASTEL_YELLOW = "#E9ECCE";
const PASTEL_GREEN = "#CDE9DC";
const PASTEL_BLUE = "#C4DFE5";

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const introOpacity = useRef(new Animated.Value(0)).current;
  const introTranslateY = useRef(new Animated.Value(20)).current;
  const cardPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade + slide intro
    Animated.parallel([
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(introTranslateY, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // Gentle breathing animation on cards
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardPulse, {
          toValue: 1.02,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cardPulse, {
          toValue: 0.98,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [introOpacity, introTranslateY, cardPulse]);

  const goToAuth = (role: "individual" | "parent" | "under18") => {
    navigation.navigate("Auth", { role });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* pastel blobs */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.header,
            {
              opacity: introOpacity,
              transform: [{ translateY: introTranslateY }],
            },
          ]}
        >
          <Text style={styles.logo}>NeuroAura</Text>
          <Text style={styles.subtitle}>
            Choose how you want to enter your calm space 🌈
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.cardsWrapper,
            {
              transform: [{ scale: cardPulse }],
            },
          ]}
        >
          {/* Individual dashboard */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.card, { backgroundColor: PASTEL_BLUE }]}
            onPress={() => goToAuth("individual")}
          >
            <Text style={styles.cardEmoji}>🧠</Text>
            <Text style={styles.cardTitle}>Individual dashboard</Text>
            <Text style={styles.cardText}>
              For teens & adults who want a private, supportive mood space with
              check-ins, rewards and calm tools.
            </Text>
          </TouchableOpacity>

          {/* Parent / guardian */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.card, { backgroundColor: PASTEL_GREEN }]}
            onPress={() => goToAuth("parent")}
          >
            <Text style={styles.cardEmoji}>👨‍👩‍👧</Text>
            <Text style={styles.cardTitle}>Parent / guardian dashboard</Text>
            <Text style={styles.cardText}>
              For caregivers who want gentle alerts and mood overviews (with
              consent) to support their neurodivergent child.
            </Text>
          </TouchableOpacity>

          {/* Under 18 */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.card, { backgroundColor: PASTEL_PINK }]}
            onPress={() => goToAuth("under18")}
          >
            <Text style={styles.cardEmoji}>🌈</Text>
            <Text style={styles.cardTitle}>Under 18 dashboard</Text>
            <Text style={styles.cardText}>
              Kid-friendly view with extra visual cues, rewards and simplified
              options, linked to a parent/guardian account.
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.footerNote}>
          NeuroAura is designed for ADHD, autism, anxiety and sensory-sensitive
          brains — with colours, shapes and flows that feel safe 💛
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PASTEL_YELLOW,
  },
  blobTopRight: {
    position: "absolute",
    top: -90,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 140,
    backgroundColor: PASTEL_PURPLE,
    opacity: 0.4,
  },
  blobBottomLeft: {
    position: "absolute",
    bottom: -100,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 150,
    backgroundColor: PASTEL_PINK,
    opacity: 0.45,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    fontSize: 30,
    fontWeight: "800",
    color: "#222",
  },
  subtitle: {
    fontSize: 13,
    color: "#444",
    textAlign: "center",
    marginTop: 6,
  },
  cardsWrapper: {
    gap: 16,
  },
  card: {
    borderRadius: 26,
    paddingVertical: 18,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  cardText: {
    fontSize: 13,
    color: "#374151",
  },
  footerNote: {
    marginTop: 22,
    fontSize: 11,
    color: "#4B5563",
    textAlign: "center",
  },
});