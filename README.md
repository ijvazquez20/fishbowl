# Fishbowl

Goldfish your Commander decks against 1 to 3 simulated opponents and track your kill turns.
Live at https://ijvazquez20.github.io/fishbowl/

## Develop

```
npm install
npm run dev         # real Firebase (sign in with Google)
npm run dev:local   # sandbox: fake user, data kept in this browser only
npm test            # goldfish engine tests
npm run build       # type-check and build to dist/
```

Pushing to `main` builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`).
In the repo settings, Pages → Source must be **GitHub Actions**.

## Firebase

Fishbowl shares the `pf2e-sheets-cc4fc` project with the PF2e sheets (Google sign-in and
Realtime Database). Everything it stores lives under `fishbowl/users/{uid}`:

- `decks/{id}`: name, commander, colors
- `games/{id}`: one summary per saved game (setup, result, totals)
- `rounds/{gameId}`: the turn-by-turn record, loaded only by Game detail
- `actions/{id}`, `profiles/{id}`: your action catalog and opponent profiles (built-ins are stored only once edited)

Add the `fishbowl` block from `firebase/fishbowl.rules.json` next to the existing rules in the
Firebase console (Realtime Database → Rules). It only lets ij.vazquez20@gmail.com read or write.
When the database refuses an account, the app signs it straight back out and shows "Fishbowl is
private". To try that in sandbox mode, set `localStorage['fishbowl.localdeny'] = '1'` and reload. Realtime Database rules cascade, so a `.read` or
`.write` granted at the root would override these per-user rules; keep any such grant scoped to
the PF2e data.

## Code map

- `src/engine/`: goldfish turn logic (`game.ts`), action catalog and profiles (`catalog.ts`),
  saved-game conversion (`record.ts`) and stats (`stats.ts`). Plain TypeScript, no UI.
- `src/data/`: Firebase and sandbox backends, the app store and all writes.
- `src/screens/`: one file per screen, each with desktop (1024px and up) and phone layouts.
