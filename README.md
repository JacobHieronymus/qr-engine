# QR Engine

A browser-based **quadratic-residue music engine** — a single self-contained
HTML file that turns the arithmetic of quadratic residues modulo a prime into
sound and animated visuals. No build step, no dependencies: open the file and it
runs.

**▶ Live: https://jacobhieronymus.github.io/qr-engine/**

---

## What it does

For a prime *p*, the engine works with the quadratic residues mod *p* and maps
them onto a musical scale and a 2-D plot. You can step the prime up and down
live, change the residue *r*, reverse direction, and shape the sound across many
independent voices (each with its own volume and solo).

### Goncharova configurations

The centerpiece is a module that sounds **quadruples of residues** classified by
their *difference graph*: for *p* ≡ 1 (mod 4), draw an edge between two residues
whenever their difference is itself a quadratic residue. The eleven possible
4-vertex graph types — from the empty graph up to the complete graph *K₄* (all
six differences are residues) — each become a characteristic four-voice chord.

A melody-driven mode embeds these chords in the running piece: every note in the
melody (or the prelude) that belongs to a quadruple triggers that quadruple,
playing each one before the melody moves on, with per-screen de-duplication and a
direction that follows playback.

## The mathematics

The complete-graph case — quadruples of residues with all six pairwise
differences also residues — is the subject of the last unpublished result of
**Lydia Goncharova**. For *p* = 4*k* + 1 the count is

```
n_p(K4) = ( k(k−1)(k−4) + 2k·d(k) ) / 24,   d(k) = (J(k)² − 4) / 32,
```

where *J*(*k*) is a sum of Legendre symbols equal to the trace of Frobenius of
the CM elliptic curve *y*² = *x*³ − *x*. The engine computes this formula live
and verifies it against direct enumeration.

The result, its reformulation in terms of a K3 / Kummer surface, and its proof
appear in:

> V. Kiritchenko, M. Tsfasman, S. Vlăduţ, I. Zakharevich,
> *Quadratic residue patterns, algebraic curves and a K3 surface*,
> arXiv:2403.16326 — dedicated to the memory of Lydia Goncharova.

## Using it

Open the live link above. `index.html` there only redirects to the engine
itself, `2907QR_Engine_8.html` — that is the file to download and open in any
modern browser. From disk it plays offline; the shared ♥ memory needs the
network, and an iPhone opens Markova's half only over http(s). On a phone,
**Add to Home Screen** runs it full-screen like an app.

1. **The demos:** `demos.html` → a picture → the first tap starts the sound
   (headphones on, phone off silent) → the bar: ❚❚ pause · ↻ restart ·
   ♥ keeps a moment · ← back.
2. **The engine:** the ◆ form door → a genre → a form → min:sec → **start** —
   with no score on hand the Markovs compose the piece and play it, and it
   ends by itself; ✚ compose writes it without playing. The score stays:
   start plays it until the face shows another genre or length, or a ⟲ or
   ×k it was not written for — then the key reads **✚ recompose**: one
   press composes the new piece, the next plays it.
3. **The stage:** ⛶ stage or **F** gives the field the whole screen; **Esc** or
   ✕ stage leaves it.
4. **The keys:** ↑↓ prime · ←→ root · Space play / pause · H ♥ · F stage ·
   ? the field's legend · C clears a pile-up of chords.

## Layout

Same program everywhere; the interface adapts. It opens on the face: the field
above, the piece's keys beneath it, behind three doors — ◆ form, ∴ walk (the
Musrara walk, played by hand) and ✎ manual. ✎ manual opens the full cockpit: on
wide screens a side column next to the field; on narrow screens it stacks, with
larger touch targets for sliders, buttons and checkboxes.

---

*Built as a single HTML file (audio via the Web Audio API, graphics on a 2-D
canvas).*
