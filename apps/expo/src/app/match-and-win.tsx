import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  BackHandler,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { useGameStore } from "../store/use-game-store";
import {
  MATCH_CROWN_POINTS,
  MATCH_BAG_POINTS,
  MATCH_COIN_POINTS,
  type MatchSymbol,
} from "../store/game-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type GamePhase = "playing" | "revealing" | "complete";

// Deck composition: 3 Crowns, 5 Bags, 4 Coins = 12 cards
const DECK_COMPOSITION: MatchSymbol[] = [
  ...Array(3).fill("crown"),
  ...Array(5).fill("bag"),
  ...Array(4).fill("coin"),
];

// Symbol emoji mapping
const SYMBOL_EMOJI: Record<MatchSymbol, string> = {
  crown: "👑",
  bag: "💰",
  coin: "🪙",
};

// Points mapping
const SYMBOL_POINTS: Record<MatchSymbol, number> = {
  crown: MATCH_CROWN_POINTS,
  bag: MATCH_BAG_POINTS,
  coin: MATCH_COIN_POINTS,
};

// Fisher-Yates shuffle
function shuffleDeck<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

// Card dimensions
const CARD_GAP = 8;
const GRID_PADDING = 16;
const CARDS_PER_ROW = 4;
const CARD_WIDTH =
  (SCREEN_WIDTH - GRID_PADDING * 2 - CARD_GAP * (CARDS_PER_ROW - 1)) /
  CARDS_PER_ROW;
const CARD_HEIGHT = CARD_WIDTH * 1.2;

interface CardProps {
  index: number;
  symbol: MatchSymbol;
  isRevealed: boolean;
  isWinningCard: boolean;
  isDisabled: boolean;
  phase: GamePhase;
  onFlip: (index: number) => void;
  revealDelay?: number;
  isAutoRevealed?: boolean; // true if this card is being revealed automatically (not by player tap)
}

function Card({
  index,
  symbol,
  isRevealed,
  isWinningCard,
  isDisabled,
  phase,
  onFlip,
  revealDelay = 0,
  isAutoRevealed = false,
}: CardProps) {
  const flipProgress = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Handle flip animation when card is revealed
  useEffect(() => {
    if (isRevealed && flipProgress.value === 0) {
      // For auto-revealed cards (during reveal sequence), apply opacity immediately with flip
      if (isAutoRevealed && !isWinningCard) {
        // Flip and fade simultaneously
        if (revealDelay > 0) {
          flipProgress.value = withDelay(revealDelay, withTiming(1, { duration: 400 }));
          opacity.value = withDelay(revealDelay, withTiming(0.5, { duration: 400 }));
        } else {
          flipProgress.value = withTiming(1, { duration: 400 });
          opacity.value = withTiming(0.5, { duration: 400 });
        }
      } else {
        // Normal flip (player tapped or winning card)
        if (revealDelay > 0) {
          flipProgress.value = withDelay(revealDelay, withTiming(1, { duration: 400 }));
        } else {
          flipProgress.value = withTiming(1, { duration: 400 });
        }
      }
    }
  }, [isRevealed, revealDelay, flipProgress, isAutoRevealed, isWinningCard, opacity]);

  const handlePress = useCallback(() => {
    if (isDisabled || isRevealed) return;

    // Press feedback animation
    scale.value = withSequence(withSpring(0.95), withSpring(1));

    // Trigger flip
    flipProgress.value = withTiming(1, { duration: 400 });

    onFlip(index);
  }, [isDisabled, isRevealed, scale, flipProgress, onFlip, index]);

  // Front face style (face-down - gold with ?)
  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [0, 180]);
    return {
      transform: [{ scale: scale.value }, { rotateY: `${rotateY}deg` }],
      opacity: opacity.value,
      backfaceVisibility: "hidden" as const,
    };
  });

  // Back face style (face-up - dark with symbol)
  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [180, 360]);
    return {
      transform: [{ scale: scale.value }, { rotateY: `${rotateY}deg` }],
      opacity: opacity.value,
      backfaceVisibility: "hidden" as const,
    };
  });

  return (
    <Pressable onPress={handlePress} disabled={isDisabled || isRevealed}>
      <View
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          position: "relative",
        }}
      >
        {/* Front face (face-down) */}
        <Animated.View
          style={[
            frontStyle,
            {
              position: "absolute",
              width: "100%",
              height: "100%",
              backgroundColor: "#d4a853",
              borderRadius: 8,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            },
          ]}
        >
          <Text
            style={{
              fontSize: 32,
              fontWeight: "700",
              color: "#1c1c1e",
            }}
          >
            ?
          </Text>
        </Animated.View>

        {/* Back face (face-up with symbol) */}
        <Animated.View
          style={[
            backStyle,
            {
              position: "absolute",
              width: "100%",
              height: "100%",
              backgroundColor: "#2a2a2a",
              borderRadius: 8,
              borderWidth: isWinningCard && phase === "complete" ? 2 : 0,
              borderColor: "#d4a853",
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            },
          ]}
        >
          <Text style={{ fontSize: 32 }}>{SYMBOL_EMOJI[symbol]}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

