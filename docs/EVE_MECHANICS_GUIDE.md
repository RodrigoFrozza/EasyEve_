# EVE Online: Technical Mechanics Guide

Detailed breakdown of game activities to support the business logic of **EasyEve_**.

---

## 1. Combat Activity: Ratting & Escalations

### Combat Anomalies (The "Bread and Butter")
*   **Structure:** Found via onboard scanner. No probes needed.
*   **Wave Mechanics:** NPCs spawn in groups. Killing a "Trigger" NPC (often the most expensive ship) starts the next wave.
*   **Escalations:** There is a ~5% chance that killing the "Commander" NPC or clearing the final wave will trigger a pop-up: "Something found in the wreckage...". This creates an entry in the "Agency" -> "Exploration" tab.
*   **Tracking Strategy:** EasyEve_ should monitor for "Bounty Payout" spikes that suggest a commander was killed.

### DED Complexes (The "Big Hits")
*   **Scaling:** Rated 1/10 to 10/10.
*   **Restrictions:** 
    *   1/10 - 2/10: Frigates only.
    *   3/10 - 4/10: Cruisers only.
    *   10/10: Battleships/Marauders.
*   **Rewards:** Focus on "Overseer's Personal Effects" (guaranteed ISK) and "Deadspace Modules" (highly variable market value).

---

## 2. Endgame Combat: CRAB Beacons

*   **Requirements:** A Capital ship (Carrier, Dread, Super) and a "CRAB Beacon" deployable.
*   **The 10-Minute Window:** Once linked, the ship is localized for 10 minutes. 
*   **Waves:** Rogue Drones spawn. They do not have bounties but drop "Analysis Data" and "Mutaplasmids".
*   **Logic for Tracker:** We must track the "Analysis Data" as the primary income source, which requires a loot-parsing approach rather than just wallet-journal monitoring.

---

## 3. Exploration: Relic, Data & Ghost Sites

### Hacking Nuances
*   **Coherence & Strength:** Based on the player's modules and skills.
*   **Ghost Sites:** 
    *   Hidden timer (usually ~60-90 seconds).
    *   Failure = Hull Damage + Site Despawns.
    *   Loot: "High-grade" blueprints.

### The Math of Exploration
Exploration profit is irregular. It’s "Zero or Hero". 
*   **EasyEve_ Implementation:** Instead of ISK/hr (which is misleading for exploration), we should show **"Average Site Value"** over the last 30 days.

---

## 4. Mining: Yield & Efficiency

### Volume vs. Value
Mining is about **throughput**.
*   **Formula:** `(m3 extracted per hour / Ore volume) * Market Price`.
*   **Compression:** Compressed ore occupies 1/100th of the space, allowing for much longer sessions.
*   **EasyEve_ Implementation:** Allow users to toggle "Compressed" for loot valuation to ensure accurate market calculations.
