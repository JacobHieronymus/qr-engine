# Silent duet tests

`run-suite.sh` serves this repository locally, opens the engine in headless Chrome with all sound routed into a zero gain,
opens Markova's frame and plays eleven scenarios of the duet (parts and retro, ×1, ×2, ×3, a pinned tempo, arrow-key
landings, a Fibonacci order, a single page). Both halves are sampled every 50 ms; the result says, per scenario, how much
of the time her prime is the one his prime implies (his p, or q = (p−1)/k+1 under ×k), her tempo his ÷k, her section his,
how often she stepped a prime of her own, and how many errors either page threw.

    ./tests/run-suite.sh                         # the engine in this folder
    ./tests/run-suite.sh some-copy.html label    # any page under the repository root

`duet-harness.js` is the in-page part (it drives only the engine's own controls); `run-headless.ts` is the server and the
Chrome driver; `suite-xk.json` lists the scenarios. A full run takes about 20 minutes.
