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

- **Open** the live link above, or download `index.html` and open it in any
  modern browser. It also works offline.
- **Add to Home Screen** on a phone to run it full-screen like an app.
- **Sound on mobile:** take the phone off silent mode and tap the screen once —
  iOS/Android only start audio after a user gesture. The status bar shows the
  audio state.

## Layout

Same program everywhere; the interface adapts. On wide screens the controls sit
in a side column next to the visualization; on narrow screens they stack, with
larger touch targets for sliders, buttons and checkboxes.

---

*Built as a single HTML file (audio via the Web Audio API, graphics on a 2-D
canvas).*
