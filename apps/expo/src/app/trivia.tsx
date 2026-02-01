import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, Pressable, BackHandler, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useGameStore } from "../store/use-game-store";
import { getGameState } from "../store/game-store";
import triviaPool from "../data/trivia_pool.json";

interface TriviaQuestion {
  question: string;
  options: string[];
  correct_index: number;
}

const TOTAL_QUESTIONS = 5;
const TOTAL_TIME_SECONDS = 60;
const CORRECT_POINTS = 10;
const INCORRECT_POINTS = -5;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

function getRandomQuestions(): TriviaQuestion[] {
  const shuffled = shuffleArray(triviaPool as TriviaQuestion[]);
  return shuffled.slice(0, TOTAL_QUESTIONS);
}

export default function TriviaScreen() {
  const router = useRouter();
  const { state, startTriviaRound, recordTriviaAnswer, finishTriviaRound } = useGameStore();

  const [questions] = useState<TriviaQuestion[]>(() => getRandomQuestions());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME_SECONDS);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackScale = useSharedValue(1);

  useEffect(() => {
    startTriviaRound();
  }, [startTriviaRound]);

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

    const currentState = getGameState();
    const score = currentState.triviaScore;
    const earned = finishTriviaRound();
    setFinalScore(score);
    setCoinsEarned(earned);
    setIsGameOver(true);
  }, [finishTriviaRound]);

  const handleAnswerSelect = useCallback(
    (answerIndex: number) => {
      if (selectedAnswer !== null || isGameOver) return;

      const currentQuestion = questions[currentQuestionIndex];
      if (!currentQuestion) return;

      const isCorrect = answerIndex === currentQuestion.correct_index;
      setSelectedAnswer(answerIndex);
      setShowResult(true);
      recordTriviaAnswer(isCorrect);

      feedbackScale.value = withSequence(
        withTiming(1.02, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );

      setTimeout(() => {
        if (currentQuestionIndex < TOTAL_QUESTIONS - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
          setSelectedAnswer(null);
          setShowResult(false);
        } else {
          endGame();
        }
      }, 800);
    },
    [selectedAnswer, isGameOver, questions, currentQuestionIndex, recordTriviaAnswer, feedbackScale, endGame]
  );

  const handleReturnHome = useCallback(() => {
    router.replace("/");
  }, [router]);

  const currentQuestion = questions[currentQuestionIndex];

  const feedbackStyle = useAnimatedStyle(() => ({
    transform: [{ scale: feedbackScale.value }],
  }));

  const getButtonStyle = (index: number) => {
    if (!showResult) {
      return {
        backgroundColor: "#4a4a4a",
      };
    }

    if (!currentQuestion) return { backgroundColor: "#4a4a4a" };

    if (index === currentQuestion.correct_index) {
      return {
        backgroundColor: "#22c55e",
      };
    }
    if (index === selectedAnswer && index !== currentQuestion.correct_index) {
      return {
        backgroundColor: "#ef4444",
      };
    }
    return {
      backgroundColor: "#3a3a3a",
    };
  };

  // Game Over Screen
  if (isGameOver) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1c1c1e" }}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1 }}>
          <Stack.Screen
            options={{
              headerShown: false,
            }}
          />
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
                FINAL SCORE
              </Text>
              <Text
                style={{
                  fontSize: 64,
                  fontWeight: "800",
                  color: finalScore >= 0 ? "#22c55e" : "#ef4444",
                }}
              >
                {finalScore}
              </Text>
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
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />

        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>
          {/* Question Counter */}
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#ffffff",
              textAlign: "center",
              letterSpacing: 3,
              marginBottom: 16,
            }}
          >
            QUESTION {currentQuestionIndex + 1}/{TOTAL_QUESTIONS}
          </Text>

          {/* Question Card */}
          <Animated.View
            style={[
              feedbackStyle,
              {
                borderWidth: 2,
                borderColor: "#d4a853",
                borderRadius: 16,
                paddingVertical: 32,
                paddingHorizontal: 24,
                marginBottom: 32,
                minHeight: 120,
                justifyContent: "center",
              },
            ]}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "500",
                color: "#ffffff",
                textAlign: "center",
                lineHeight: 28,
              }}
            >
              {currentQuestion?.question}
            </Text>
          </Animated.View>

          {/* Answer Options */}
          <View style={{ gap: 12 }}>
            {currentQuestion?.options.map((option, index) => (
              <Pressable
                key={index}
                onPress={() => handleAnswerSelect(index)}
                disabled={showResult}
                style={({ pressed }) => ({
                  ...getButtonStyle(index),
                  opacity: pressed && !showResult ? 0.8 : 1,
                  borderRadius: 12,
                  paddingVertical: 20,
                  paddingHorizontal: 24,
                })}
              >
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "500",
                    color: "#ffffff",
                    textAlign: "center",
                  }}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Score Display */}
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#ffffff",
              textAlign: "center",
              letterSpacing: 2,
              marginBottom: 24,
            }}
          >
            SCORE: {state.triviaScore}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
