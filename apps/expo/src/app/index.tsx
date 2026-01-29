import React, { useState, useCallback } from "react";
import { View, Dimensions, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { SpinWheel } from "../components/SpinWheel";
import { CoinDisplay } from "../components/CoinDisplay";
import { useGameStore } from "../store/use-game-store";
import { getWedgeFromRotation } from "../store/game-store";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function Index() {
  const router = useRouter();
  const { state, setWheelRotation, addCoins } = useGameStore();
  const [isSpinning, setIsSpinning] = useState(false);

  const handleSpinStart = useCallback(() => {
    setIsSpinning(true);
  }, []);

  const handleSpinComplete = useCallback(
    (finalRotation: number) => {
      setWheelRotation(finalRotation);
      setIsSpinning(false);

      const wedge = getWedgeFromRotation(finalRotation);

      if (wedge.type === "trivia") {
        setTimeout(() => {
          router.push("/trivia");
        }, 600);
      } else {
        addCoins(wedge.value);
      }
    },
    [setWheelRotation, addCoins, router]
  );

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
          <View style={{ alignItems: "center", paddingTop: 40 }}>
            <CoinDisplay balance={state.playerBalance} />
          </View>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Spin Wheel - Bottom Half */}
          <View
            style={{
              height: SCREEN_HEIGHT * 0.55,
              alignItems: "center",
              justifyContent: "flex-end",
              paddingBottom: 20,
            }}
          >
            <SpinWheel
              currentRotation={state.currentWheelRotation}
              isSpinning={isSpinning}
              onSpinComplete={handleSpinComplete}
              onSpinStart={handleSpinStart}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
