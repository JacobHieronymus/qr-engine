#!/bin/zsh
# Silent duet suite: ./tests/run-suite.sh [page] [label] — page defaults to the engine, results land beside this script.
# Needs Google Chrome and Deno. Nothing is heard: every Web Audio graph is routed into a zero gain and Chrome runs headless with --mute-audio.
cd "$(dirname "$0")"
deno run -A run-headless.ts "${1:-2907QR_Engine_8.html}" suite-xk.json "results-${2:-local}.json"
