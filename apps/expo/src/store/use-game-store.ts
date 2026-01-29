/**
 * React hook for game state management
 */
import { useEffect, useState, useCallback } from "react";
import {
  type GameState,
  getGameState,
  subscribe,
  addCoins,
  setWheelRotation,
  setSpinning,
  setLastWedgeResult,
  startTriviaRound,
  recordTriviaAnswer,
  finishTriviaRound,
  resetGameState,
  type WedgeConfig,
} from "./game-store";

export function useGameStore() {
  const [state, setState] = useState<GameState>(getGameState);

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const actions = {
    addCoins: useCallback((amount: number) => addCoins(amount), []),
    setWheelRotation: useCallback(
      (rotation: number) => setWheelRotation(rotation),
      []
    ),
    setSpinning: useCallback(
      (isSpinning: boolean) => setSpinning(isSpinning),
      []
    ),
    setLastWedgeResult: useCallback(
      (wedge: WedgeConfig | null) => setLastWedgeResult(wedge),
      []
    ),
    startTriviaRound: useCallback(() => startTriviaRound(), []),
    recordTriviaAnswer: useCallback(
      (isCorrect: boolean) => recordTriviaAnswer(isCorrect),
      []
    ),
    finishTriviaRound: useCallback(() => finishTriviaRound(), []),
    resetGameState: useCallback(() => resetGameState(), []),
  };

  return { state, ...actions };
}
