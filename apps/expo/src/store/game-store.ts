/**
 * Game State Store
 * In-memory state manager for Family Feud Go
 */

// Wedge configuration for the 16-wedge spin wheel
// Alternating pattern: white wedge with coins, colored wedge with survey
// 8 Coin wedges + 8 Survey wedges (weighted probability: 5% survey, 95% coin)
export interface WedgeConfig {
  id: number;
  type: "survey" | "coin" | "steal";
  value: number; // coin value (0 for survey/steal)
  label: string;
  color: string;
  textColor: string;
}

// 16 wedges - matching the wheel asset layout
// Wedges numbered counter-clockwise from 12 o'clock
// Coins ($): 0, 1, 2, 4, 7, 9, 12, 15
// Diamonds (steal): 6, 10, 14
// Question marks (survey): 3, 5, 8, 11, 13
export const WEDGE_CONFIG: WedgeConfig[] = [
  { id: 0, type: "coin", value: 25, label: "$", color: "#FFFFFF", textColor: "#000000" },
  { id: 1, type: "coin", value: 50, label: "$", color: "#5DADE2", textColor: "#000000" },
  { id: 2, type: "coin", value: 10, label: "$", color: "#FFFFFF", textColor: "#000000" },
  { id: 3, type: "survey", value: 0, label: "?", color: "#8E7CC3", textColor: "#FFFFFF" },
  { id: 4, type: "coin", value: 100, label: "$", color: "#FFFFFF", textColor: "#000000" },
  { id: 5, type: "survey", value: 0, label: "?", color: "#A569BD", textColor: "#FFFFFF" },
  { id: 6, type: "steal", value: 0, label: "◆", color: "#FFFFFF", textColor: "#FFFFFF" },
  { id: 7, type: "coin", value: 25, label: "$", color: "#9B59B6", textColor: "#000000" },
  { id: 8, type: "survey", value: 0, label: "?", color: "#FFFFFF", textColor: "#FFFFFF" },
  { id: 9, type: "coin", value: 50, label: "$", color: "#7B68EE", textColor: "#000000" },
  { id: 10, type: "steal", value: 0, label: "◆", color: "#FFFFFF", textColor: "#FFFFFF" },
  { id: 11, type: "survey", value: 0, label: "?", color: "#5B7FD9", textColor: "#FFFFFF" },
  { id: 12, type: "coin", value: 10, label: "$", color: "#FFFFFF", textColor: "#000000" },
  { id: 13, type: "survey", value: 0, label: "?", color: "#48C9B0", textColor: "#FFFFFF" },
  { id: 14, type: "steal", value: 0, label: "◆", color: "#FFFFFF", textColor: "#FFFFFF" },
  { id: 15, type: "coin", value: 100, label: "$", color: "#5DADE2", textColor: "#000000" },
];

// Number of wedges
export const NUM_WEDGES = 16;

// Angle per wedge (360 / 16 = 22.5 degrees)
export const WEDGE_ANGLE = 360 / NUM_WEDGES;

// Survey Says constants
export const SURVEY_MAX_STRIKES = 3;
export const SURVEY_FIRST_TRY_BONUS = 50;
export const SURVEY_TIME_SECONDS = 60;

// Survey Steal constants
export const STEAL_TIME_SECONDS = 20;
export const STEAL_MULTIPLIER = 2;

// Game state interface
export interface GameState {
  playerBalance: number;
  currentWheelRotation: number;
  isSpinning: boolean;
  lastWedgeResult: WedgeConfig | null;
  // Survey Says state
  surveyStrikes: number;
  surveyRevealedRanks: number[]; // ranks (1-5) that have been revealed
  surveyTotalPoints: number;
  surveyFirstClickMade: boolean;
  surveyGotFirstTryBonus: boolean;
  // Survey Steal state
  stealRevealedIndices: number[]; // indices (0-4) that have been revealed
  stealTotalPoints: number;
  stealFailed: boolean;
}

// Initial state
const initialState: GameState = {
  playerBalance: 0,
  currentWheelRotation: 0,
  isSpinning: false,
  lastWedgeResult: null,
  surveyStrikes: 0,
  surveyRevealedRanks: [],
  surveyTotalPoints: 0,
  surveyFirstClickMade: false,
  surveyGotFirstTryBonus: false,
  stealRevealedIndices: [],
  stealTotalPoints: 0,
  stealFailed: false,
};

// In-memory state (singleton pattern)
let gameState: GameState = { ...initialState };

// Listeners for state changes
type Listener = (state: GameState) => void;
const listeners: Set<Listener> = new Set();

// Subscribe to state changes
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Notify all listeners
function notifyListeners() {
  listeners.forEach((listener) => listener(gameState));
}

// Get current state
export function getGameState(): GameState {
  return { ...gameState };
}

// Update player balance
export function addCoins(amount: number): void {
  gameState = {
    ...gameState,
    playerBalance: gameState.playerBalance + amount,
  };
  notifyListeners();
}

