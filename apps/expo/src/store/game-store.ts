/**
 * Game State Store
 * In-memory state manager for Family Feud Go
 */

// Wedge configuration for the 16-wedge spin wheel
// Alternating pattern: white wedge with coins, colored wedge with trivia
// 8 Coin wedges + 8 Trivia wedges (weighted probability: 5% trivia, 95% coin)
export interface WedgeConfig {
  id: number;
  type: "trivia" | "coin";
  value: number; // coin value (0 for trivia)
  label: string;
  color: string;
  textColor: string;
}

// 16 wedges - alternating white (coin) and colored (trivia)
// Starting from top (12 o'clock), going clockwise
export const WEDGE_CONFIG: WedgeConfig[] = [
  { id: 0, type: "coin", value: 25, label: "$", color: "#FFFFFF", textColor: "#000000" },
  { id: 1, type: "trivia", value: 0, label: "?", color: "#5DADE2", textColor: "#FFFFFF" },
  { id: 2, type: "coin", value: 50, label: "$", color: "#FFFFFF", textColor: "#000000" },
  { id: 3, type: "trivia", value: 0, label: "?", color: "#48C9B0", textColor: "#FFFFFF" },
  { id: 4, type: "coin", value: 10, label: "$", color: "#FFFFFF", textColor: "#000000" },
  { id: 5, type: "trivia", value: 0, label: "?", color: "#5B7FD9", textColor: "#FFFFFF" },
  { id: 6, type: "coin", value: 100, label: "$", color: "#FFFFFF", textColor: "#000000" },
  { id: 7, type: "trivia", value: 0, label: "?", color: "#7B68EE", textColor: "#FFFFFF" },
  { id: 8, type: "coin", value: 25, label: "$", color: "#FFFFFF", textColor: "#000000" },
  { id: 9, type: "trivia", value: 0, label: "?", color: "#9B59B6", textColor: "#FFFFFF" },
  { id: 10, type: "coin", value: 50, label: "$", color: "#FFFFFF", textColor: "#000000" },
  { id: 11, type: "trivia", value: 0, label: "?", color: "#A569BD", textColor: "#FFFFFF" },
  { id: 12, type: "coin", value: 10, label: "$", color: "#FFFFFF", textColor: "#000000" },
  { id: 13, type: "trivia", value: 0, label: "?", color: "#8E7CC3", textColor: "#FFFFFF" },
  { id: 14, type: "coin", value: 100, label: "$", color: "#FFFFFF", textColor: "#000000" },
  { id: 15, type: "trivia", value: 0, label: "?", color: "#5DADE2", textColor: "#FFFFFF" },
];

// Number of wedges
export const NUM_WEDGES = 16;

// Angle per wedge (360 / 16 = 22.5 degrees)
export const WEDGE_ANGLE = 360 / NUM_WEDGES;

// Game state interface
export interface GameState {
  playerBalance: number;
  currentWheelRotation: number;
  isSpinning: boolean;
  lastWedgeResult: WedgeConfig | null;
  triviaScore: number;
  triviaQuestionsAnswered: number;
}

// Initial state
const initialState: GameState = {
  playerBalance: 0,
  currentWheelRotation: 0,
  isSpinning: false,
  lastWedgeResult: null,
  triviaScore: 0,
  triviaQuestionsAnswered: 0,
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

// Trivia state management
export function startTriviaRound(): void {
  gameState = {
    ...gameState,
    triviaScore: 0,
    triviaQuestionsAnswered: 0,
  };
  notifyListeners();
}

export function recordTriviaAnswer(isCorrect: boolean): void {
  const pointChange = isCorrect ? 10 : -5;
  gameState = {
    ...gameState,
    triviaScore: gameState.triviaScore + pointChange,
    triviaQuestionsAnswered: gameState.triviaQuestionsAnswered + 1,
  };
  notifyListeners();
}

export function finishTriviaRound(): number {
  // Apply Zero Reward Floor: Final Coins = Max(0, total_score)
  const coinsEarned = Math.max(0, gameState.triviaScore);
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
