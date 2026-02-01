import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { View, Text, Pressable, BackHandler, StatusBar, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useGameStore } from "../store/use-game-store";
import { STEAL_TIME_SECONDS, STEAL_MULTIPLIER } from "../store/game-store";
import stealPool from "../data/survey_steal.json";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Pool of rival names
const RIVAL_NAMES = ["VISHAKH", "SARAH", "MARCUS", "EMMA", "ALEX", "JORDAN", "RILEY", "TAYLOR"];

interface StealAnswer {
  text: string;
  points: number;
}

interface StealQuestion {
  question: string;
  all_answers: StealAnswer[];
  pre_filled_indices: number[];
  distractors: string[];
}

// Get a random question from the pool
function getRandomQuestion(): StealQuestion {
  const randomIndex = Math.floor(Math.random() * stealPool.length);
  return stealPool[randomIndex] as StealQuestion;
}

// Get a random rival name
function getRandomRivalName(): string {
  const randomIndex = Math.floor(Math.random() * RIVAL_NAMES.length);
  return RIVAL_NAMES[randomIndex]!;
}

// Shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

interface OptionButton {
  text: string;
  isCorrect: boolean;
  answerIndex: number; // -1 for distractors
  points: number;
}

export default function SurveyStealScreen() {
  const router = useRouter();
  const { state, startStealRound, recordStealAnswer, finishStealRound } = useGameStore();

  // Game state
  const [question] = useState<StealQuestion>(() => getRandomQuestion());
  const [rivalName] = useState<string>(() => getRandomRivalName());
  const [shuffledOptions, setShuffledOptions] = useState<OptionButton[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(STEAL_TIME_SECONDS);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [disabledOptions, setDisabledOptions] = useState<Set<number>>(new Set());
  const [flashingOption, setFlashingOption] = useState<number | null>(null);
  const [showFailure, setShowFailure] = useState(false);
  const [isWin, setIsWin] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const boardScale = useSharedValue(1);

  // Calculate pre-filled points
  const preFilledPoints = useMemo(() => {
    return question.pre_filled_indices.reduce((sum, idx) => {
      return sum + (question.all_answers[idx]?.points || 0);
    }, 0);
  }, [question]);

  // Initialize game
  useEffect(() => {
    // Calculate pre-filled points
    startStealRound(question.pre_filled_indices, preFilledPoints);

    // Build options: remaining correct answers + distractors to make 6 total
    const remainingCorrectIndices = question.all_answers
      .map((_, idx) => idx)
      .filter((idx) => !question.pre_filled_indices.includes(idx));

    const correctOptions: OptionButton[] = remainingCorrectIndices.map((idx) => ({
      text: question.all_answers[idx]!.text,
      isCorrect: true,
      answerIndex: idx,
      points: question.all_answers[idx]!.points,
    }));

    // Number of distractors needed to make 6 total options
    const numDistractorsNeeded = 6 - correctOptions.length;
    const selectedDistractors = shuffleArray(question.distractors).slice(0, numDistractorsNeeded);

    const distractorOptions: OptionButton[] = selectedDistractors.map((text) => ({
      text,
      isCorrect: false,
      answerIndex: -1,
      points: 0,
    }));

    // Shuffle all options together
    setShuffledOptions(shuffleArray([...correctOptions, ...distractorOptions]));
    setIsGameStarted(true);
  }, [startStealRound, question, preFilledPoints]);

  // Timer countdown
  useEffect(() => {
    if (!isGameStarted || isGameOver) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameStarted, isGameOver]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!isGameOver) {
        handleFailure();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [isGameOver]);

  const handleTimeUp = useCallback(() => {
    setShowFailure(true);
    setIsGameOver(true);
    setCoinsEarned(0);
  }, []);

  const handleFailure = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowFailure(true);
    setIsGameOver(true);
    setCoinsEarned(0);
  }, []);

  const handleWin = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const earned = finishStealRound();
    setCoinsEarned(earned);
    setIsWin(true);
    setIsGameOver(true);
  }, [finishStealRound]);

  // Check if all correct answers found
  useEffect(() => {
    if (isGameStarted && state.stealRevealedIndices.length === 5 && !isGameOver) {
      // All 5 slots filled - win!
      setTimeout(() => handleWin(), 300);
    }
  }, [isGameStarted, state.stealRevealedIndices, isGameOver, handleWin]);

  const handleOptionSelect = useCallback(
    (optionIndex: number) => {
      if (isGameOver || disabledOptions.has(optionIndex) || flashingOption !== null) return;

      const selectedOption = shuffledOptions[optionIndex];
      if (!selectedOption) return;

      // Disable this option
      setDisabledOptions((prev) => new Set([...prev, optionIndex]));

      if (selectedOption.isCorrect) {
        // Correct answer - reveal the slot
        recordStealAnswer(true, selectedOption.points, selectedOption.answerIndex);

        // Animate the board
        boardScale.value = withSequence(
          withTiming(1.02, { duration: 100 }),
          withTiming(1, { duration: 100 })
        );
      } else {
        // Incorrect - flash red and fail
        setFlashingOption(optionIndex);
        recordStealAnswer(false, 0, -1);

        setTimeout(() => {
          setFlashingOption(null);
          handleFailure();
        }, 400);
      }
    },
    [
      isGameOver,
      disabledOptions,
      flashingOption,
      shuffledOptions,
      recordStealAnswer,
      boardScale,
      handleFailure,
    ]
  );

  const handleReturnHome = useCallback(() => {
    router.replace("/");
  }, [router]);

  const boardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }],
  }));

  const getButtonStyle = (index: number) => {
    if (flashingOption === index) {
      return { backgroundColor: "#ef4444" }; // Red flash
    }
    if (disabledOptions.has(index)) {
      return { backgroundColor: "#2a2a2a", opacity: 0.5 }; // Disabled
    }
    return { backgroundColor: "#4a4a4a" }; // Normal
  };

  // Check if a slot is revealed
  const isSlotRevealed = (index: number): boolean => {
    return state.stealRevealedIndices.includes(index);
  };

  // Get answer for a slot
  const getAnswerForSlot = (index: number): StealAnswer | null => {
    if (!isSlotRevealed(index)) return null;
    return question.all_answers[index] || null;
  };

  // Game Over Screen
  if (isGameOver) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1c1c1e" }}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1 }}>
          <Stack.Screen options={{ headerShown: false }} />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
            {/* Win/Lose Title */}
            <Text
              style={{
                fontSize: 32,
                fontWeight: "700",
                color: isWin ? "#22c55e" : "#ef4444",
                marginBottom: 16,
                letterSpacing: 2,
              }}
            >
              {isWin ? "STEAL SUCCESSFUL!" : "STEAL FAILED!"}
            </Text>

            {/* Big X or Checkmark */}
            <Text
              style={{
                fontSize: 80,
                fontWeight: "800",
                color: isWin ? "#22c55e" : "#ef4444",
                marginBottom: 40,
              }}
            >
              {isWin ? "✓" : "✕"}
            </Text>

            {/* Score Card */}
            <View
              style={{
                borderWidth: 2,
                borderColor: "#d4a853",
                borderRadius: 16,
                paddingVertical: 32,
                paddingHorizontal: 48,
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <Text style={{ fontSize: 18, color: "#888888", marginBottom: 8 }}>
                {isWin ? "BOARD TOTAL × 2" : "TOTAL POINTS"}
              </Text>
              <Text
                style={{
                  fontSize: 64,
                  fontWeight: "800",
                  color: isWin ? "#22c55e" : "#888888",
                }}
              >
                {isWin ? coinsEarned : 0}
              </Text>
              {isWin && (
                <Text style={{ fontSize: 14, color: "#888888", marginTop: 8 }}>
                  ({state.stealTotalPoints} × {STEAL_MULTIPLIER})
                </Text>
              )}
            </View>

            {/* Coins Earned */}
            <View
              style={{
                backgroundColor: "#4a4a4a",
                borderRadius: 16,
                paddingVertical: 20,
                paddingHorizontal: 40,
                alignItems: "center",
                marginBottom: 40,
              }}
            >
              <Text style={{ fontSize: 16, color: "#888888", marginBottom: 4 }}>
                COINS EARNED
              </Text>
              <Text style={{ fontSize: 36, fontWeight: "700", color: "#d4a853" }}>
                +{coinsEarned}
              </Text>
            </View>

            <Pressable
              onPress={handleReturnHome}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#3a3a3a" : "#4a4a4a",
                paddingHorizontal: 48,
                paddingVertical: 16,
                borderRadius: 12,
              })}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#ffffff" }}>
                CONTINUE
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Main Game Screen
  return (
    <View style={{ flex: 1, backgroundColor: "#1c1c1e" }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          {/* Header: Rival Name and Timer */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#ffffff",
                letterSpacing: 1,
              }}
            >
              {rivalName}'S BOARD
            </Text>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#d4a853",
                marginHorizontal: 12,
              }}
            />
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: timeRemaining <= 5 ? "#ef4444" : "#ffffff",
              }}
            >
              {timeRemaining}s
            </Text>
          </View>

          {/* Answers Board */}
          <Animated.View
            style={[
              boardStyle,
              {
                borderWidth: 2,
                borderColor: "#d4a853",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                backgroundColor: "rgba(212, 168, 83, 0.05)",
              },
            ]}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#888888",
                textAlign: "center",
                marginBottom: 12,
                letterSpacing: 2,
              }}
            >
              ANSWERS BOARD
            </Text>

            {/* 5 Answer Rows */}
            {[0, 1, 2, 3, 4].map((index) => {
              const answer = getAnswerForSlot(index);
              const isRevealed = isSlotRevealed(index);
              return (
                <View
                  key={index}
                  style={{
                    flexDirection: "row",
                    marginBottom: 8,
                    alignItems: "center",
                  }}
                >
                  {/* Answer Text Box */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: isRevealed ? "#3a3a3a" : "#2a2a2a",
                      borderRadius: 8,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      marginRight: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: isRevealed ? "#ffffff" : "transparent",
                        textAlign: "center",
                      }}
                    >
                      {answer ? answer.text : "???"}
                    </Text>
                  </View>

                  {/* Points Box */}
                  <View
                    style={{
                      width: 50,
                      backgroundColor: isRevealed ? "#3a3a3a" : "#2a2a2a",
                      borderRadius: 8,
                      paddingVertical: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: isRevealed ? "#d4a853" : "transparent",
                      }}
                    >
                      {answer ? answer.points : "0"}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Total Row */}
            <View
              style={{
                flexDirection: "row",
                marginTop: 4,
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#888888",
                  marginRight: 12,
                  letterSpacing: 1,
                }}
              >
                TOTAL
              </Text>
              <View
                style={{
                  width: 50,
                  backgroundColor: "#3a3a3a",
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#d4a853",
                  }}
                >
                  {state.stealTotalPoints}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Failure Overlay */}
          {showFailure && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                zIndex: 100,
              }}
            >
              <Text
                style={{
                  fontSize: 120,
                  fontWeight: "800",
                  color: "#ef4444",
                }}
              >
                ✕
              </Text>
            </View>
          )}

          {/* Question Container */}
          <View
            style={{
              borderWidth: 2,
              borderColor: "#d4a853",
              borderRadius: 16,
              paddingVertical: 20,
              paddingHorizontal: 16,
              marginBottom: 16,
              backgroundColor: "rgba(212, 168, 83, 0.05)",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#ffffff",
                textAlign: "center",
                lineHeight: 26,
              }}
            >
              {question.question}
            </Text>
          </View>

          {/* Selection Grid - 2 columns x 3 rows */}
          <View style={{ flex: 1 }}>
            {[0, 1, 2].map((row) => (
              <View
                key={row}
                style={{
                  flexDirection: "row",
                  marginBottom: 10,
                  gap: 10,
                }}
              >
                {[0, 1].map((col) => {
                  const index = row * 2 + col;
                  const option = shuffledOptions[index];
                  if (!option) return null;

                  return (
                    <Pressable
                      key={index}
                      onPress={() => handleOptionSelect(index)}
                      disabled={disabledOptions.has(index) || flashingOption !== null}
                      style={({ pressed }) => ({
                        flex: 1,
                        ...getButtonStyle(index),
                        opacity: pressed && !disabledOptions.has(index) ? 0.8 : getButtonStyle(index).opacity || 1,
                        borderRadius: 12,
                        paddingVertical: 16,
                        paddingHorizontal: 12,
                        minHeight: 56,
                        justifyContent: "center",
                      })}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "600",
                          color: "#ffffff",
                          textAlign: "center",
                        }}
                        numberOfLines={2}
                      >
                        {option.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