// Update wheel rotation (for persistence)
export function setWheelRotation(rotation: number): void {
  // Normalize rotation to 0-360
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  gameState = {
    ...gameState,
    currentWheelRotation: normalizedRotation,
  };
  notifyListeners();
}

// Set spinning state
export function setSpinning(isSpinning: boolean): void {
  gameState = {
    ...gameState,
    isSpinning,
  };
  notifyListeners();
}

// Set last wedge result
export function setLastWedgeResult(wedge: WedgeConfig | null): void {
  gameState = {
    ...gameState,
    lastWedgeResult: wedge,
  };
  notifyListeners();
}

// Calculate which wedge the wheel landed on based on rotation angle
// The wheel image has wedge 0 at the top center
export function getWedgeFromRotation(rotation: number): WedgeConfig {
  // Normalize rotation to 0-360
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  
  // The pointer is at the top (0 degrees), wheel rotates clockwise
  // When wheel rotates by X degrees clockwise, wedge at position (360-X) is at top
  // Adding half wedge angle to align with wedge center
  const effectiveAngle = (360 - normalizedRotation + WEDGE_ANGLE / 2) % 360;
  const wedgeIndex = Math.floor(effectiveAngle / WEDGE_ANGLE) % NUM_WEDGES;
  
  return WEDGE_CONFIG[wedgeIndex]!;
}

// Calculate the rotation needed to land on a specific wedge's center
export function getRotationForWedgeCenter(wedgeIndex: number, fullRotations: number): number {
  // To make wedge N appear at top, wheel needs to rotate by ((NUM_WEDGES - N) % NUM_WEDGES) * WEDGE_ANGLE
  const wedgeCenterOffset = ((NUM_WEDGES - wedgeIndex) % NUM_WEDGES) * WEDGE_ANGLE;
  return fullRotations * 360 + wedgeCenterOffset;
}

// Survey Says state management
export function startSurveyRound(): void {
  gameState = {
    ...gameState,
    surveyStrikes: 0,
    surveyRevealedRanks: [],
    surveyTotalPoints: 0,
    surveyFirstClickMade: false,
    surveyGotFirstTryBonus: false,
  };
  notifyListeners();
}

export function recordSurveyAnswer(
  isCorrect: boolean,
  points: number,
  rank: number,
  isFirstTryBonusEligible: boolean
): { gotBonus: boolean } {
  let gotBonus = false;

  if (isCorrect) {
    // Add points and reveal the rank
    const newRevealedRanks = [...gameState.surveyRevealedRanks, rank];
    let newTotalPoints = gameState.surveyTotalPoints + points;
    let newGotFirstTryBonus = gameState.surveyGotFirstTryBonus;

    // Check for first try bonus (first click is #1 ranked answer)
    if (isFirstTryBonusEligible && !gameState.surveyFirstClickMade && rank === 1) {
      newTotalPoints += SURVEY_FIRST_TRY_BONUS;
      newGotFirstTryBonus = true;
      gotBonus = true;
    }

    gameState = {
      ...gameState,
      surveyRevealedRanks: newRevealedRanks,
      surveyTotalPoints: newTotalPoints,
      surveyFirstClickMade: true,
      surveyGotFirstTryBonus: newGotFirstTryBonus,
    };
  } else {
    // Incorrect answer - add a strike
    gameState = {
      ...gameState,
      surveyStrikes: gameState.surveyStrikes + 1,
      surveyFirstClickMade: true,
    };
  }

  notifyListeners();
  return { gotBonus };
}

export function finishSurveyRound(): number {
  // Apply Zero Reward Floor: Final Coins = Max(0, total_points)
  const coinsEarned = Math.max(0, gameState.surveyTotalPoints);
  if (coinsEarned > 0) {
    addCoins(coinsEarned);
  }
  return coinsEarned;
}

// Survey Steal state management
export function startStealRound(preFilledIndices: number[], preFilledPoints: number): void {
  gameState = {
    ...gameState,
    stealRevealedIndices: [...preFilledIndices],
    stealTotalPoints: preFilledPoints,
    stealFailed: false,
  };
  notifyListeners();
}

export function recordStealAnswer(
  isCorrect: boolean,
  points: number,
  answerIndex: number
): void {
  if (isCorrect) {
    // Add points and reveal the index
    const newRevealedIndices = [...gameState.stealRevealedIndices, answerIndex];
    const newTotalPoints = gameState.stealTotalPoints + points;

    gameState = {
      ...gameState,
      stealRevealedIndices: newRevealedIndices,
      stealTotalPoints: newTotalPoints,
    };
  } else {
    // Incorrect answer - mark as failed
    gameState = {
      ...gameState,
      stealFailed: true,
    };
  }

  notifyListeners();
}

export function finishStealRound(): number {
  // If failed, return 0 points
  if (gameState.stealFailed) {
    return 0;
  }

  // Apply 2x multiplier for successful steal
  const coinsEarned = gameState.stealTotalPoints * STEAL_MULTIPLIER;
  if (coinsEarned > 0) {
    addCoins(coinsEarned);
  }
  return coinsEarned;
}

// Reset game state
export function resetGameState(): void {
  gameState = { ...initialState };
  notifyListeners();
}
