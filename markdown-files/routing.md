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
    * **5 Wedges: Instant Coins ($)**.
    * **4 Wedges: Survey Says (?)**.
    * **3 Wedges: Destroy Mode (DESTROY)**.
    * **2 Wedges: Match and Win (Triangle)**.
    * **2 Wedges: Survey Steal (Diamond)**.

* **Routing Logic:**
    * **If "Destroy":** Launch `looting.md`.
    * **If "Survey Says":** Launch `survey_says.md`.
    * **If "Match and Win":** Launch `match_and_win.md`.
    * **If "Survey Steal":** Launch `survey_steal.md`.
    * **If "Coins":** Trigger instant balance update.

## Balancing & Probability
The RNG engine must select the **Outcome** first based on these target weights, then animate the wheel to a corresponding physical wedge:

| Outcome | Probability |
| :--- | :--- |
| **Instant Coins** | 60% |
| **Destroy** | 15% |
| **Survey Says** | 10% |
| **Match and Win** | 10% |
| **Survey Steal** | 5% |

## Technical Information
* **Asset Source:** `image_1fdae1.jpg`
* **Weighted Randomization:** Result is determined by percentage weights, not 1/16 math.
* **Visual Persistence:** Wheel must store `final_angle` and start subsequent spins from that position.