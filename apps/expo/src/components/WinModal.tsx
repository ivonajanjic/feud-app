import React, { useEffect } from "react";
import { View, Text, Modal, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

interface WinModalProps {
  visible: boolean;
  coinsWon: number;
  onClose: () => void;
}

// Large coin icon for win display
function LargeCoinIcon() {
  return (
    <Svg width={100} height={100} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="45" fill="#FFD700" stroke="#FFA500" strokeWidth="4" />
      <Circle cx="50" cy="50" r="35" fill="#FFDF00" />
      {/* Sun rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <Path
          key={angle}
          d="M50 15 L55 35 L50 30 L45 35 Z"
          fill="#FFA500"
          transform={`rotate(${angle}, 50, 50)`}
        />
      ))}
      <Circle cx="50" cy="50" r="15" fill="#FFD700" stroke="#FFA500" strokeWidth="2" />
    </Svg>
  );
}

export function WinModal({ visible, coinsWon, onClose }: WinModalProps) {
  const scale = useSharedValue(0);
  const coinScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12 });
      coinScale.value = withDelay(
        200,
        withSequence(withSpring(1.2, { damping: 8 }), withSpring(1, { damping: 10 }))
      );
    } else {
      scale.value = 0;
      coinScale.value = 0;
    }
  }, [visible, scale, coinScale]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinScale.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60">
        <Animated.View
          style={containerStyle}
          className="mx-8 items-center rounded-3xl bg-white px-10 py-8"
        >
          <Animated.View style={coinStyle}>
            <LargeCoinIcon />
          </Animated.View>

          <Text className="mt-4 text-2xl font-bold text-gray-800">You Won!</Text>

          <Text className="mt-2 text-4xl font-bold text-yellow-600">+{coinsWon}</Text>

          <Text className="mt-1 text-lg text-gray-500">coins</Text>

          <Pressable
            onPress={onClose}
            className="mt-6 rounded-full bg-yellow-500 px-10 py-3 active:bg-yellow-600"
          >
            <Text className="text-lg font-bold text-white">Collect</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
