import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, Pressable, BackHandler, StatusBar, Dimensions, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { useGameStore } from "../store/use-game-store";
import {
  DESTROY_CONSOLATION_PRIZE,
  DESTROY_MIN_REWARD,
  DESTROY_MAX_REWARD,
} from "../store/game-store";
import surveyPool from "../data/survey_pool.json";
import roomsData from "../data/players_rooms.json";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type GamePhase = "trivia" | "blocked" | "cards" | "revealed";

interface SurveyQuestion {
  question_text: string;
  options: { text: string; is_correct: boolean; points: number }[];
}

interface RoomObject {
  name: string;
  emoji: string;
}

interface Room {
  id: number;
  owner_name: string;
  objects: RoomObject[];
}

// Get a random question from the pool and select 2 options (1 correct, 1 incorrect)
function getRandomTriviaQuestion(): {
  question: string;
  correctAnswer: string;
  wrongAnswer: string;
} {
  const randomIndex = Math.floor(Math.random() * surveyPool.length);
  const question = surveyPool[randomIndex] as SurveyQuestion;

  const correctOptions = question.options.filter((o) => o.is_correct);
  const wrongOptions = question.options.filter((o) => !o.is_correct);

  const correctAnswer =
    correctOptions[Math.floor(Math.random() * correctOptions.length)]?.text || "Yes";
  const wrongAnswer =
    wrongOptions[Math.floor(Math.random() * wrongOptions.length)]?.text || "No";

  return {
    question: question.question_text,
    correctAnswer,
    wrongAnswer,
  };
}

