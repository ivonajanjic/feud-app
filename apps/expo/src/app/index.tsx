import React, { useState, useCallback, useRef } from "react";
import { View, Pressable, Image, Dimensions, StatusBar, Text, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { SpinWheel, SpinWheelRef } from "../components/SpinWheel";
import { CoinDisplay } from "../components/CoinDisplay";
import { useGameStore } from "../store/use-game-store";
import { getWedgeFromRotation } from "../store/game-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BUTTON_WIDTH = SCREEN_WIDTH * 0.6;

// Debug menu options
const DEBUG_MODES = [
  { label: "Survey Says", route: "/survey-says" },
  { label: "Survey Steal", route: "/survey-steal" },
  { label: "Destroy", route: "/destroy" },
  { label: "Match & Win", route: "/match-and-win" },
  { label: "Jackpot", route: "/jackpot" },
] as const;

export default function Index() {
  const router = useRouter();
  const { state, setWheelRotation, addCoins } = useGameStore();
  const [isSpinning, setIsSpinning] = useState(false);
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const spinWheelRef = useRef<SpinWheelRef>(null);

  const handleSpinStart = useCallback(() => {
    setIsSpinning(true);
  }, []);

  const handleSpinComplete = useCallback(
    (finalRotation: number) => {
      setWheelRotation(finalRotation);
      setIsSpinning(false);

      const wedge = getWedgeFromRotation(finalRotation);

      if (wedge.type === "survey") {
        setTimeout(() => {
          router.push("/survey-says");
        }, 600);
      } else if (wedge.type === "steal") {
        setTimeout(() => {
          router.push("/survey-steal");
        }, 600);
      } else if (wedge.type === "destroy") {
        setTimeout(() => {
          router.push("/destroy");
        }, 600);
      } else if (wedge.type === "match") {
        setTimeout(() => {
          router.push("/match-and-win");
        }, 600);
      } else {
        addCoins(wedge.value);
      }
    },
    [setWheelRotation, addCoins, router]
  );

  const handleSpinButtonPress = useCallback(() => {
    if (isSpinning) return;
    spinWheelRef.current?.spin();
  }, [isSpinning]);

  return (
    <View style={{ flex: 1, backgroundColor: "#1c1c1e" }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />

        <View style={{ flex: 1 }}>
          {/* Top Bar - Debug Button and Coin Display */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingTop: 20,
              paddingHorizontal: 16,
            }}
          >
            {/* Debug Button - Top Left */}
            <Pressable
              onPress={() => setShowDebugMenu(true)}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: pressed ? "#3a3a3a" : "#2a2a2a",
                justifyContent: "center",
                alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 20 }}>⚙️</Text>
            </Pressable>

            {/* Coin Balance Display - Center */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <CoinDisplay balance={state.playerBalance} />
            </View>

            {/* Spacer for symmetry */}
            <View style={{ width: 40 }} />
          </View>

          {/* Debug Menu Modal */}
          <Modal
            visible={showDebugMenu}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDebugMenu(false)}
          >
            <Pressable
              style={{
                flex: 1,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                justifyContent: "flex-start",
                paddingTop: 100,
                paddingLeft: 16,
              }}
              onPress={() => setShowDebugMenu(false)}
            >
              <View
                style={{
                  backgroundColor: "#2a2a2a",
                  borderRadius: 12,
                  padding: 8,
                  width: 180,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: "#888888",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    letterSpacing: 1,
                  }}
                >
                  DEBUG MENU
                </Text>
                {DEBUG_MODES.map((mode) => (
                  <Pressable
                    key={mode.route}
                    onPress={() => {
                      setShowDebugMenu(false);
                      router.push(mode.route);
                    }}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? "#3a3a3a" : "transparent",
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderRadius: 8,
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "500",
                        color: "#ffffff",
                      }}
                    >
                      {mode.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Modal>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Spin Wheel - Center */}
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SpinWheel
              ref={spinWheelRef}
              currentRotation={state.currentWheelRotation}
              isSpinning={isSpinning}
              onSpinComplete={handleSpinComplete}
              onSpinStart={handleSpinStart}
            />
          </View>

          {/* Spacer */}
          <View style={{ flex: 0.5 }} />

          {/* Spin Button - Below Wheel */}
          <View
            style={{
              alignItems: "center",
              paddingBottom: 40,
            }}
          >
            <Pressable
              onPress={handleSpinButtonPress}
              disabled={isSpinning}
              style={({ pressed }) => ({
                opacity: isSpinning ? 0.7 : pressed ? 0.9 : 1,
                transform: [{ scale: pressed && !isSpinning ? 0.97 : 1 }],
              })}
            >
              <Image
                source={require("../../assets/spin-button.png")}
                style={{
                  width: BUTTON_WIDTH,
                  height: BUTTON_WIDTH * 0.35,
                }}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
