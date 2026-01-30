import React from "react";
import { View, Text, Image } from "react-native";

interface CoinDisplayProps {
  balance: number;
}

export function CoinDisplay({ balance }: CoinDisplayProps) {
  const formattedBalance = balance.toLocaleString();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <Image
        source={require("../../assets/coin-icon.png")}
        style={{
          width: 40,
          height: 40,
        }}
        resizeMode="contain"
      />
      <Text
        style={{
          marginLeft: 10,
          fontSize: 20,
          fontWeight: "700",
          color: "#FFFFFF",
          minWidth: 60,
        }}
      >
        {formattedBalance}
      </Text>
    </View>
  );
}
