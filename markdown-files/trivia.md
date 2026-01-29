# Feature: Trivia Game Mode

## Feature Overview
A rapid-fire trivia round consisting of 5 questions that rewards players based on their accuracy within a strict time limit.

## Purpose of the Feature
To introduce a skill-based "risk/reward" mechanic that complements the luck-based spin wheel.

## User Stories
* As a player, I want to see 5 questions in a row so I can build a high score.
* As a player, I want to be penalized for wrong answers to keep the game challenging.
* As a player, I want a timer to track my remaining time for the entire round.
* As a system, I want to ensure the player's balance never drops below zero, even if they fail the trivia round.

## Functional Design Requirements
* **Round Structure:** 5 consecutive multiple-choice questions per session.
* **Selection Logic:** Questions are drawn randomly from the `trivia_pool.json`.
* **The Timer:** * Total Time: 60 seconds for the entire 5-question block.
    * If the timer hits 0: The round ends immediately, and current points are converted to coins.
* **Scoring Logic:**
    * Correct Answer: +10 Points.
    * Incorrect Answer: -5 Points.
* **Payout Logic (Zero Reward Floor):**
    * Final Coins Earned = Max(0, Total_Round_Score).
    * If a player exits/closes the app during the round, they forfeit all potential winnings for that round.

## Non-Functional Design Requirements
* **Usability:** Large touch targets for the multiple-choice buttons (Android-friendly).
* **Feedback:** Instant visual feedback (Green for correct, Red for incorrect) before moving to the next question.

## Technical Information
* **JSON Schema:**
```json
[
  {
    "question": "Sample Question Text?",
    "options": ["A", "B", "C", "D"],
    "correct_index": 0
  }
]