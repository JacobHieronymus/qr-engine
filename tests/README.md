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

## ×k up to 32 (09.11)

The ×k selector offers every k from 2 to 32 (the arrow names this p's q where one exists; otherwise «the form pairs»). A composed
form (✚) moves each paired scene's prime to one whose q = (p−1)/k+1 is prime and sets him k times faster than the genre's tempo,
at most 999 bpm: she keeps the genre's tempo (his ÷ k). `suite-xk32.json` plays retro and parts at ×32 (193@999 → 7@31.2), retro
×16 (97@999 → 7@62.4) and parts ×7 (29@742 → 5@106, then the unpaired 31): her prime, tempo and section his own in 100 % of the
samples, no step of her own, no errors (09.11, master and the ambisonic build alike).

    deno run -A tests/run-headless.ts 2907QR_Engine_8.html tests/suite-xk32.json /tmp/xk32.json    # ~8 minutes

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

## The demos in Safari's engine, and the seams of a big prime (08.11)

The author heard the public demos (`demos.html`) break up in Safari. Three causes were measured and removed; the kit that
measured them lives in `/Users/jg/claude/tools/demo-0811/` (outside the repo):

- `probe-demo.ts` — headless Chrome, a `?demo=` page, both halves sampled every 200 ms (bus level, transport, prime), the
  main thread's long tasks, an optional CPU profile (`PROF_FROM` / `PROF_TO`), `prof.py` to read it by function.
- `wk/run-wk.ts` with `wk/WKProbe` (Swift, a WKWebView window: the Safari engine) — every note's slack against the audio
  clock, the 10 ms interval's gaps, frames, and each context's pace (rendered seconds per wall second), one bucket a second
  per half, posted to the runner. A preflight proves the page's audio goes into a zero gain before anything plays (the
  author hears nothing). Per-run switches through the runner: `sr48`, `noconv`, `convx2`; `click` uses `wk/WKProbe2`, which
  needs a real gesture for audio and sends a real mouse click to a card. `wk/ratio.py` and `wk/anwk.py` read the results.
- `test-pick.ts` — the `?demos` picker in Chrome under the default autoplay policy (sound only after a gesture): forward,
  card, ← back, another card, ↻, and the old `?demo=` link still asking for its tap. `test-labels.ts` — the cockpit's
  type labels counted by the worker equal the old synchronous counts.

What was found: at every seam of a huge prime (meditate, p≈30 000–90 000) the main thread stood 1–3 s (the cockpit's
type labels: all eleven configuration types enumerated at every cfgRefresh, for a select nobody saw; the background repainted
twice; Goncharova's closed form recomputed); in Safari the device's 96 kHz doubled the render, and the ten convolvers of
each half ran the audio clock at 0.5 of real time (the watchdog's damps and flushes were the breaks); a second form after a
rest let Markova walk her previous scene for the lead.

## A half that joins a plain run late (09.11)

The author heard Markova silent through a whole retro form: her frame had opened mid-form (HEAR «both», or a reload). A new
peer got the scene and the mode on 'hello', and only a palindrome or a parts score was mailed again with the transport; retro
and free (and a parts plan without a score) run by `_qrPlainRun`, so her clock ran and her transport stood. Now the window that
plays sends `{t:'xport', on:true}` once per new peer (`_lastPeerXport`), not on the phone route (her own tap starts her) and not
while a palindrome is live (its own door). Checked silently in headless Chrome (`tools/ambi-0911/test-late.ts`: the demo runs,
her frame is reloaded at 8 s, her transport and notes are read 4 and 10 s later): before the fix retro and free stayed silent,
after it she plays in all four modes (retro and parts on his scene and p, free on her own, the palindrome unchanged).
