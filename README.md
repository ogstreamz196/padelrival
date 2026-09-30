# Padel Rivals Arena

Build a mobile-first PWA called Padel Rival — a social and competitive gamification platform for padel players.

Core concept & features:
1. Mobile-First PWA Foundation & Design:
   - Sporty, competitive, modern gaming-inspired dark theme with vibrant accents (padel ball neon yellow/green, court blues), large bold typography, smooth card animations, and mobile app-like bottom navigation.
   - PWA configured for standalone mobile installation.

2. Authentication & Player Profile:
   - Quick signup / login (email/password, social login) with profile setup (display name, username, avatar, preferred court side: left/right/both).
   - Gaming-style player card showing:
     - Rating (starts at 1000 base, competitive Elo)
     - XP and Level progress bar
     - Win/loss record, win percentage
     - Current streak (fire icon for win streaks) and best streak
     - Match history feed
     - Rivalry summary and achievements

3. 2v2 Match Recording (Quick & Frictionless):
   - Select partner and two opponents (search registered users or add quick guest-player names so matches can be recorded even if friends aren't on the app yet).
   - Enter set scores (e.g., 6-4, 3-6, 7-6) and venue/match type.
   - Dynamic 2v2 Elo calculation engine: team average comparison calculating rating changes for all registered players, plus XP rewards (+50 XP for match, +50 XP bonus for win, streak bonuses).

4. Post-Match Celebration Screen:
   - High-energy animated results screen displaying match outcome (Victory/Defeat), rating delta (+/- points with counter animation), XP gained, streak updates, and unlocked badges/rivalry updates.

5. Rivalries (H2H):
   - Automatic head-to-head detection whenever players face each other repeatedly.
   - Rivalry card showing H2H wins, sets, last winner, and a "Revenge Match" banner if the trailing player is up for a rematch.

6. Leaderboards:
   - Global and weekly ranking boards filterable by Elo rating and XP/activity.

7. Progression & Milestones:
   - Initial collectible achievements (e.g., First Win, 3-Match Streak, 5-Match Streak, Giant Killer, Rivalry Victor).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://padelrival.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/81131ad7-de3b-424b-918b-33d5db704588).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
