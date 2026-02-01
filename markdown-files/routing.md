# Feature: Spin Wheel & Multi-Mode Routing System

## Feature Overview
A 16-wedge weighted spin wheel acting as the primary navigation hub. It routes players to instant rewards or specialized mini-game modes based on landing results, using a weighted probability system to manage the game economy.

## Purpose of the Feature
To serve as the "Engine of Play," gamifying the transition between the home screen and various gameplay modules while ensuring the economy remains balanced through controlled probability.

## User Stories
* **As a player**, I want to spin a wheel with 16 distinct options so that every spin feels like a high-stakes event.
* **As a system**, I need to calculate results based on specific weights rather than just wedge count to maintain the intended game balance.
* **As a system**, I need to route the player to the correct game mode (.md file) immediately after the wheel stops.

## Functional Design Requirements
* **Wedge Configuration (16 Total):**
    * **3 Wedges: Destroy Mode** (Labeled "DESTROY").
    * **3 Wedges: Survey Steal Mode** (Iconified with "Diamond").
    * **5 Wedges: Survey Says Mode** (Iconified with "?").
    * **5 Wedges: Instant Coin Rewards** (Iconified with "$").
* **Routing Logic:**
    * **If "Destroy":** Launch `looting.md` logic.
    * **If "Survey Says":** Route to `survey_says.md`.
    * **If "Survey Steal":** Route to `survey_steal.md`.
    * **If "Coins":** Trigger instant balance update ($50 - $200 range).

## Balancing & Probability
The system must ignore a simple 1/16 probability per wedge and instead use the following weights for the spin outcome:

| Outcome | Wedge Count | Target Probability |
| :--- | :--- | :--- |
| **Instant Coins ($)** | 5 | $60\%$ |
| **Destroy** | 3 | $15\%$ |
| **Survey Says (?)** | 5 | $15\%$ |
| **Survey Steal (Diamond)** | 3 | $10\%$ |

## Technical Information
* **Visual Persistence:** The wheel must store its `final_angle` and start subsequent spins from that position to maintain physical realism.
* **Weighted Randomization:** The engine should pick the *Outcome* first based on the percentages above, then randomly select one of the corresponding physical wedges to stop on.
* **State Management:**
    * `current_rotation_angle`: Integer
    * `active_mode`: [IDLE, DESTROY, SURVEY_SAYS, SURVEY_STEAL, COIN_REWARD]