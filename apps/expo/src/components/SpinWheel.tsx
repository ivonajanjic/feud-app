import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { View, Image, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { NUM_WEDGES, WEDGE_ANGLE, WEDGE_CONFIG } from "../store/game-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const WHEEL_SIZE = SCREEN_WIDTH * 0.85;

// Weighted probability of landing on different wedge types (from routing.md)
// These weights override the physical wedge count distribution
const COIN_PROBABILITY = 0.60;    // 60% for coins
const DESTROY_PROBABILITY = 0.15; // 15% for destroy
const SURVEY_PROBABILITY = 0.15;  // 15% for survey says
const STEAL_PROBABILITY = 0.10;   // 10% for survey steal

interface SpinWheelProps {
  currentRotation: number;
  isSpinning: boolean;
  onSpinComplete: (rotation: number) => void;
  onSpinStart: () => void;
  disabled?: boolean;
}

export interface SpinWheelRef {
  spin: () => void;
}

const SPIN_DURATION = 4000;

export const SpinWheel = forwardRef<SpinWheelRef, SpinWheelProps>(
  function SpinWheel(
    {
      currentRotation,
      isSpinning,
      onSpinComplete,
      onSpinStart,
      disabled = false,
    },
    ref
  ) {
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

    const spin = () => {
      if (isSpinning || disabled) return;

      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }

      onSpinStart();

      // Calculate random spin that lands on a wedge center
      // 4-6 full rotations
      const fullRotations = 4 + Math.random() * 2;

      // Use weighted probability to select wedge type
      // 60% coin, 15% destroy, 15% survey, 10% steal
      const random = Math.random();
      let selectedType: "steal" | "survey" | "coin" | "destroy";
      if (random < COIN_PROBABILITY) {
        selectedType = "coin";
      } else if (random < COIN_PROBABILITY + DESTROY_PROBABILITY) {
        selectedType = "destroy";
      } else if (random < COIN_PROBABILITY + DESTROY_PROBABILITY + SURVEY_PROBABILITY) {
        selectedType = "survey";
      } else {
        selectedType = "steal";
      }
      
      // Get all wedge indices for the selected type
      const stealWedges = WEDGE_CONFIG.filter(w => w.type === "steal").map(w => w.id);
      const surveyWedges = WEDGE_CONFIG.filter(w => w.type === "survey").map(w => w.id);
      const coinWedges = WEDGE_CONFIG.filter(w => w.type === "coin").map(w => w.id);
      const destroyWedges = WEDGE_CONFIG.filter(w => w.type === "destroy").map(w => w.id);
      
      // Pick a random wedge from the selected type
      let eligibleWedges: number[];
      if (selectedType === "steal") {
        eligibleWedges = stealWedges;
      } else if (selectedType === "survey") {
        eligibleWedges = surveyWedges;
      } else if (selectedType === "destroy") {
        eligibleWedges = destroyWedges;
      } else {
        eligibleWedges = coinWedges;
      }
      const targetWedgeIndex = eligibleWedges[Math.floor(Math.random() * eligibleWedges.length)]!;

      // Calculate the rotation to land on that wedge's center
      // Wedges are numbered CLOCKWISE from top (0, 1, 2, ... going clockwise)
      // When wheel rotates clockwise, wedge indices at pointer go DOWN (15, 14, 13...)
      // To land on wedge N, rotate by ((NUM_WEDGES - N) % NUM_WEDGES) * WEDGE_ANGLE
      const wedgeCenterOffset = ((NUM_WEDGES - targetWedgeIndex) % NUM_WEDGES) * WEDGE_ANGLE;

      const targetRotation =
        currentRotation + fullRotations * 360 + wedgeCenterOffset;
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

    // Expose spin function via ref
    useImperativeHandle(
      ref,
      () => ({
        spin,
      }),
      [isSpinning, disabled, currentRotation, onSpinStart, onSpinComplete]
    );

    return (
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        {/* Spinning wheel image */}
        <Animated.View style={[animatedStyle]}>
          <Image
            source={require("../../assets/spin-wheel.png")}
            style={{
              width: WHEEL_SIZE,
              height: WHEEL_SIZE,
            }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Pointer indicator at the top */}
        <View
          style={{
            position: "absolute",
            top: -12,
            zIndex: 10,
          }}
        >
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: 16,
              borderRightWidth: 16,
              borderTopWidth: 28,
              borderLeftColor: "transparent",
              borderRightColor: "transparent",
              borderTopColor: "#FFD700",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.4,
              shadowRadius: 4,
              elevation: 8,
            }}
          />
        </View>
      </View>
    );
  }
);
