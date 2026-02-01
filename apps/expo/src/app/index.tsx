import React, { useState, useCallback, useRef } from "react";
import { View, Pressable, Image, Dimensions, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { SpinWheel, SpinWheelRef } from "../components/SpinWheel";
import { CoinDisplay } from "../components/CoinDisplay";
import { useGameStore } from "../store/use-game-store";
import { getWedgeFromRotation } from "../store/game-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BUTTON_WIDTH = SCREEN_WIDTH * 0.6;

export default function Index() {
  const router = useRouter();
  const { state, setWheelRotation, addCoins } = useGameStore();
  const [isSpinning, setIsSpinning] = useState(false);
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
          {/* Coin Balance Display - Top Center */}
          <View style={{ alignItems: "center", paddingTop: 20 }}>
            <CoinDisplay balance={state.playerBalance} />
          </View>

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
