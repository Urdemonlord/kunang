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

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=xq7dtvgn&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
