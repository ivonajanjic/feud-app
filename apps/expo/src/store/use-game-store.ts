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
  startSurveyRound,
  recordSurveyAnswer,
  finishSurveyRound,
  startStealRound,
  recordStealAnswer,
  finishStealRound,
  startDestroyRound,
  finishDestroyRound,
  startMatchRound,
  recordMatchFlip,
  finishMatchRound,
  resetGameState,
  type WedgeConfig,
  type MatchSymbol,
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
    startSurveyRound: useCallback(() => startSurveyRound(), []),
    recordSurveyAnswer: useCallback(
      (isCorrect: boolean, points: number, rank: number, isFirstTryBonusEligible: boolean) =>
        recordSurveyAnswer(isCorrect, points, rank, isFirstTryBonusEligible),
      []
    ),
    finishSurveyRound: useCallback(() => finishSurveyRound(), []),
    startStealRound: useCallback(
      (preFilledIndices: number[], preFilledPoints: number) =>
        startStealRound(preFilledIndices, preFilledPoints),
      []
    ),
    recordStealAnswer: useCallback(
      (isCorrect: boolean, points: number, answerIndex: number) =>
        recordStealAnswer(isCorrect, points, answerIndex),
      []
    ),
    finishStealRound: useCallback(() => finishStealRound(), []),
    startDestroyRound: useCallback(() => startDestroyRound(), []),
    finishDestroyRound: useCallback((coins: number) => finishDestroyRound(coins), []),
    startMatchRound: useCallback(() => startMatchRound(), []),
    recordMatchFlip: useCallback(
      (cardIndex: number, symbol: MatchSymbol) => recordMatchFlip(cardIndex, symbol),
      []
    ),
    finishMatchRound: useCallback(() => finishMatchRound(), []),
    resetGameState: useCallback(() => resetGameState(), []),
  };

  return { state, ...actions };
}