// Get a random room from the data
function getRandomRoom(): Room {
  const rooms = roomsData.rooms as Room[];
  const randomIndex = Math.floor(Math.random() * rooms.length);
  return rooms[randomIndex]!;
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

export default function DestroyScreen() {
  const router = useRouter();
  const { startDestroyRound, finishDestroyRound } = useGameStore();

  // Game state
  const [phase, setPhase] = useState<GamePhase>("trivia");
  const [triviaData] = useState(() => getRandomTriviaQuestion());
  const [shuffledAnswers] = useState(() =>
    shuffleArray([
      { text: triviaData.correctAnswer, isCorrect: true },
      { text: triviaData.wrongAnswer, isCorrect: false },
    ])
  );
  const [selectedRoom] = useState(() => getRandomRoom());
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [revealedObject, setRevealedObject] = useState<RoomObject | null>(null);
  const [coinsEarned, setCoinsEarned] = useState(0);

  // Animation values - defined separately for each card to avoid hooks in loops
  const cardScale0 = useSharedValue(1);
  const cardScale1 = useSharedValue(1);
  const cardScale2 = useSharedValue(1);
  const cardFlip0 = useSharedValue(0);
  const cardFlip1 = useSharedValue(0);
  const cardFlip2 = useSharedValue(0);

  // Card animated styles - must be called at top level
  const cardStyle0 = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale0.value },
      { rotateY: `${cardFlip0.value * 180}deg` },
    ],
  }));
  const cardStyle1 = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale1.value },
      { rotateY: `${cardFlip1.value * 180}deg` },
    ],
  }));
  const cardStyle2 = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale2.value },
      { rotateY: `${cardFlip2.value * 180}deg` },
    ],
  }));

  const cardStyles = [cardStyle0, cardStyle1, cardStyle2];
  const cardScales = [cardScale0, cardScale1, cardScale2];
  const cardFlips = [cardFlip0, cardFlip1, cardFlip2];

  // Initialize game
  useEffect(() => {
    startDestroyRound();
  }, [startDestroyRound]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (phase === "trivia" || phase === "cards") {
        return true; // Prevent back during gameplay
      }
      return false;
    });
    return () => backHandler.remove();
  }, [phase]);

  const handleTriviaAnswer = useCallback(
    (isCorrect: boolean) => {
      if (isCorrect) {
        // Proceed to card selection
        setPhase("cards");
      } else {
        // Blocked - give consolation prize
        const consolation = finishDestroyRound(DESTROY_CONSOLATION_PRIZE);
        setCoinsEarned(consolation);
        setPhase("blocked");
      }
    },
    [finishDestroyRound]
  );

  const handleCardSelect = useCallback(
    (cardIndex: number) => {
      if (selectedCardIndex !== null) return; // Already selected

      setSelectedCardIndex(cardIndex);

      // Animate card
      cardScales[cardIndex]!.value = withSequence(
        withSpring(1.1),
        withSpring(1)
      );
      cardFlips[cardIndex]!.value = withTiming(1, { duration: 400 });

      // Get the object for this card
      const object = selectedRoom.objects[cardIndex];
      setRevealedObject(object || null);

      // Calculate random reward
      const reward =
        Math.floor(Math.random() * (DESTROY_MAX_REWARD - DESTROY_MIN_REWARD + 1)) +
        DESTROY_MIN_REWARD;
      const earned = finishDestroyRound(reward);
      setCoinsEarned(earned);

      // Transition to revealed phase after animation
      setTimeout(() => {
        setPhase("revealed");
      }, 500);
    },
    [selectedCardIndex, selectedRoom.objects, finishDestroyRound, cardScales, cardFlips]
  );

  const handleReturnHome = useCallback(() => {
    router.replace("/");
  }, [router]);

  // Trivia Gate Phase
  if (phase === "trivia") {
    return (
      <View style={{ flex: 1, backgroundColor: "#1c1c1e" }}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1 }}>
          <Stack.Screen options={{ headerShown: false }} />

          <View
            style={{
              flex: 1,
              paddingHorizontal: 24,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Header */}
            <Text
              style={{
                fontSize: 18,
                fontWeight: "500",
                color: "#888888",
                marginBottom: 8,
              }}
            >
              Let's destroy
            </Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: "#ffffff",
                marginBottom: 48,
                letterSpacing: 1,
              }}
            >
              {selectedRoom.owner_name.toUpperCase()}'S ROOM
            </Text>

            {/* Question Container */}
            <View
              style={{
                borderWidth: 2,
                borderColor: "#d4a853",
                borderRadius: 16,
                paddingVertical: 24,
                paddingHorizontal: 20,
                marginBottom: 32,
                backgroundColor: "rgba(212, 168, 83, 0.05)",
                width: "100%",
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
                {triviaData.question}
              </Text>
            </View>

            {/* Answer Buttons */}
            <View style={{ width: "100%", gap: 12 }}>
              {shuffledAnswers.map((answer, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleTriviaAnswer(answer.isCorrect)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? "#3a3a3a" : "#4a4a4a",
                    paddingVertical: 16,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    alignItems: "center",
                  })}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      color: "#ffffff",
                    }}
                  >
                    {answer.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Blocked Phase (Wrong Answer)
  if (phase === "blocked") {
    return (
      <View style={{ flex: 1, backgroundColor: "#1c1c1e" }}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1 }}>
          <Stack.Screen options={{ headerShown: false }} />

          <View
            style={{
              flex: 1,
              paddingHorizontal: 24,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Blocked Title */}
            <Text
              style={{
                fontSize: 36,
                fontWeight: "700",
                color: "#ef4444",
                marginBottom: 16,
                letterSpacing: 2,
              }}
            >
              BLOCKED!
            </Text>

            {/* Big X */}
            <Text
              style={{
                fontSize: 100,
                fontWeight: "800",
                color: "#ef4444",
                marginBottom: 40,
              }}
            >
              ✕
            </Text>

            {/* Consolation Prize */}
            <View
              style={{
                borderWidth: 2,
                borderColor: "#d4a853",
                borderRadius: 16,
                paddingVertical: 24,
                paddingHorizontal: 40,
                alignItems: "center",
                marginBottom: 40,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: "#888888",
                  marginBottom: 8,
                }}
              >
                Consolation Prize
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={require("../../assets/coin-icon.png")}
                  style={{ width: 32, height: 32, marginRight: 8 }}
                  resizeMode="contain"
                />
                <Text
                  style={{
                    fontSize: 48,
                    fontWeight: "700",
                    color: "#d4a853",
                  }}
                >
                  {coinsEarned}
                </Text>
              </View>
            </View>

            {/* Continue Button */}
            <Pressable
              onPress={handleReturnHome}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#2563eb" : "#3b82f6",
                paddingHorizontal: 48,
                paddingVertical: 16,
                borderRadius: 30,
                minWidth: SCREEN_WIDTH * 0.6,
                alignItems: "center",
              })}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#ffffff",
                  letterSpacing: 1,
                }}
              >
                TAP TO CONTINUE
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Card Selection Phase
  if (phase === "cards") {
    return (
      <View style={{ flex: 1, backgroundColor: "#1c1c1e" }}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1 }}>
          <Stack.Screen options={{ headerShown: false }} />

          <View
            style={{
              flex: 1,
              paddingHorizontal: 24,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Header */}
            <Text
              style={{
                fontSize: 18,
                fontWeight: "500",
                color: "#888888",
                marginBottom: 8,
              }}
            >
              Let's destroy
            </Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: "#ffffff",
                marginBottom: 48,
                letterSpacing: 1,
              }}
            >
              {selectedRoom.owner_name.toUpperCase()}'S ROOM
            </Text>

            {/* Cards Container */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                gap: 16,
                marginBottom: 48,
              }}
            >
              {[0, 1, 2].map((index) => {
                const isRevealed = selectedCardIndex === index;
                const object = selectedRoom.objects[index];

                return (
                  <Pressable
                    key={index}
                    onPress={() => handleCardSelect(index)}
                    disabled={selectedCardIndex !== null}
                  >
                    <Animated.View
                      style={[
                        cardStyles[index],
                        {
                          width: SCREEN_WIDTH * 0.25,
                          height: SCREEN_WIDTH * 0.35,
                          backgroundColor: isRevealed ? "#2a2a2a" : "#d4a853",
                          borderWidth: 3,
                          borderColor: "#d4a853",
                          borderRadius: 12,
                          justifyContent: "center",
                          alignItems: "center",
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 8,
                        },
                      ]}
                    >
                      {isRevealed && object ? (
                        <Text style={{ fontSize: 48 }}>{object.emoji}</Text>
                      ) : (
                        <Text
                          style={{
                            fontSize: 48,
                            fontWeight: "700",
                            color: "#1c1c1e",
                          }}
                        >
                          ?
                        </Text>
                      )}
                    </Animated.View>
                  </Pressable>
                );
              })}
            </View>

            {/* Instruction */}
            <Text
              style={{
                fontSize: 16,
                color: "#888888",
                textAlign: "center",
              }}
            >
              Tap a card to destroy an item
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Revealed Phase (Success)
  return (
    <View style={{ flex: 1, backgroundColor: "#1c1c1e" }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <Stack.Screen options={{ headerShown: false }} />

        <View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Header */}
          <Text
            style={{
              fontSize: 18,
              fontWeight: "500",
              color: "#888888",
              marginBottom: 8,
            }}
          >
            Let's destroy
          </Text>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#ffffff",
              marginBottom: 32,
              letterSpacing: 1,
            }}
          >
            {selectedRoom.owner_name.toUpperCase()}'S ROOM
          </Text>

          {/* Cards showing revealed item */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {[0, 1, 2].map((index) => {
              const isSelected = selectedCardIndex === index;
              const object = selectedRoom.objects[index];

              return (
                <View
                  key={index}
                  style={{
                    width: SCREEN_WIDTH * 0.25,
                    height: SCREEN_WIDTH * 0.35,
                    backgroundColor: isSelected ? "#2a2a2a" : "#3a3a3a",
                    borderWidth: 3,
                    borderColor: isSelected ? "#d4a853" : "#4a4a4a",
                    borderRadius: 12,
                    justifyContent: "center",
                    alignItems: "center",
                    opacity: isSelected ? 1 : 0.5,
                  }}
                >
                  {isSelected && object ? (
                    <Text style={{ fontSize: 48 }}>{object.emoji}</Text>
                  ) : (
                    <Text
                      style={{
                        fontSize: 48,
                        fontWeight: "700",
                        color: "#666666",
                      }}
                    >
                      ?
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Result Message */}
          <Text
            style={{
              fontSize: 18,
              color: "#ffffff",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            You destroyed {selectedRoom.owner_name}'s {revealedObject?.name || "item"} and got
          </Text>

          {/* Coins Earned */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 48,
            }}
          >
            <Image
              source={require("../../assets/coin-icon.png")}
              style={{ width: 40, height: 40, marginRight: 12 }}
              resizeMode="contain"
            />
            <Text
              style={{
                fontSize: 56,
                fontWeight: "700",
                color: "#d4a853",
              }}
            >
              {coinsEarned}
            </Text>
          </View>

          {/* Continue Button */}
          <Pressable
            onPress={handleReturnHome}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#2563eb" : "#3b82f6",
              paddingHorizontal: 48,
              paddingVertical: 16,
              borderRadius: 30,
              minWidth: SCREEN_WIDTH * 0.6,
              alignItems: "center",
            })}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#ffffff",
                letterSpacing: 1,
              }}
            >
              TAP TO CONTINUE
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
