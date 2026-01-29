/**
 * Game State Store
 * In-memory state manager for Family Feud Go
 */

// Wedge configuration for the 12-wedge spin wheel
// 4 Trivia wedges (33%) + 8 Coin wedges (67%)
// Vibrant casino-style colors
export interface WedgeConfig {
  id: number;
  type: "trivia" | "coin";
  value: number; // coin value (0 for trivia)
  label: string;
  color: string;
  textColor: string;
}

export const WEDGE_CONFIG: WedgeConfig[] = [
  { id: 0, type: "coin", value: 10, label: "10", color: "#FF6B6B", textColor: "#FFFFFF" },
  { id: 1, type: "coin", value: 25, label: "25", color: "#4ECDC4", textColor: "#FFFFFF" },
  { id: 2, type: "trivia", value: 0, label: "TRIVIA", color: "#9B59B6", textColor: "#FFFFFF" },
  { id: 3, type: "coin", value: 50, label: "50", color: "#F39C12", textColor: "#FFFFFF" },
  { id: 4, type: "coin", value: 10, label: "10", color: "#3498DB", textColor: "#FFFFFF" },
  { id: 5, type: "trivia", value: 0, label: "TRIVIA", color: "#9B59B6", textColor: "#FFFFFF" },
  { id: 6, type: "coin", value: 100, label: "100", color: "#E74C3C", textColor: "#FFFFFF" },
  { id: 7, type: "coin", value: 25, label: "25", color: "#2ECC71", textColor: "#FFFFFF" },
  { id: 8, type: "trivia", value: 0, label: "TRIVIA", color: "#9B59B6", textColor: "#FFFFFF" },
  { id: 9, type: "coin", value: 50, label: "50", color: "#1ABC9C", textColor: "#FFFFFF" },
  { id: 10, type: "coin", value: 10, label: "10", color: "#E67E22", textColor: "#FFFFFF" },
  { id: 11, type: "trivia", value: 0, label: "TRIVIA", color: "#9B59B6", textColor: "#FFFFFF" },
];

// Angle per wedge (360 / 12 = 30 degrees)
export const WEDGE_ANGLE = 30;

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
export function getWedgeFromRotation(rotation: number): WedgeConfig {
  // Normalize rotation to 0-360
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  // The pointer is at the top (0 degrees), wheel rotates clockwise
  // Calculate which wedge is at the top
  const wedgeIndex = Math.floor((360 - normalizedRotation) / WEDGE_ANGLE) % 12;
  return WEDGE_CONFIG[wedgeIndex]!;
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
