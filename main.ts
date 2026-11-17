// Kunang — Penjaga Lentera: the hand-in script for make.fun best-game-01.
//
// What it does, in order:
//   1. works out where the repository lives (this file's own directory) and
//      where the hand-in goes (MAKEFUN_OUTPUT_DIR, or /output in the grader);
//   2. checks the game is really there before copying anything, so a broken
//      checkout fails here with a plain message instead of halfway through;
//   3. stages a fresh copy of game/ and screenshots/ into the output
//      directory, clearing any stale copy of those two folders first;
//   4. asks the vendored make.fun library to write dossier.json, the
//      summary the judge reads, and reports what it staged.
//
// It runs on Node 22 with only the standard library: no install step, no
// build step, no network. The grader runs it in a fresh container with the
// repository mounted read-only and a writable /output.
//
// Outside the grader, point MAKEFUN_OUTPUT_DIR at a scratch directory:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The caps the scorer itself enforces (the competition's gate.json). Only
// text_max_bytes shapes the dossier bytes; the other caps refuse an entry
// the scorer would refuse, so failing here is failing the same way there.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// The repository root is the directory this file sits in, resolved so the
// trailing slash fileURLToPath keeps on a directory URL does not break
// the equality check in main().
const REPO_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));

// The grader sets no variable and hands us /output; anywhere else, the
// caller points at a scratch directory instead.
function outputDir(): string {
  return process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
}

// How many files a directory tree holds, and how many bytes they add up to.
function tally(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = tally(path);
      files += sub.files;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}

// Replace a staged folder with a fresh copy of a source folder. The
// destination is cleared first so files deleted from the game do not linger
// in an output directory that already holds an older staging.
function stageFresh(source: string, dest: string): void {
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  if (existsSync(source)) cpSync(source, dest, { recursive: true });
}

// The game is unplayable without its page, so check for it before staging
// anything: a missing index.html is a broken checkout, not a dossier error.
function checkGamePresent(gameDir: string): void {
  const page = join(gameDir, 'index.html');
  if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) {
    throw new Error(`game/ is missing from ${REPO_ROOT}`);
  }
  if (!existsSync(page) || !statSync(page).isFile()) {
    throw new Error(`game/index.html is missing from ${REPO_ROOT}`);
  }
}

function main(): void {
  const out = outputDir();
  const gameDir = join(REPO_ROOT, 'game');
  const shotsDir = join(REPO_ROOT, 'screenshots');

  // Staging clears out/game and out/screenshots first, so the output
  // directory must never be the repository itself: pointing it at the repo
  // root would delete the game's own source before copying it back.
  if (resolve(out) === REPO_ROOT) {
    throw new Error(
      'refusing to stage into the repository root: set MAKEFUN_OUTPUT_DIR to /output or a scratch directory',
    );
  }

  checkGamePresent(gameDir);
  mkdirSync(out, { recursive: true });

  stageFresh(gameDir, join(out, 'game'));
  stageFresh(shotsDir, join(out, 'screenshots'));

  const staged = tally(join(out, 'game'));
  const shots = tally(join(out, 'screenshots'));

  const dossier = buildDossier(out, DOSSIER_CAPS);
  const dossierPath = join(out, 'dossier.json');
  writeFileSync(dossierPath, dossier);

  console.log(
    `kunang: staged ${staged.files} game files (${staged.bytes} bytes), ` +
      `${shots.files} screenshots, dossier ${dossier.length} bytes -> ${out}`,
  );
}

try {
  main();
} catch (err) {
  console.error(`kunang: hand-in failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
