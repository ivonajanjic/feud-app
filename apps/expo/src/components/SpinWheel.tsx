import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import Svg, { G, Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { WEDGE_CONFIG, WEDGE_ANGLE } from "../store/game-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const WHEEL_SIZE = SCREEN_WIDTH * 0.85;
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const CENTER = WHEEL_RADIUS;

interface SpinWheelProps {
  currentRotation: number;
  isSpinning: boolean;
  onSpinComplete: (rotation: number) => void;
  onSpinStart: () => void;
  disabled?: boolean;
}

// Convert polar to cartesian coordinates
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

// Create SVG arc path for a wedge
function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M", x, y,
    "L", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    "Z",
  ].join(" ");
}

const SPIN_DURATION = 4000;

export function SpinWheel({
  currentRotation,
  isSpinning,
  onSpinComplete,
  onSpinStart,
  disabled = false,
}: SpinWheelProps) {
  const rotation = useSharedValue(currentRotation);
  const targetRotationRef = useRef(currentRotation);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSpinning) {
      rotation.value = currentRotation;
    }
  }, [currentRotation, rotation, isSpinning]);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const handleSpin = () => {
    if (isSpinning || disabled) return;

    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }

    onSpinStart();

    // Calculate random spin (4-6 full rotations + random offset)
    const fullRotations = 4 + Math.random() * 2;
    const randomOffset = Math.random() * 360;
    const targetRotation = currentRotation + fullRotations * 360 + randomOffset;
    targetRotationRef.current = targetRotation;

    spinTimeoutRef.current = setTimeout(() => {
      onSpinComplete(targetRotationRef.current);
    }, SPIN_DURATION + 100);

    const handleAnimationComplete = (finalRotation: number) => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = null;
      }
      onSpinComplete(finalRotation);
    };

    rotation.value = withTiming(
      targetRotation,
      {
        duration: SPIN_DURATION,
        easing: Easing.bezier(0.15, 0.85, 0.25, 1),
      },
      (finished) => {
        if (finished) {
          runOnJS(handleAnimationComplete)(targetRotation);
        }
      }
    );
  };

  const renderWedges = () => {
    return WEDGE_CONFIG.map((wedge, index) => {
      const startAngle = index * WEDGE_ANGLE;
      const endAngle = startAngle + WEDGE_ANGLE;
      const path = describeArc(CENTER, CENTER, WHEEL_RADIUS - 8, startAngle, endAngle);

      return (
        <G key={wedge.id}>
          <Path
            d={path}
            fill={wedge.color}
            stroke="#1a1a2e"
            strokeWidth={2}
          />
        </G>
      );
    });
  };

  // Render labels separately for better positioning
  const renderLabels = () => {
    return WEDGE_CONFIG.map((wedge, index) => {
      const startAngle = index * WEDGE_ANGLE;
      const midAngle = startAngle + WEDGE_ANGLE / 2;
      const labelRadius = WHEEL_RADIUS * 0.65;
      const labelPos = polarToCartesian(CENTER, CENTER, labelRadius, midAngle);
      
      // Calculate rotation for the label to be readable
      const labelRotation = midAngle + 90;

      return (
        <G
          key={`label-${wedge.id}`}
          transform={`rotate(${labelRotation}, ${labelPos.x}, ${labelPos.y})`}
        >
          {wedge.type === "coin" ? (
            <G>
              {/* Coin circle */}
              <Circle
                cx={labelPos.x}
                cy={labelPos.y}
                r={16}
                fill="#FFD700"
                stroke="#FFA000"
                strokeWidth={2}
              />
              {/* Coin value text - positioned at center of coin */}
              <G transform={`rotate(${-labelRotation}, ${labelPos.x}, ${labelPos.y})`}>
                <Circle cx={labelPos.x} cy={labelPos.y} r={16} fill="#FFD700" />
                <Circle cx={labelPos.x} cy={labelPos.y} r={12} fill="#FFEB3B" />
              </G>
            </G>
          ) : (
            <G transform={`rotate(${-labelRotation}, ${labelPos.x}, ${labelPos.y})`}>
              {/* Question mark icon for trivia */}
              <Circle
                cx={labelPos.x}
                cy={labelPos.y}
                r={16}
                fill="#FFFFFF"
                stroke="#7B1FA2"
                strokeWidth={2}
              />
            </G>
          )}
        </G>
      );
    });
  };

  return (
    <View className="items-center justify-center">
      {/* Outer glow effect */}
      <View
        style={{
          position: "absolute",
          width: WHEEL_SIZE + 20,
          height: WHEEL_SIZE + 20,
          borderRadius: (WHEEL_SIZE + 20) / 2,
          backgroundColor: "rgba(155, 89, 182, 0.15)",
        }}
      />

      {/* Pointer indicator at the top */}
      <View
        className="absolute z-20"
        style={{
          top: -20,
        }}
      >
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 18,
            borderRightWidth: 18,
            borderTopWidth: 32,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: "#FFD700",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 3,
            elevation: 5,
          }}
        />
      </View>

      {/* Spinning wheel */}
      <Animated.View style={[animatedStyle]}>
        <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
          <Defs>
            <LinearGradient id="outerRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFD700" />
              <Stop offset="50%" stopColor="#FFA000" />
              <Stop offset="100%" stopColor="#FFD700" />
            </LinearGradient>
          </Defs>
          
          {/* Outer decorative ring */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={WHEEL_RADIUS - 2}
            fill="none"
            stroke="url(#outerRing)"
            strokeWidth={12}
          />
          
          {/* Inner shadow ring */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={WHEEL_RADIUS - 14}
            fill="none"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth={2}
          />
          
          {renderWedges()}
          {renderLabels()}
          
          {/* Center hub shadow */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={WHEEL_SIZE * 0.16}
            fill="rgba(0,0,0,0.2)"
          />
        </Svg>
      </Animated.View>

      {/* Center spin button */}
      <Pressable
        onPress={handleSpin}
        disabled={isSpinning || disabled}
        style={({ pressed }) => ({
          position: "absolute",
          width: WHEEL_SIZE * 0.28,
          height: WHEEL_SIZE * 0.28,
          borderRadius: (WHEEL_SIZE * 0.28) / 2,
          backgroundColor: isSpinning ? "#5D4E8C" : pressed ? "#7B1FA2" : "#9B59B6",
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 10,
          borderWidth: 4,
          borderColor: "#FFD700",
        })}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 20,
            fontWeight: "800",
            letterSpacing: 2,
            textShadowColor: "rgba(0,0,0,0.3)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          SPIN
        </Text>
      </Pressable>
    </View>
  );
}