// Progress tracker row component
interface ProgressRowProps {
  symbol: MatchSymbol;
  count: number;
  points: number;
}

function ProgressRow({ symbol, count, points }: ProgressRowProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
      }}
    >
      {/* 3 symbol slots */}
      <View style={{ flexDirection: "row", marginRight: 12 }}>
        {[0, 1, 2].map((slotIndex) => (
          <View
            key={slotIndex}
            style={{
              width: 36,
              height: 36,
              backgroundColor: slotIndex < count ? "#2a2a2a" : "#3a3a3a",
              borderRadius: 6,
              borderWidth: 1,
              borderColor: slotIndex < count ? "#d4a853" : "#4a4a4a",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 4,
            }}
          >
            {slotIndex < count && (
              <Text style={{ fontSize: 20 }}>{SYMBOL_EMOJI[symbol]}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Points label */}
      <View
        style={{
          backgroundColor: "#2a2a2a",
          paddingHorizontal: 16,
          paddingVertical: 6,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: "#4a4a4a",
          minWidth: 80,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#ffffff",
          }}
        >
          ${points}
        </Text>
      </View>
    </View>
  );
}

export default function MatchAndWinScreen() {
  const router = useRouter();
  const { startMatchRound, recordMatchFlip, finishMatchRound } = useGameStore();

  // Game state
  const [phase, setPhase] = useState<GamePhase>("playing");
  const [deck] = useState(() => shuffleDeck([...DECK_COMPOSITION]));
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [matchCounts, setMatchCounts] = useState<Record<MatchSymbol, number>>({
    crown: 0,
    bag: 0,
    coin: 0,
  });
  const [winningSymbol, setWinningSymbol] = useState<MatchSymbol | null>(null);
  const [winningIndices, setWinningIndices] = useState<number[]>([]);
  const [pointsEarned, setPointsEarned] = useState(0);

  // Initialize game
  useEffect(() => {
    startMatchRound();
  }, [startMatchRound]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (phase === "playing" || phase === "revealing") {
        return true; // Prevent back during gameplay
      }
      return false;
    });
    return () => backHandler.remove();
  }, [phase]);

  // Find indices of a specific symbol in the deck
  const getSymbolIndices = useCallback(
    (symbol: MatchSymbol): number[] => {
      return deck
        .map((s, i) => (s === symbol ? i : -1))
        .filter((i) => i !== -1);
    },
    [deck]
  );

  // Handle card flip
  const handleCardFlip = useCallback(
    (cardIndex: number) => {
      if (phase !== "playing") return;
      if (revealedIndices.has(cardIndex)) return;

      const symbol = deck[cardIndex]!;

      // Update local state
      const newRevealedIndices = new Set(revealedIndices);
      newRevealedIndices.add(cardIndex);
      setRevealedIndices(newRevealedIndices);

      const newCounts = { ...matchCounts };
      newCounts[symbol] = newCounts[symbol] + 1;
      setMatchCounts(newCounts);

      // Record in store
      const result = recordMatchFlip(cardIndex, symbol);

      // Check for win
      if (result.isWinner && result.winningSymbol) {
        setWinningSymbol(result.winningSymbol);

        // Find the winning card indices (all cards of the winning symbol that were revealed)
        const allSymbolIndices = getSymbolIndices(result.winningSymbol);
        const revealed = allSymbolIndices.filter((i) => newRevealedIndices.has(i));
        setWinningIndices(revealed);

        // Start reveal sequence
        setPhase("revealing");

        // After a short delay, reveal all remaining cards and complete the game
        const unrevealed = deck
          .map((_, i) => i)
          .filter((i) => !newRevealedIndices.has(i));

        // Calculate total reveal time (100ms stagger per card + 400ms flip animation)
        const totalRevealTime = unrevealed.length * 100 + 400;

        // Transition to complete phase 1 second after all cards are revealed
        setTimeout(() => {
          setPhase("complete");
          const points = finishMatchRound();
          setPointsEarned(points);
        }, totalRevealTime + 1000); // Add 1 second delay after reveal
      }
    },
    [
      phase,
      revealedIndices,
      deck,
      matchCounts,
      recordMatchFlip,
      getSymbolIndices,
      finishMatchRound,
    ]
  );

  const handleReturnHome = useCallback(() => {
    router.replace("/");
  }, [router]);

  // Get unrevealed indices for staggered reveal
  const unrevealedIndices = useMemo(() => {
    if (phase !== "revealing" && phase !== "complete") return [];
    return deck.map((_, i) => i).filter((i) => !revealedIndices.has(i));
  }, [phase, deck, revealedIndices]);

  // Render the card grid
  const renderCardGrid = () => {
    return (
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          paddingHorizontal: GRID_PADDING,
          gap: CARD_GAP,
        }}
      >
        {deck.map((symbol, index) => {
          const wasManuallyRevealed = revealedIndices.has(index);
          const isRevealed =
            wasManuallyRevealed || phase === "revealing";
          const isWinningCard =
            winningSymbol !== null && deck[index] === winningSymbol;
          const isDisabled = phase !== "playing";
          
          // Card is auto-revealed if it's being revealed during reveal phase but wasn't manually tapped
          const isAutoRevealed = phase === "revealing" && !wasManuallyRevealed;

          // Calculate reveal delay for unrevealed cards during reveal sequence
          let revealDelay = 0;
          if (phase === "revealing" && !wasManuallyRevealed) {
            const unrevealedIndex = unrevealedIndices.indexOf(index);
            if (unrevealedIndex !== -1) {
              revealDelay = unrevealedIndex * 100;
            }
          }

          return (
            <Card
              key={index}
              index={index}
              symbol={symbol}
              isRevealed={isRevealed}
              isWinningCard={isWinningCard}
              isDisabled={isDisabled}
              phase={phase}
              onFlip={handleCardFlip}
              revealDelay={revealDelay}
              isAutoRevealed={isAutoRevealed}
            />
          );
        })}
      </View>
    );
  };

  // Playing/Revealing phase
  if (phase === "playing" || phase === "revealing") {
    return (
      <View style={{ flex: 1, backgroundColor: "#1c1c1e" }}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1 }}>
          <Stack.Screen options={{ headerShown: false }} />

          <View
            style={{
              flex: 1,
              paddingHorizontal: 16,
            }}
          >
            {/* Title */}
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: "#ffffff",
                textAlign: "center",
                marginTop: 20,
                marginBottom: 24,
                letterSpacing: 2,
              }}
            >
              MATCH & WIN
            </Text>

            {/* Progress Tracker */}
            <View
              style={{
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "500",
                  color: "#888888",
                  marginBottom: 12,
                  letterSpacing: 1,
                }}
              >
                MATCH 3 TO WIN:
              </Text>
              <ProgressRow
                symbol="crown"
                count={matchCounts.crown}
                points={MATCH_CROWN_POINTS}
              />
              <ProgressRow
                symbol="bag"
                count={matchCounts.bag}
                points={MATCH_BAG_POINTS}
              />
              <ProgressRow
                symbol="coin"
                count={matchCounts.coin}
                points={MATCH_COIN_POINTS}
              />
            </View>

            {/* Card Grid */}
            <View style={{ flex: 1, justifyContent: "center" }}>
              {renderCardGrid()}
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Complete phase (Clean Win screen - no card grid)
  return (
    <View style={{ flex: 1, backgroundColor: "#1c1c1e" }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <Stack.Screen options={{ headerShown: false }} />

        <View
          style={{
            flex: 1,
            paddingHorizontal: 16,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Title */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#ffffff",
              textAlign: "center",
              marginBottom: 48,
              letterSpacing: 2,
            }}
          >
            MATCH & WIN
          </Text>

          {/* Win message */}
          <View
            style={{
              alignItems: "center",
              marginBottom: 48,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: "#888888",
                marginBottom: 16,
                letterSpacing: 1,
              }}
            >
              YOU'VE WON:
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#2a2a2a",
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: "#d4a853",
              }}
            >
              {winningSymbol && (
                <>
                  <Text style={{ fontSize: 36, marginRight: 8 }}>
                    {SYMBOL_EMOJI[winningSymbol]}
                  </Text>
                  <Text style={{ fontSize: 36, marginRight: 8 }}>
                    {SYMBOL_EMOJI[winningSymbol]}
                  </Text>
                  <Text style={{ fontSize: 36, marginRight: 20 }}>
                    {SYMBOL_EMOJI[winningSymbol]}
                  </Text>
                </>
              )}
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "700",
                  color: "#d4a853",
                }}
              >
                ${pointsEarned}
              </Text>
            </View>
          </View>

          {/* Continue Button */}
          <Pressable
            onPress={handleReturnHome}
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#888888",
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
