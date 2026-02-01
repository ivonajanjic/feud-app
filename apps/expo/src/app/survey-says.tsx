import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { View, Text, Pressable, BackHandler, StatusBar, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { useGameStore } from "../store/use-game-store";
import { getGameState, SURVEY_MAX_STRIKES, SURVEY_TIME_SECONDS, SURVEY_FIRST_TRY_BONUS } from "../store/game-store";
import surveyPool from "../data/survey_pool.json";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SurveyOption {
  text: string;
  is_correct: boolean;
  points: number;
}

interface SurveyQuestion {
  question_text: string;
  options: SurveyOption[];
}

// Get a random question from the pool
function getRandomQuestion(): SurveyQuestion {
  const randomIndex = Math.floor(Math.random() * surveyPool.length);
  return surveyPool[randomIndex] as SurveyQuestion;
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

export default function SurveySaysScreen() {
  const router = useRouter();
  const { state, startSurveyRound, recordSurveyAnswer, finishSurveyRound } = useGameStore();

  // Game state
  const [question] = useState<SurveyQuestion>(() => getRandomQuestion());
  const [shuffledOptions, setShuffledOptions] = useState<SurveyOption[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(SURVEY_TIME_SECONDS);
  const [isGameOver, setIsGameOver] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [disabledOptions, setDisabledOptions] = useState<Set<number>>(new Set());
  const [flashingOption, setFlashingOption] = useState<number | null>(null);
  const [showBonus, setShowBonus] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const boardScale = useSharedValue(1);

  // Sort correct options by points to determine ranks (1=highest, 5=lowest)
  const rankedCorrectOptions = useMemo(() => {
    return question.options
      .filter((opt) => opt.is_correct)
      .sort((a, b) => b.points - a.points)
      .map((opt, index) => ({ ...opt, rank: index + 1 }));
  }, [question]);

  // Initialize game
  useEffect(() => {
    startSurveyRound();
    // Shuffle options for display
    setShuffledOptions(shuffleArray(question.options));
  }, [startSurveyRound, question]);

  // Timer countdown
  useEffect(() => {
    if (isGameOver) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameOver]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!isGameOver) {
        endGame();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [isGameOver]);

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const earned = finishSurveyRound();
    setCoinsEarned(earned);
    setIsGameOver(true);
  }, [finishSurveyRound]);

  // Check if all correct answers found
  useEffect(() => {
    if (state.surveyRevealedRanks.length === 5 && !isGameOver) {
      // All 5 correct answers found - end game with delay
      setTimeout(() => endGame(), 500);
    }
  }, [state.surveyRevealedRanks, isGameOver, endGame]);

  // Check for 3 strikes
  useEffect(() => {
    if (state.surveyStrikes >= SURVEY_MAX_STRIKES && !isGameOver) {
      setTimeout(() => endGame(), 500);
    }
  }, [state.surveyStrikes, isGameOver, endGame]);

  const handleOptionSelect = useCallback(
    (optionIndex: number) => {
      if (isGameOver || disabledOptions.has(optionIndex) || flashingOption !== null) return;

      const selectedOption = shuffledOptions[optionIndex];
      if (!selectedOption) return;

      // Disable this option
      setDisabledOptions((prev) => new Set([...prev, optionIndex]));

      if (selectedOption.is_correct) {
        // Find the rank of this answer
        const rankedOption = rankedCorrectOptions.find((opt) => opt.text === selectedOption.text);
        const rank = rankedOption?.rank || 1;

        // Check if first click bonus eligible
        const isFirstTryBonusEligible = !state.surveyFirstClickMade;

        const { gotBonus } = recordSurveyAnswer(true, selectedOption.points, rank, isFirstTryBonusEligible);

        if (gotBonus) {
          setShowBonus(true);
          setTimeout(() => setShowBonus(false), 1500);
        }

        // Animate the board
        boardScale.value = withSequence(
          withTiming(1.02, { duration: 100 }),
          withTiming(1, { duration: 100 })
        );
      } else {
        // Incorrect - flash red
        setFlashingOption(optionIndex);
        recordSurveyAnswer(false, 0, 0, false);

        setTimeout(() => {
          setFlashingOption(null);
        }, 300);
      }
    },
    [
      isGameOver,
      disabledOptions,
      flashingOption,
      shuffledOptions,
      rankedCorrectOptions,
      state.surveyFirstClickMade,
      recordSurveyAnswer,
      boardScale,
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

  // Get revealed answer for a specific rank
  const getRevealedAnswer = (rank: number): SurveyOption | null => {
    if (!state.surveyRevealedRanks.includes(rank)) return null;
    return rankedCorrectOptions.find((opt) => opt.rank === rank) || null;
  };

  // Game Over Screen
  if (isGameOver) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1c1c1e" }}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1 }}>
          <Stack.Screen options={{ headerShown: false }} />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: "700",
                color: "#ffffff",
                marginBottom: 40,
                letterSpacing: 2,
              }}
            >
              GAME OVER
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
                TOTAL POINTS
              </Text>
              <Text
                style={{
                  fontSize: 64,
                  fontWeight: "800",
                  color: state.surveyTotalPoints > 0 ? "#22c55e" : "#888888",
                }}
              >
                {state.surveyTotalPoints}
              </Text>
              {state.surveyGotFirstTryBonus && (
                <Text style={{ fontSize: 16, color: "#d4a853", marginTop: 8 }}>
                  (Includes +{SURVEY_FIRST_TRY_BONUS} First Try Bonus!)
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
          {/* Header: Timer and Strikes */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            {/* Timer */}
            <Text
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: timeRemaining <= 10 ? "#ef4444" : "#ffffff",
                marginRight: 16,
              }}
            >
              {timeRemaining}s
            </Text>

            {/* Strikes */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <Text
                  key={i}
                  style={{
                    fontSize: 24,
                    fontWeight: "700",
                    color: i < state.surveyStrikes ? "#ef4444" : "#4a4a4a",
                  }}
                >
                  ✕
                </Text>
              ))}
            </View>
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
            {[1, 2, 3, 4, 5].map((rank) => {
              const revealedAnswer = getRevealedAnswer(rank);
              return (
                <View
                  key={rank}
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
                      backgroundColor: revealedAnswer ? "#3a3a3a" : "#2a2a2a",
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
                        color: revealedAnswer ? "#ffffff" : "transparent",
                        textAlign: "center",
                      }}
                    >
                      {revealedAnswer ? revealedAnswer.text : "???"}
                    </Text>
                  </View>

                  {/* Points Box */}
                  <View
                    style={{
                      width: 50,
                      backgroundColor: revealedAnswer ? "#3a3a3a" : "#2a2a2a",
                      borderRadius: 8,
                      paddingVertical: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: revealedAnswer ? "#d4a853" : "transparent",
                      }}
                    >
                      {revealedAnswer ? revealedAnswer.points : "0"}
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
                  {state.surveyTotalPoints}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* First Try Bonus Popup */}
          {showBonus && (
            <View
              style={{
                position: "absolute",
                top: "40%",
                left: 0,
                right: 0,
                alignItems: "center",
                zIndex: 100,
              }}
            >
              <View
                style={{
                  backgroundColor: "#22c55e",
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  borderRadius: 12,
                }}
              >
                <Text style={{ fontSize: 24, fontWeight: "800", color: "#ffffff" }}>
                  +{SURVEY_FIRST_TRY_BONUS} BONUS!
                </Text>
              </View>
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
              {question.question_text}
            </Text>
          </View>

          {/* Selection Grid - 2 columns x 4 rows */}
          <View style={{ flex: 1 }}>
            {[0, 1, 2, 3].map((row) => (
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
