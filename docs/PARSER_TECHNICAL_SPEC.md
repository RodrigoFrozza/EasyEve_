# EVE Online: Parser & Appraisal Technical Specification

This document outlines how to implement a high-performance clipboard parser and item valuator, similar to Janice or Evepraisal, within the **EasyEve_** ecosystem.

---

## 1. Input Formats & Regex Patterns

The EVE client exports text in several standard ways. Our parser must iterate through these patterns until it finds a match.

### A. Inventory List View (The most common)
*   **Format:** `[Item Name] \t [Quantity] \t [Group] \t ...`
*   **Pattern:** `/^(.+?)\t([\d,]+)/gm`
*   **Logic:** Capture the first column as Name and the second as Quantity (strip commas).

### B. Multibuy / Simple List
*   **Format:** `[Item Name] [Quantity]` or `[Quantity] [Item Name]`
*   **Pattern 1:** `/^(.+?)\s+([\d,]+)$/gm` (Name then Quantity)
*   **Pattern 2:** `/^([\d,]+)\s+(.+?)$/gm` (Quantity then Name)
*   **Heuristic:** Match against the `EveType` table to confirm which part is the item name.

### C. EFT Fitting Format
*   **Format:**
    ```text
    [Ship Name, Fitting Name]
    Module Name
    Item Name xQuantity
    ```
*   **Pattern (Header):** `/^\[(.+),\s*(.+)\]$/`
*   **Pattern (Items):** `/^(.+?)\s+x(\d+)$/gm`

---

## 2. Valuation Engine Logic

Once items are identified (Name + Quantity), the system follows this flow:

1.  **Resolution:** Map each Name to a `typeID` using our `EveType` database table.
2.  **Price Fetching:** 
    *   **Priority 1 (Fixed):** Check if the item is "Blue Loot" or an "Overseer Effect". These have fixed NPC buy prices (e.g., 8th Tier Overseer = 1.2M ISK).
    *   **Priority 2 (Market):** Fetch the **Jita 5% Sell Price** (the price you can realistically buy it for) or **Jita 5% Buy Price** (the price you can instantly sell it for).
3.  **Calculation:** 
    *   `Subtotal = Quantity * Price`
    *   `Total = Sum(Subtotals)`

---

## 3. Integration into EasyEve_

The implementation should consist of:

1.  **API Route:** `POST /api/utils/appraise`
    *   **Request:** `{ rawText: string, market: 'jita' | 'amarr', priceType: 'buy' | 'sell' }`
    *   **Response:** `{ items: Array<{ id: number, name: string, qty: number, price: number, total: number }>, totalValue: number }`

2.  **UI Component:** `LootParserField`
    *   A large text area that auto-triggers the API call on `onPaste` or `onBlur`.
    *   Displays a visual breakdown of the most valuable items (top 5).

---

## 4. Why Janice is the Standard (and how we can win)
Janice is an external site. By building this **directly into the Activity Tracker**, we remove the need for the player to ALT-TAB. 

**Pro-Feature:** When a player pastes loot into our parser during a Ratting or Exploration session, we can automatically add that value to the "Active Income" of the session, providing an even more accurate ISK/hr that includes Loot + Bounties + ESS.
