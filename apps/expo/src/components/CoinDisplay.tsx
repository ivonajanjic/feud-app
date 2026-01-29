import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from "react-native-svg";

interface CoinDisplayProps {
  balance: number;
}

// Elegant coin icon
function CoinIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <LinearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFE066" />
          <Stop offset="50%" stopColor="#FFD700" />
          <Stop offset="100%" stopColor="#FFA000" />
        </LinearGradient>
      </Defs>
      <Circle cx="16" cy="16" r="14" fill="url(#coinGrad)" stroke="#E6A800" strokeWidth="2" />
      <Circle cx="16" cy="16" r="10" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.5" />
      <Path
        d="M16 8 L17 12 L16 11 L15 12 Z"
        fill="#FFA000"
        transform="rotate(0, 16, 16)"
      />
      <Path d="M16 8 L17 12 L16 11 L15 12 Z" fill="#FFA000" transform="rotate(72, 16, 16)" />
      <Path d="M16 8 L17 12 L16 11 L15 12 Z" fill="#FFA000" transform="rotate(144, 16, 16)" />
      <Path d="M16 8 L17 12 L16 11 L15 12 Z" fill="#FFA000" transform="rotate(216, 16, 16)" />
      <Path d="M16 8 L17 12 L16 11 L15 12 Z" fill="#FFA000" transform="rotate(288, 16, 16)" />
      <Circle cx="16" cy="16" r="4" fill="#FFEB3B" />
    </Svg>
  );
}

export function CoinDisplay({ balance }: CoinDisplayProps) {
  const formattedBalance = balance.toLocaleString();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
      }}
    >
      <CoinIcon size={28} />
      <Text
        style={{
          marginLeft: 8,
          fontSize: 18,
          fontWeight: "700",
          color: "#1a1a2e",
          minWidth: 60,
        }}
      >
        {formattedBalance}
      </Text>
    </View>
  );
}
