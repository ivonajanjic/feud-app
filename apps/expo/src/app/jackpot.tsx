import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { View, Text, Pressable, BackHandler, StatusBar, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { useGameStore } from "../store/use-game-store";
import {
  JACKPOT_TIME_PER_QUESTION,
  JACKPOT_WIN_THRESHOLD,
  JACKPOT_PRIZE,
  JACKPOT_QUESTION_COUNT,
} from "../store/game-store";
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

// Get N random unique questions from the pool
function getRandomQuestions(count: number): SurveyQuestion[] {
  const shuffled = [...surveyPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count) as SurveyQuestion[];
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

type GamePhase = "quiz" | "reveal" | "result";

export default function JackpotScreen() {
  const router = useRouter();
  const {
    state,
    startJackpotRound,
    recordJackpotAnswer,
    advanceJackpotQuestion,
    startJackpotReveal,
    revealNextJackpotAnswer,
    finishJackpotRound,
  } = useGameStore();

  // Game phases
  const [gamePhase, setGamePhase] = useState<GamePhase>("quiz");
  const [isGameStarted, setIsGameStarted] = useState(false);

  // Quiz phase state
  const [questions] = useState<SurveyQuestion[]>(() => getRandomQuestions(JACKPOT_QUESTION_COUNT));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<SurveyOption[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(JACKPOT_TIME_PER_QUESTION);
  const [isAnswering, setIsAnswering] = useState(false);

  // Result state
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [isWinner, setIsWinner] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const boardScale = useSharedValue(1);

  const currentQuestion = questions[currentQuestionIndex];

  // Initialize game
  useEffect(() => {
    startJackpotRound();
    setIsGameStarted(true);
  }, [startJackpotRound]);

  // Shuffle options when question changes
  useEffect(() => {
    if (currentQuestion) {
      setShuffledOptions(shuffleArray(currentQuestion.options));
      setTimeRemaining(JACKPOT_TIME_PER_QUESTION);
      setIsAnswering(false);
    }
  }, [currentQuestionIndex, currentQuestion]);

  // Timer countdown for quiz phase
  useEffect(() => {
    if (!isGameStarted || gamePhase !== "quiz" || isAnswering) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameStarted, gamePhase, currentQuestionIndex, isAnswering]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (gamePhase !== "result") {
        return true; // Prevent back during game
      }
      return false;
    });
    return () => backHandler.remove();
  }, [gamePhase]);

  const handleTimeout = useCallback(() => {
    if (!currentQuestion || isAnswering) return;
    setIsAnswering(true);

    // Record 0 points for timeout
    advanceJackpotQuestion(currentQuestion.question_text);

    // Move to next question or reveal phase
    setTimeout(() => {
      if (currentQuestionIndex >= JACKPOT_QUESTION_COUNT - 1) {
        startJackpotReveal();
        setGamePhase("reveal");
      } else {
        setCurrentQuestionIndex((prev) => prev + 1);
      }
    }, 300);
  }, [currentQuestion, currentQuestionIndex, advanceJackpotQuestion, startJackpotReveal, isAnswering]);

  const handleOptionSelect = useCallback(
    (option: SurveyOption) => {
      if (isAnswering || !currentQuestion) return;
      setIsAnswering(true);

      if (timerRef.current) clearInterval(timerRef.current);

      // Get points - only correct answers have points > 0
      const points = option.is_correct ? option.points : 0;

      // Record the answer
      recordJackpotAnswer(currentQuestion.question_text, option.text, points);

      // Animate feedback
      boardScale.value = withSequence(
        withTiming(1.02, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );

      // Move to next question or reveal phase
      setTimeout(() => {
        if (currentQuestionIndex >= JACKPOT_QUESTION_COUNT - 1) {
          startJackpotReveal();
          setGamePhase("reveal");
        } else {
          setCurrentQuestionIndex((prev) => prev + 1);
        }
      }, 300);
    },
    [
      isAnswering,
      currentQuestion,
      currentQuestionIndex,
      recordJackpotAnswer,
      startJackpotReveal,
      boardScale,
    ]
  );

  const handleRevealTap = useCallback(() => {
    if (gamePhase !== "reveal") return;

    const revealed = revealNextJackpotAnswer();

    // Animate reveal
    boardScale.value = withSequence(
      withSpring(1.01, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );

    // Check if all revealed
    if (revealed >= JACKPOT_QUESTION_COUNT) {
      setTimeout(() => {
        const result = finishJackpotRound();
        setCoinsEarned(result.coinsEarned);
        setIsWinner(result.isWinner);
        setGamePhase("result");
      }, 500);
    }
  }, [gamePhase, revealNextJackpotAnswer, finishJackpotRound, boardScale]);

  const handleReturnHome = useCallback(() => {
    router.replace("/");
  }, [router]);

  const boardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }],
  }));

  // Quiz Phase UI
  if (gamePhase === "quiz" && currentQuestion) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1c1c1e" }}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1 }}>
          <Stack.Screen options={{ headerShown: false }} />

          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
            {/* Header */}
            <Animated.Text
              style={{
                fontSize: 28,
                fontWeight: "800",
                color: "#d4a853",
                textAlign: "center",
                letterSpacing: 3,
                marginBottom: 24,
              }}
            >
              JACKPOT!
            </Animated.Text>

            {/* Timer - Large Display */}
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <Text
                style={{
                  fontSize: 72,
                  fontWeight: "800",
                  color: timeRemaining <= 3 ? "#ef4444" : "#ffffff",
                }}
              >
                {timeRemaining}s
              </Text>
            </View>

            {/* Question Counter */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#888888",
                textAlign: "center",
                marginBottom: 24,
                letterSpacing: 2,
              }}
            >
              QUESTION {currentQuestionIndex + 1}/{JACKPOT_QUESTION_COUNT}
            </Text>

            {/* Question Text */}
            <View
              style={{
                borderWidth: 2,
                borderColor: "#d4a853",
                borderRadius: 16,
                paddingVertical: 24,
                paddingHorizontal: 20,
                marginBottom: 24,
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
                {currentQuestion.question_text}
              </Text>
            </View>

            {/* Answer Grid - 2 columns x 4 rows */}
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
                        onPress={() => handleOptionSelect(option)}
                        disabled={isAnswering}
                        style={({ pressed }) => ({
                          flex: 1,
                          backgroundColor: pressed ? "#3a3a3a" : "#4a4a4a",
                          opacity: isAnswering ? 0.5 : pressed ? 0.9 : 1,
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

  // Reveal Phase UI (includes result display after all reveals)
  if (gamePhase === "reveal" || gamePhase === "result") {
    const allRevealed = state.jackpotRevealedCount >= JACKPOT_QUESTION_COUNT;
    const showResult = gamePhase === "result";

    // Calculate progressive total (sum of revealed answers only)
    const progressiveTotal = state.jackpotAnswers
      .slice(0, state.jackpotRevealedCount)
      .reduce((sum, answer) => sum + answer.points, 0);

    const handleScreenTap = () => {
      if (showResult) {
        // Result is showing, tap to go home
        handleReturnHome();
      } else if (!allRevealed) {
        // Still revealing answers
        handleRevealTap();
      }
    };

    return (
      <View style={{ flex: 1, backgroundColor: "#1c1c1e" }}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1 }}>
          <Stack.Screen options={{ headerShown: false }} />

          <Pressable
            onPress={handleScreenTap}
            style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}
          >
            {/* Header */}
            <Animated.Text
              style={{
                fontSize: 28,
                fontWeight: "800",
                color: "#d4a853",
                textAlign: "center",
                letterSpacing: 3,
                marginBottom: 32,
              }}
            >
              JACKPOT!
            </Animated.Text>

            {/* Answers Board */}
            <Animated.View
              style={[
                boardStyle,
                {
                  borderWidth: 2,
                  borderColor: showResult && isWinner ? "#5DADE2" : "#d4a853",
                  borderRadius: 16,
                  padding: 16,
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
                  marginBottom: 16,
                  letterSpacing: 2,
                }}
              >
                ANSWERS BOARD
              </Text>

              {/* 5 Answer Rows */}
              {state.jackpotAnswers.map((answer, index) => {
                const isRevealed = index < state.jackpotRevealedCount;
                return (
                  <View
                    key={index}
                    style={{
                      flexDirection: "row",
                      marginBottom: 12,
                      alignItems: "center",
                    }}
                  >
                    {/* Answer Text Box */}
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: isRevealed ? "#3a3a3a" : "#2a2a2a",
                        borderRadius: 8,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        marginRight: 8,
                        borderWidth: 1,
                        borderColor: isRevealed ? "#4a4a4a" : "#3a3a3a",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: isRevealed ? "#ffffff" : "transparent",
                          textAlign: "left",
                        }}
                        numberOfLines={1}
                      >
                        {isRevealed ? answer.answerText : ""}
                      </Text>
                    </View>

                    {/* Points Box */}
                    <View
                      style={{
                        width: 60,
                        backgroundColor: isRevealed ? "#3a3a3a" : "#2a2a2a",
                        borderRadius: 8,
                        paddingVertical: 14,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: isRevealed ? "#4a4a4a" : "#3a3a3a",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color: isRevealed
                            ? answer.points > 0
                              ? "#d4a853"
                              : "#888888"
                            : "transparent",
                        }}
                      >
                        {isRevealed ? answer.points : ""}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Total Row */}
              <View
                style={{
                  flexDirection: "row",
                  marginTop: 8,
                  alignItems: "center",
                  justifyContent: "flex-end",
                  borderTopWidth: 1,
                  borderTopColor: "#3a3a3a",
                  paddingTop: 12,
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
                    width: 60,
                    backgroundColor:
                      showResult && isWinner ? "#d4a853" : "#3a3a3a",
                    borderRadius: 8,
                    paddingVertical: 14,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: showResult && isWinner ? "#d4a853" : "#4a4a4a",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "800",
                      color: showResult && isWinner ? "#1c1c1e" : "#d4a853",
                    }}
                  >
                    {state.jackpotRevealedCount > 0 ? progressiveTotal : ""}
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Result Section (shown after all reveals) */}
            {showResult ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                {isWinner ? (
                  <>
                    <Text
                      style={{
                        fontSize: 28,
                        fontWeight: "800",
                        color: "#ffffff",
                        marginBottom: 12,
                        letterSpacing: 2,
                      }}
                    >
                      CONGRATULATIONS!
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        color: "#888888",
                        marginBottom: 20,
                        textAlign: "center",
                      }}
                    >
                      You've unlocked the Jackpot and won:
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: "#d4a853",
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 8,
                        }}
                      >
                        <Text style={{ fontSize: 18, fontWeight: "800", color: "#1c1c1e" }}>
                          $
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 48,
                          fontWeight: "800",
                          color: "#d4a853",
                        }}
                      >
                        {JACKPOT_PRIZE}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text
                      style={{
                        fontSize: 28,
                        fontWeight: "700",
                        color: "#ffffff",
                        marginBottom: 12,
                        letterSpacing: 2,
                      }}
                    >
                      GAME OVER
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        color: "#888888",
                        textAlign: "center",
                      }}
                    >
                      You needed {JACKPOT_WIN_THRESHOLD} points to win.
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        color: "#666666",
                        marginTop: 8,
                      }}
                    >
                      Better luck next time!
                    </Text>
                  </>
                )}
              </View>
            ) : (
              /* Tap Prompt */
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#666666",
                    fontWeight: "500",
                    letterSpacing: 1,
                  }}
                >
                  TAP TO REVEAL
                </Text>
              </View>
            )}

            {/* Continue Prompt (shown after result) */}
            {showResult && (
              <View style={{ paddingBottom: 24, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#666666",
                    letterSpacing: 2,
                  }}
                >
                  TAP TO CONTINUE
                </Text>
              </View>
            )}
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  // Fallback (should not be reached)
  return null;
}
