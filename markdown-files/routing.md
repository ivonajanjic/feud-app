# Feature: Spin Wheel & Routing System

## Feature Overview
A 12-wedge weighted spin wheel located on the Home Screen that serves as the primary interaction point for players to earn coins or enter the Trivia Game Mode.

## Purpose of the Feature
To provide a "high-beat" casino-style entry point that gamifies session starts and gates the trivia content behind a probability-based mechanic.

## User Stories
* As a player, I want to spin a wheel for free so I can earn rewards.
* As a player, I want the wheel to stay where it landed so the experience feels physical and persistent.
* As a system, I need to determine if the player receives an immediate coin reward or is routed to the Trivia Mode based on weighted probability.

## Functional Design Requirements
* **Wedge Configuration:** Total of 12 wedges.
    * 2 Wedges: Trivia Game Mode (Redirection).
    * 10 Wedges: Instant Coin Rewards (Values: 10, 20, 50, 100).
* **Probability Weighting:** * Trivia Mode: ~16.6% (2/12 chance).
    * Coin Rewards: ~83.3% (10/12 chance).
* **Visual Persistence:** The wheel must not reset to 0 degrees on load. It must store its final rotation angle in the in-memory state and start the next spin from that position.
* **Routing Logic:** * If result = Coin Wedge: Update in-memory coin balance and play "Win" animation.
    * If result = Trivia Wedge: Trigger transition to the Trivia Game Mode screen.

## Technical Information
* **State:** `current_rotation_angle` (integer), `player_balance` (integer).
* **Animation:** Use a standard easing function (ease-out) for the spin duration (3-4 seconds).