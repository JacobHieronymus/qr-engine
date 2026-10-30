// QR Engine — silent duet harness (29.10). Load in the CONDUCTOR's page served muted (serve_muted.py):
//   eval(await (await fetch('/tests/duet-harness.js')).text());  then  __QRT.start({...}); later __QRT.report()
// It drives both windows through the engine's own doors (the ×k select, #p-num, #bpm-num, _qrDuo.mode, ▶),
// samples both halves every 50 ms and measures the duet's invariants. Nothing here changes the engine.
(function(){
  const T = window.__QRT = window.__QRT || {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  T.W = () => { const f = document.querySelector('#duo-frame-wrap iframe'); return f && f.contentWindow; };
  const G = (w, name) => { try { return w.Function('try{ return ' + name + '; }catch(e){ return null; }')(); } catch (e) { return null; } };
  const SECS = { prelude: 1, main: 1, postlude: 1, dual: 1 };
  function snap(w) {
    const st = G(w, 'state'), s = G(w, 'synthState'); if (!st) return null;
    return { p: s && s.p != null ? s.p : st.p, sp: st.p, bpm: +(+st.bpm).toFixed(2), ph: s && s.phase, fi: s && s.flowIdx, ri: s && s.rIdx,
      rl: s && s.rList ? s.rList.length : null, r: s ? s.currentR : null, run: !!st.running, pau: !!st.paused,
      mult: st.duo ? st.duo.mult | 0 : 0, mode: st.duo ? st.duo.mode : null, peer: !!(st.duo && st.duo.peer),
      pins: st.apPins ? [...st.apPins].join(',') : '' };
  }
  function hookErrors(w, tag) {
    if (!w || w.__qrtHooked) return; w.__qrtHooked = 1;
    w.addEventListener('error', e => T.errors.push({ w: tag, t: T.now(), m: String(e.message).slice(0, 200) }));
    w.addEventListener('unhandledrejection', e => T.errors.push({ w: tag, t: T.now(), m: 'reject: ' + String(e.reason && (e.reason.message || e.reason)).slice(0, 200) }));
    const ce = w.console.error.bind(w.console);
    w.console.error = function () { try { T.errors.push({ w: tag, t: T.now(), m: 'console: ' + [...arguments].map(String).join(' ').slice(0, 200) }); } catch (e) {} return ce.apply(null, arguments); };
  }
  function countRestores(w, key) {
    const sc = G(w, 'scenes'); if (!sc || sc.__qrtWrapped) return; sc.__qrtWrapped = 1;
    const o = sc.restore; sc.restore = function () { T.restores[key] = (T.restores[key] || 0) + 1; return o.apply(this, arguments); };
  }
  T.now = () => +(performance.now() / 1000 - (T.t0 || 0)).toFixed(2);
  // the MULTIPLICITY knob on the duet pill: its label's own text node is «×(p−1)» (the phone's pulse-ratio proxy is also called «×k» and multiplies the tempo — never touch it)
  const multSel = () => [...document.querySelectorAll('#duo-panel label select, label select')].find(s => { const l = s.parentElement; return l && l.firstChild && l.firstChild.nodeType === 3 && /^×\(p−1\)/.test(l.firstChild.textContent.trim()); });
  async function setP(p) { const pn = document.getElementById('p-num'); pn.value = String(p); pn.dispatchEvent(new Event('change', { bubbles: true })); await sleep(300); }
  // the tempo field answers 'input' (which also pins 'bpm' — the hand touched it); an unpinned run clears the pins after
  async function setBpm(b) { const r = document.getElementById('bpm'); r.value = String(b); r.dispatchEvent(new Event('input', { bubbles: true })); await sleep(300); }   // the slider answers 'input' (bindRangePair); the number field only on Enter/blur
  async function setK(k) {
    const ms = multSel(); if (!ms) return 'no ×k select';
    let o = [...ms.options].find(o => (o.value | 0) === (k | 0));
    // a paused engine paints the knob from the prime it stopped on, not the one just typed: offer k by hand when it IS valid at p
    if (!o && k > 1) { const st = G(window, 'state'); if (window._multPrime(st.p | 0, k | 0)) { o = document.createElement('option'); o.value = String(k); o.textContent = '×' + k; ms.appendChild(o); T.marks.push({ t: 0, note: 'knob repainted by hand: ' + st.p + ' ×' + k }); }
      else return 'k ' + k + ' not offered: ' + [...ms.options].map(o => o.value + '=' + o.textContent).join(' '); }
    ms.value = o ? o.value : '1'; ms.dispatchEvent(new Event('change', { bubbles: true })); await sleep(900);
    const got = (G(window, 'state').duo.mult | 0) || 1; return got === Math.max(1, k | 0) ? null : 'knob did not take: mult ' + got + ' wanted ' + k;
  }
  async function stopBoth() {
    const ep = document.getElementById('engine-play');
    const st = G(window, 'state'); if (st && st.running && !st.paused && ep) { ep.click(); await sleep(600); }
  }
  T.ensurePair = async function () {
    if (!T.W()) { try { window._qrDuo.frame(); } catch (e) {} }
    for (let i = 0; i < 60; i++) { const st = G(window, 'state'); if (st && st.duo && st.duo.peer && T.W()) return true; await sleep(250); }
    return false;
  };
  // cfg: {name, mode:'retro'|'parts'|'free'|'solo', k, p, bpm, secs, pinBpm, auto, keys:[[sec,'ArrowUp'],...], sections:'all'}
  T.start = function (cfg) { T.cfg = cfg; T.done = false; T.result = null; T.promise = T.run(cfg).then(r => { T.result = r; T.done = true; return r; }, e => { T.result = { error: String(e && e.stack || e) }; T.done = true; }); return 'started ' + cfg.name; };
  T.run = async function (cfg) {
    T.errors = []; T.restores = {}; T.rec = []; T.marks = [];
    const solo = cfg.mode === 'solo';
    if (!solo && !(await T.ensurePair())) return { name: cfg.name, error: 'no pair' };
    const M = solo ? null : T.W();
    hookErrors(window, 'his'); if (M) hookErrors(M, 'her');
    countRestores(window, 'his'); if (M) countRestores(M, 'her');
    await stopBoth();
    try { const L = G(window, 'learner'); const on = L && L.isAutoOn && L.isAutoOn(); if (!!cfg.auto !== !!on && L) L.toggleAuto(); } catch (e) {}
    if (M) try { const L = G(M, 'learner'); const on = L && L.isAutoOn && L.isAutoOn(); if (on) L.toggleAuto(); } catch (e) {}
    if (cfg.setup) { try { (new Function(cfg.setup))(); } catch (e) { T.errors.push({ w: 'setup', t: 0, m: String(e) }); } await sleep(300); }   // e.g. 'state.reorderR=7'
    if (!solo) { try { window._qrDuo.mode(cfg.mode); } catch (e) {} await sleep(500); }
    if (!solo) { const e = await setK(1); if (e && !/not offered/.test(e)) return { name: cfg.name, error: 'reset ×1: ' + e }; }
    await setP(cfg.p);
    if (cfg.bpm) await setBpm(cfg.bpm);
    if (!cfg.pinBpm) { try { window.apClearPins(); } catch (e) {} }
    if (!solo && cfg.k > 1) { const e = await setK(cfg.k); if (e) return { name: cfg.name, error: e }; }
    await sleep(600);
    T.t0 = performance.now() / 1000;
    document.getElementById('engine-play').click();
    const keys = (cfg.keys || []).slice().sort((a, b) => a[0] - b[0]);
    const probes = (cfg.probes || []).slice().sort((a, b) => a[0] - b[0]); T.probes = [];
    T.probes.push({ t: 'pre', his: G(window, '({mult:state.duo.mult, lead:window._qrIsLead&&window._qrIsLead(), bpm:state.bpm, p:state.p, pins:[...state.apPins]})'), her: M ? G(M, '({mult:state.duo.mult, lead:window._qrIsLead&&window._qrIsLead(), bpm:state.bpm, p:state.p, pins:[...state.apPins]})') : null });
    const end = cfg.secs || 60;
    T.abort = false;
    while (T.now() < end && !T.abort) {
      const t = T.now();
      while (probes.length && probes[0][0] <= t) { const ex = probes.shift()[1]; T.probes.push({ t, his: G(window, '(' + ex + ')'), her: M ? G(M, '(' + ex + ')') : null }); }
      while (keys.length && keys[0][0] <= t) { const k = keys.shift()[1]; T.marks.push({ t, key: k }); document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }
      T.rec.push({ t, H: snap(window), M: M ? snap(M) : null });
      await sleep(50);
    }
    await stopBoth();
    return T.analyze(cfg);
  };
  const q = (p, k) => { try { return window._multPrime(p, k); } catch (e) { return null; } };
  T.analyze = function (cfg) {
    const R = T.rec.filter(x => x.H && x.t >= 1.0), k = cfg.k | 0, out = { name: cfg.name, cfg, samples: R.length, errors: T.errors.slice(0, 12), errorCount: T.errors.length, restores: T.restores, marks: T.marks, probes: T.probes };   // the first second is the previous run's state
    const his = R.map(x => x.H.p), path = []; his.forEach((p, i) => { if (!path.length || path[path.length - 1].p !== p) path.push({ t: R[i].t, p }); }); out.hisPath = path;
    const herPath = []; R.forEach(x => { if (x.M && (!herPath.length || herPath[herPath.length - 1].p !== x.M.p)) herPath.push({ t: x.t, p: x.M.p, bpm: x.M.bpm }); }); out.herPath = herPath.slice(0, 40);
    out.bpm = { his: [...new Set(R.map(x => x.H.bpm))].slice(0, 8), her: [...new Set(R.filter(x => x.M).map(x => x.M.bpm))].slice(0, 8) };
    if (cfg.mode === 'solo') {
      out.phases = [...new Set(R.map(x => x.H.ph))];
      out.verdict = { phases: out.phases.length, primes: path.length, running: R.length ? +(100 * R.filter(x => x.H.run && !x.H.pau).length / R.length).toFixed(1) : 0, errors: T.errors.length };
      return out;
    }
    // expected prime and tempo of her half; a tolerance window after every change of his prime / section
    let lastHP = null, tHP = -1e9, lastHS = null, tHS = -1e9, pOK = 0, pBad = 0, bOK = 0, bBad = 0, sOK = 0, sBad = 0, rogue = 0;
    const pEp = [], bEp = [], sEp = []; let cur = null;
    const ep = (arr, kind, t, a, b) => { const l = arr[arr.length - 1]; if (l && l.open && l.a === a && l.b === b) { l.t1 = t; return; } if (l) l.open = false; arr.push({ kind, t0: t, t1: t, a, b, open: true }); };
    const close = arr => { const l = arr[arr.length - 1]; if (l) l.open = false; };
    let prevMP = null;
    // (30.10) the tolerance is SYMMETRIC around each change of his prime / section: an announced landing seats both halves on one
    // beat, and her beat may be scheduled (and sampled) a lookahead before his — within one of his beats she is early, not wrong
    const hpCh = [], hsCh = []; { let a = null, b = null; R.forEach(x => { const H = x.H; if (H.p !== a) { a = H.p; hpCh.push(x.t); } const s2 = SECS[H.ph] ? H.ph : 'pause'; if (s2 !== b) { b = s2; hsCh.push(x.t); } }); }
    const near = (arr, t, w) => arr.some(c => Math.abs(c - t) < w);
    const hisPAt = t => { let v = R[0] ? R[0].H.p : null; for (const x of R) { if (x.t > t) break; v = x.H.p; } return v; };
    R.forEach(x => {
      const H = x.H, M = x.M; if (!M || !H.run || H.pau) return;
      const hb = 60 / Math.max(5, H.bpm);
      const qh = k > 1 ? q(H.p, k) : null, expP = qh || H.p, expB = qh ? Math.max(5, H.bpm / k) : H.bpm;
      const tol = Math.max(2.0, (k > 1 ? 2 * k + 2 : 3) * hb + 0.6);
      if (H.p !== lastHP) { lastHP = H.p; tHP = x.t; }
      const hs = SECS[H.ph] ? H.ph : 'pause'; if (hs !== lastHS) { lastHS = hs; tHS = x.t; }
      if (cfg.mode !== 'free') {
        if (!near(hpCh, x.t, tol)) { if (M.p === expP) { pOK++; close(pEp); } else { pBad++; ep(pEp, 'p', x.t, H.p + '→' + expP, M.p); } }
        if (prevMP !== null && M.p !== prevMP && M.p !== expP) {
          // rogue = she moved to a prime that his prime does not explain anywhere within the tolerance, before or after
          const ex = t2 => { const hp = hisPAt(t2); const qq = k > 1 ? q(hp, k) : null; return qq || hp; };
          if (!(ex(x.t + tol) === M.p || ex(x.t - tol) === M.p)) { rogue++; T.marks.push({ t: x.t, rogue: prevMP + '→' + M.p, his: H.p, exp: expP }); } }
      }
      prevMP = M.p;
      if (!cfg.pinBpm && !near(hpCh, x.t, tol)) { if (Math.abs(M.bpm - expB) < 0.6) { bOK++; close(bEp); } else { bBad++; ep(bEp, 'bpm', x.t, H.bpm + '/' + (qh ? k : 1) + '=' + expB.toFixed(1), M.bpm); } }
      if (cfg.mode === 'retro' || cfg.mode === 'parts') {
        const ms = SECS[M.ph] ? M.ph : 'pause';
        const stol = (k > 1 ? (k + 1) * hb : 1.5 * hb) + 0.4;
        if (!near(hsCh, x.t, stol) && !near(hpCh, x.t, stol)) { if (ms === hs) { sOK++; close(sEp); } else { sBad++; ep(sEp, 'sec', x.t, hs, ms); } }
      }
    });
    const fmt = arr => arr.filter(e => e.t1 - e.t0 >= 0.1 || arr.length < 6).slice(0, 10).map(e => ({ t: +e.t0.toFixed(1), dur: +(e.t1 - e.t0 + 0.05).toFixed(1), his: e.a, her: e.b }));
    out.p = { ok: pOK, bad: pBad, episodes: fmt(pEp) };
    out.tempo = { ok: bOK, bad: bBad, episodes: fmt(bEp) };
    out.section = { ok: sOK, bad: sBad, episodes: fmt(sEp) };
    out.rogueHerSteps = rogue; out.rogue = T.marks.filter(m => m.rogue).slice(0, 8);
    const pct = (a, b) => (a + b) ? +(100 * a / (a + b)).toFixed(1) : null;
    out.verdict = { p: pct(pOK, pBad), tempo: cfg.pinBpm ? 'pinned' : pct(bOK, bBad), section: pct(sOK, sBad), rogue, errors: T.errors.length };
    return out;
  };
  // compact raw samples, so a result can be re-analysed with a changed rule without re-running the scenario
  T.raw = () => (T.rec || []).map(x => [x.t, x.H && x.H.p, x.H && x.H.bpm, x.H && x.H.ph, x.H && x.H.run && !x.H.pau ? 1 : 0, x.M && x.M.p, x.M && x.M.bpm, x.M && x.M.ph]);
  T.report = () => T.done ? T.result : { running: T.cfg && T.cfg.name, t: T.now(), samples: (T.rec || []).length };
  T.summary = r => r && r.verdict ? { name: r.name, verdict: r.verdict, hisPath: r.hisPath.slice(0, 8), herPath: r.herPath.slice(0, 10), p: r.p.episodes.slice(0, 4), tempo: r.tempo.episodes.slice(0, 4), section: r.section.episodes.slice(0, 5), rogue: r.rogue.slice(0, 4), errors: r.errors.slice(0, 4), restores: r.restores } : r;
  return 'harness loaded';
})();
