#!/bin/zsh
# The form's end, silently: ./tests/run-form.sh [page] [label] — the face's written form from ✚ to its own end, both halves spied
# (every queued beat, every kill of a held drone, every move of the master, the output level), plus the prime left behind by a
# meditation. Same server and Chrome as run-suite.sh; about four minutes.
cd "$(dirname "$0")"
deno run -A run-headless.ts "${1:-2907QR_Engine_8.html}" suite-form.json "results-form-${2:-local}.json"
