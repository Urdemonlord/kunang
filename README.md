# kunang

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Urdemonlord/kunang/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Urdemonlord/kunang/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Kunang - Penjaga Lentera is a firefly lantern-keeper arcade game. Guide fireflies home into your lantern through five nights, dodge the bats that hunt them, and pulse your lantern's light to scare them away. Plain HTML5 canvas and procedural WebAudio, no network, no assets.

## What is in the game

- **Three bat kinds**: Swift (small, fast, dives straight), Hunter (stalks the nearest firefly), Tank (big, slow, takes 2 pulses to flee). Night 1 is Hunter-only; the mix widens every night.
- **Kunang Emas**: a rare golden firefly from night 2 on (about 1 in 12), faster and worth 5x score. Bats prefer to hunt it.
- **Upgrades**: after each cleared night, pick 1 of 3 cards (keys 1/2/3 or click): wider light cone, faster pulse recharge, +1 pulse charge, +1 life, stronger firefly pull, wider pulse radius. Each maxes at level 2.
- **Raja Kelelawar**: a boss on night 5 with 3 pulse-hit points, dive attacks on the lantern, and regular bats called in while he lives. Defeat him to end night 5 early with a +500 bonus.
- **A busy sky**: from night 2 on, fireflies and bats spawn much faster (up to ~4/s and ~2.2/s), with caps so the screen stays readable. Bat waves arrive with a warning banner (1 per night on nights 2-3, 2 on nights 4-5), and a golden shower drops 5 golden fireflies at once once per night from night 3.
- **Combo spectacle**: consecutive saves build a combo (x2 at 5, x3 at 10). Crossing x5 and x10 fires a bigger feedback burst; a lost firefly costs one combo step, being eaten or hit still resets it. G cycles the screen-shake strength (100% / 50% / off).

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=xq7dtvgn&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
