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

## The form's end (05.11)

`run-form.sh` plays the face's written form (✚, then start) to its own end, with both halves spied: every queued beat with its
audio instant, every kill of a held drone, every move of the master's gain, the output level, the transport's pause. The verdict
says whether a fader moved the master at the end, whether a drone was cut before the tail reached silence, whether the pause came
at silence and how long after it, whether any beat was queued after the plan's last, whether a scene's first beat came early or
late against its due instant, and whether Markova rested at the same instant. One scenario checks the prime the genres are left
with after a meditation; one restarts the form inside its tail.

    ./tests/run-form.sh                          # six scenarios, ~4 minutes
    ./tests/run-form.sh some-copy.html label

## The lyric arc (05.11)

`run-lyric.sh` plays a 3:00 lyric form in the pair and reads its five stages — caress · desire · passion · climax · catharsis —
in order, with each stage's tempo, master and prime, the Goncharova configurations and omega harps that sounded in it, whether
the climax event fired (the complete configuration with the harp at the meeting of a and b, then a beat held), and how the form
ended. About four minutes.

## The genres' profiles (06.11)

`suite-profile.json` (run it through `run-headless.ts` like the others) composes a 2:00 form in each genre and reports it
scene by scene: the scene's role in the genre's dramaturgy (the proof's thesis · lemma · qed · coda; the workout's warm ·
work · rest · sprint · cool; the ascent's rungs and its top; the chores' plate bounces and the click), its prime, tempo,
master, groove and section, and what sounded in it — beats, Goncharova chords, omega harps, the mean output level, and the
genre's own events (`gev`: a bell on a line's entry, a chord on a scene's entry or on its last beat, the click). `herGev`
counts the events Markova's window fired: it should stay 0 — the events belong to Markov's window, which carries the shared bed.

    deno run -A tests/run-headless.ts 2907QR_Engine_8.html tests/suite-profile.json tests/results-profile.json   # ~15 minutes
