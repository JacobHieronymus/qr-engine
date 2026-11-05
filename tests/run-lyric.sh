#!/bin/zsh
# The lyric arc, silently: ./tests/run-lyric.sh [page] [label] — a 3:00 lyric form in the pair; the verdict lists the five stages in
# order with their tempo, master and prime, the configurations and harps per stage, whether the climax fired, and the end.
cd "$(dirname "$0")"
deno run -A run-headless.ts "${1:-2907QR_Engine_8.html}" suite-lyric.json "results-lyric-${2:-local}.json"
