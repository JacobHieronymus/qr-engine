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
  T.start = function (cfg) { T.cfg = cfg; T.done = false; T.result = null; T.promise = (cfg.mode === 'form' ? T.runForm(cfg) : T.run(cfg)).then(r => { T.result = r; T.done = true; return r; }, e => { T.result = { error: String(e && e.stack || e) }; T.done = true; }); return 'started ' + cfg.name; };
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
  // ===== (04.11) THE FORM'S END — mode 'form': the face's written form from ✚ to its own end, both halves spied.
  // cfg: {name, mode:'form', genre:'focus', T:20, secs, pair:true, duoMode:'parts', steps:[[sec, js]], floorDb:-60, stopAt:sec}
  // Spies (no engine code changed): scheduleOneBeat (every queued beat with its audio time), killLongSustains, flushVoices,
  // pauseAudio, scenes.restore, and every method of masterGain.gain — in both windows. Samples every 50 ms: the master's
  // gain value, the output RMS (dB) from _outMeter, _formOn, the transport. The verdict reads the author's rule on endings:
  // no fader on the master, no cut of a held drone before the tail is silent, the pause only at silence, no beat after the end.
  function spyWin(w, tag) {
    if (!w || w.__qrtSpied) return; w.__qrtSpied = 1;
    const E = T.ev, now = T.now, ct = () => { try { const c = G(w, 'ctx'); return c ? +c.currentTime.toFixed(3) : null; } catch (e) { return null; } };
    const wrap = (name, fn) => { try { const o = G(w, name); if (typeof o !== 'function') return; w[name] = function () { try { fn.apply(this, arguments); } catch (e) {} return o.apply(this, arguments); }; } catch (e) {} };
    wrap('scheduleOneBeat', function (time) { const s = G(w, 'synthState'), st = G(w, 'state'); E.push({ t: now(), w: tag, ev: 'beat', at: +(+time).toFixed(3), c: ct(), ph: s && s.phase, ri: s && s.rIdx, p: st && st.p }); });
    wrap('killLongSustains', function (reason, tau) { E.push({ t: now(), w: tag, ev: 'kill', why: String(reason), tau: tau, c: ct() }); });
    wrap('flushVoices', function () { E.push({ t: now(), w: tag, ev: 'flush', c: ct() }); });
    wrap('_omegaEcho', function (p, time, dur, beat, cyc) { E.push({ t: now(), w: tag, ev: 'harp', p, k: cyc && cyc.length, at: +(+time).toFixed(3) }); });   // (05.11) the omega harp (the ring) spoke
    wrap('cfgChordAt', function (at, quad) { const st = G(w, 'state'); E.push({ t: now(), w: tag, ev: 'chord', at: +(+at).toFixed(3), quad: quad && quad.slice ? quad.slice(0, 4) : null, p: st && st.p, type: st && st.typeId }); });   // (05.11) a Goncharova configuration sounding
    wrap('pauseAudio', function () { const st = G(w, 'state'); E.push({ t: now(), w: tag, ev: 'pause', to: st && st.running ? !st.paused : null, c: ct() }); });
    try { const sc = G(w, 'scenes'); if (sc && sc.restore && !sc.__qrtSpy2) { sc.__qrtSpy2 = 1; const o = sc.restore; sc.restore = function (st, opts) { E.push({ t: now(), w: tag, ev: 'restore', p: st && st.p, c: ct(), opts: opts ? Object.keys(opts).join(',') : '' }); return o.apply(this, arguments); }; } } catch (e) {}
    try { const mg = G(w, 'masterGain'); if (mg && mg.gain && !mg.gain.__qrtSpy) { mg.gain.__qrtSpy = 1; ['setTargetAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setValueAtTime', 'cancelScheduledValues'].forEach(m => { const o = mg.gain[m]; if (typeof o !== 'function') return; mg.gain[m] = function () { E.push({ t: now(), w: tag, ev: 'master', m, v: +(+arguments[0]).toFixed(4), c: ct() }); return o.apply(this, arguments); }; }); } } catch (e) {}
  }
  function rmsDb(w) {
    try { const an = G(w, '_outMeter'); if (!an) return null; const b = w.__qrtBuf || (w.__qrtBuf = new Float32Array(an.fftSize)); an.getFloatTimeDomainData(b); let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i]; const r = Math.sqrt(s / b.length); return +(20 * Math.log10(Math.max(r, 1e-7))).toFixed(1); } catch (e) { return null; }
  }
  function fsnap(w) {
    const st = G(w, 'state'), s = G(w, 'synthState'), mg = G(w, 'masterGain'), c = G(w, 'ctx'); if (!st) return null;
    return { c: c ? +c.currentTime.toFixed(2) : null, g: mg ? +mg.gain.value.toFixed(3) : null, db: rmsDb(w), run: !!st.running, pau: !!st.paused, on: !!G(w, 'window._formOn'), ph: s && s.phase, p: st.p, held: !!G(w, 'window._masterHeld') };
  }
  T.runForm = async function (cfg) {
    T.errors = []; T.restores = {}; T.rec = []; T.marks = []; T.ev = []; T.probes = [];
    const pair = cfg.pair !== false;
    if (pair && !(await T.ensurePair())) return { name: cfg.name, error: 'no pair' };
    const M = pair ? T.W() : null;
    hookErrors(window, 'his'); if (M) hookErrors(M, 'her');
    await stopBoth();
    try { const L = G(window, 'learner'); if (L && L.isAutoOn && L.isAutoOn()) L.toggleAuto(); } catch (e) {}
    if (pair && cfg.duoMode) { try { window._qrDuo.mode(cfg.duoMode); } catch (e) {} await sleep(500); }
    if (cfg.setup) { try { (new Function(cfg.setup))(); } catch (e) { T.errors.push({ w: 'setup', t: 0, m: String(e) }); } await sleep(300); }
    T.t0 = performance.now() / 1000;
    spyWin(window, 'his'); if (M) spyWin(M, 'her');
    const genre = g => { const b = [...document.querySelectorAll('#face-gen button')].find(x => x.textContent.trim() === g); if (!b) throw new Error('no genre key ' + g); b.click(); };
    const setLen = s => { const mi = document.getElementById('face-min'), si = document.getElementById('face-sec'); mi.value = String(Math.floor(s / 60)); mi.dispatchEvent(new Event('change', { bubbles: true })); si.value = String(s % 60); si.dispatchEvent(new Event('change', { bubbles: true })); };
    T.face = { genre, setLen, make: () => document.getElementById('face-make').click(), go: () => document.getElementById('face-go').click() };
    if (cfg.cockpit) {   // (05.11) the cockpit's ▶ play form (learner.formStart via #form-go, its length in #form-dur) instead of the face's ✚ + start
      try { if (cfg.genre) genre(cfg.genre); await sleep(400); const fd = document.getElementById('form-dur'); fd.value = String(cfg.T || 20); fd.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200); document.getElementById('form-go').click(); T.marks.push({ t: T.now(), note: 'start' }); } catch (e) { return { name: cfg.name, error: 'cockpit: ' + String(e) }; }
    } else
    try { if (cfg.genre) genre(cfg.genre); await sleep(400); setLen(cfg.T || 20); await sleep(300); T.face.make(); await sleep(1200); T.plan = G(window, 'window._qrFormPlan && {n:window._qrFormPlan.plan.length, T:window._qrFormPlan.T, form:window._qrFormPlan.form, p0:window._qrFormPlan.plan[0].state.p, bpm0:window._qrFormPlan.plan[0].state.bpm, durs:window._qrFormPlan.plan.map(function(it){ return +(+it.dur).toFixed(2); }), ps:window._qrFormPlan.plan.map(function(it){ return it.state.p; }), stages:window._qrFormPlan.plan.map(function(it){ return it.state._lyrStage||null; }), secs:window._qrFormPlan.plan.map(function(it){ return it.sec||null; }), scenes:window._qrFormPlan.plan.map(function(it){ var st=it.state||{}, v=st.vol||{}, g=st.groove||{}; return {p:st.p, bpm:st.bpm, m:v.master!=null?+(+v.master).toFixed(2):null, kick:v.kick!=null?+(+v.kick).toFixed(2):null, hat:v.hat!=null?+(+v.hat).toFixed(2):null, chord:v.chord!=null?+(+v.chord).toFixed(2):null, om:v.omega!=null?+(+v.omega).toFixed(2):null, trig:(st.trig&&st.trig.join)?st.trig.join("+"):String(st.trig||""), type:st.typeId||null, groove:g.arch||null, inst:st.voiceInst?((st.voiceInst.a||"")+"/"+(st.voiceInst.b||"")):null, sec:it.sec||null, dur:+(+it.dur).toFixed(1), om_ord:st.omArpOrd||null}; })}'); T.marks.push({ t: T.now(), note: 'composed ' + JSON.stringify(T.plan) }); T.face.go(); T.marks.push({ t: T.now(), note: 'start' }); } catch (e) { return { name: cfg.name, error: 'face: ' + String(e) }; }
    const steps = (cfg.steps || []).slice().sort((a, b) => a[0] - b[0]);
    const probes = (cfg.probes || []).slice().sort((a, b) => a[0] - b[0]);
    const end = cfg.secs || ((cfg.T || 20) + 40); T.abort = false; let pausedSince = null;
    while (T.now() < end && !T.abort) {
      const t = T.now();
      while (steps.length && steps[0][0] <= t) { const js = steps.shift()[1]; T.marks.push({ t, step: js.slice(0, 60) }); try { (new Function('T', js))(T); } catch (e) { T.errors.push({ w: 'step', t, m: String(e) }); } }
      while (probes.length && probes[0][0] <= t) { const ex = probes.shift()[1]; T.probes.push({ t, his: G(window, '(' + ex + ')'), her: M ? G(M, '(' + ex + ')') : null }); }
      const H = fsnap(window); T.rec.push({ t, H, M: M ? fsnap(M) : null });
      if (H && H.run && H.pau) { if (pausedSince == null) pausedSince = t; if (cfg.untilPause !== false && t - pausedSince > 4 && !steps.length) break; } else pausedSince = null;
      await sleep(50);
    }
    await stopBoth();
    return T.analyzeForm(cfg);
  };
  T.analyzeForm = function (cfg) {
    const R = T.rec, E = T.ev, out = { name: cfg.name, cfg, samples: R.length, errors: T.errors.slice(0, 12), errorCount: T.errors.length, marks: T.marks, probes: T.probes };
    const floor = cfg.floorDb != null ? cfg.floorDb : -60;
    const startT = (T.marks.find(m => m.note === 'start') || { t: 0 }).t;
    const side = (tag, key) => {
      const beats = E.filter(e => e.w === tag && e.ev === 'beat' && e.t >= startT);
      const last = beats[beats.length - 1] || null;
      const pause = E.find(e => e.w === tag && e.ev === 'pause' && e.to === true && e.t > startT + 1 && !T.marks.some(m => (m.restart || (m.step && /FormStop/.test(m.step))) && Math.abs(m.t - e.t) < 0.3)) || null;   // the transport's own pause (to:true = running→paused; a scripted stop by hand is not the form's own end)
      const parkS = R.find(x => x.t > startT + 1 && x[key] && !x[key].on); const parkT = parkS ? parkS.t : null;
      const lastT = last ? last.t : null;
      const samples = R.filter(x => x[key]);
      const tailS = lastT != null ? samples.filter(x => x.t > lastT) : [];
      let silT = null; { let run0 = null; for (const x of tailS) { if (x[key].db != null && x[key].db <= floor) { if (run0 == null) run0 = x.t; if (x.t - run0 >= 0.6) { silT = run0; break; } } else run0 = null; } }
      const until = pause ? pause.t : (R.length ? R[R.length - 1].t : 0);
      // the fader test looks only at the END: the master as the last beat was queued (a scene's own master move at a seam is the scene's) against its lowest value from there to the pause
      const gRefS = lastT != null ? samples.filter(x => x.t <= lastT).pop() : null; const gRef = gRefS && gRefS[key].g != null ? gRefS[key].g : 0;
      const gMin = Math.min(...samples.filter(x => lastT != null && x.t >= lastT && x.t <= until).map(x => x[key].g).filter(v => v != null), Infinity);
      const kills = E.filter(e => e.w === tag && e.ev === 'kill' && e.t > startT + 1 && (lastT == null || e.t >= lastT) && (silT == null || e.t < silT));
      const masterCalls = E.filter(e => e.w === tag && e.ev === 'master' && e.t > startT + 1 && (lastT == null || e.t >= lastT - 0.5)).map(e => ({ t: e.t, m: e.m, v: e.v }));
      const beatsAfterPark = parkT != null ? beats.filter(b => b.t > parkT).length : null;
      const beatsAfterPause = pause ? beats.filter(b => b.t > pause.t).length : null;
      const dbAtPause = pause ? (samples.filter(x => x.t <= pause.t).pop() || { [key]: {} })[key].db : null;
      // seams (04.11, measured on the wall): the first beat queued AFTER each restore is the new scene's first beat; its audio
      // instant, carried to the wall (r.t + a1 − r.c), is compared with the scene's DUE instant (the first seam's own instant
      // + the plan's durations). Before e09 the restore fell on a wall timer at the due instant while the beat for that instant
      // was already queued, so the first new beat came a lookahead late (and an old-coloured beat sounded in the new scene);
      // after it the seam is applied at queue time and the first new beat lands within a beat of the due instant.
      const restores = E.filter(e => e.w === tag && e.ev === 'restore' && e.t > startT + 0.5);
      const durs = (T.plan && T.plan.durs) || [];
      let due0 = null;
      const seams = restores.map((r, i) => { const b1 = E.find(e => e.w === tag && e.ev === 'beat' && e.t >= r.t && e.at != null); const a1w = (b1 && r.c != null) ? +(r.t + (b1.at - r.c)).toFixed(2) : null;
        if (i === 0) due0 = a1w; const due = (due0 != null && i < durs.length + 1) ? +(due0 + durs.slice(0, i).reduce((a, b) => a + b, 0)).toFixed(2) : null;
        const oldAfter = E.filter(e => e.w === tag && e.ev === 'beat' && e.t < r.t && e.at != null && b1 && e.at >= b1.at - 0.005).length;   // an older beat sounding at or after the new scene's first beat
        return { t: r.t, p: r.p, c: r.c, firstBeatWall: a1w, due, late: (a1w != null && due != null) ? +(a1w - due).toFixed(2) : null, oldBeatsAfter: oldAfter }; });
      // a restart inside the tail (a scripted second start): beats queued between the press and the new form's first restore belong to the ENDED scene
      const goSteps = T.marks.filter(m => m.restart);   // the steps that actually pressed start (the scenario marks them)
      const restarts = goSteps.map(g => { const r1 = E.find(e => e.w === tag && e.ev === 'restore' && e.t > g.t); const nb = E.filter(e => e.w === tag && e.ev === 'beat' && e.t > g.t && (!r1 || e.t < r1.t)).length; return { t: g.t, firstRestoreT: r1 ? r1.t : null, oldBeatsBeforeIt: nb }; });
      const chords = E.filter(e => e.w === tag && e.ev === 'chord' && e.t >= startT);
      return { chords: chords.length, chordPrimes: [...new Set(chords.map(c => c.p))].slice(0, 8), chordTypes: [...new Set(chords.map(c => c.type))].slice(0, 6), beats: beats.length, lastBeatT: lastT, lastBeatAt: last ? last.at : null, parkT, pauseT: pause ? pause.t : null, silentT: silT, dbAtPause, restarts, gRef: +gRef.toFixed(3), gMin: isFinite(gMin) ? +gMin.toFixed(3) : null,
        killsBeforeSilence: kills.map(k => ({ t: k.t, why: k.why })), masterCallsFromLastBeat: masterCalls.slice(0, 12), beatsAfterPark, beatsAfterPause, seams: seams.slice(0, 16),
        seamsWithEarlyBeat: seams.filter(s => s.oldBeatsAfter > 0).length, seamLateMax: seams.length ? +Math.max(...seams.map(s => Math.abs(s.late || 0))).toFixed(2) : null };
    };
    out.his = side('his', 'H'); if (R.some(x => x.M)) out.her = side('her', 'M');
    const h = out.his;
    const gen = { fader: h.gRef > 0 && h.gMin != null && h.gMin < 0.9 * h.gRef ? 'FADER ' + h.gMin + '/' + h.gRef : 'none' };
    if (cfg.expect === 'profile') {   // (06.11) what a genre IS now: per scene of the plan — its settings, and what sounded in it (beats, chords, harps, level)
      const R2 = T.rec, rs = E.filter(e => e.w === 'his' && e.ev === 'restore' && e.t > startT + 0.3);
      const segs = rs.map((r, i) => ({ t0: r.t, t1: i + 1 < rs.length ? rs[i + 1].t : (h.lastBeatT || r.t) + 0.01 }));
      const sc = (T.plan && T.plan.scenes) || [];
      out.verdict = { scenes: segs.map((g, i) => { const inS = e => e.t >= g.t0 && e.t < g.t1; const dbs = R2.filter(x => x.t >= g.t0 && x.t < g.t1 && x.H && x.H.db != null && x.H.db > -120).map(x => x.H.db);
          const mean = dbs.length ? +(dbs.reduce((a, b) => a + b, 0) / dbs.length).toFixed(1) : null;
          return Object.assign({}, sc[i] || {}, { secs: +(g.t1 - g.t0).toFixed(1), beats: E.filter(e => e.w === 'his' && e.ev === 'beat' && inS(e)).length, chords: E.filter(e => e.w === 'his' && e.ev === 'chord' && inS(e)).length, harps: E.filter(e => e.w === 'his' && e.ev === 'harp' && inS(e)).length, dB: mean }); }),
        end: h.pauseT != null ? (h.dbAtPause != null && h.dbAtPause <= floor ? 'silence' : 'SOUND') : 'never', fader: gen.fader, errors: T.errors.length };
      return out;
    }
    if (cfg.expect === 'lyric') {   // (05.11) the five-stage arc: stages in order with their tempo and master, chords and harps per stage, the climax event, the end
      const sc = T.probes.filter(pr => pr.his && pr.his.stage !== undefined).map(pr => ({ t: pr.t, stage: pr.his.stage, bpm: pr.his.bpm, master: pr.his.master, p: pr.his.p, ph: pr.his.ph, ev: pr.his.ev, climaxAt: pr.his.climaxAt }));
      const stages = []; sc.forEach(x => { if (!stages.length || stages[stages.length - 1].stage !== x.stage) stages.push({ stage: x.stage, from: x.t, bpm: x.bpm, master: x.master, p: x.p }); });
      const byStage = {}; for (const st of stages) byStage[st.stage] = { chords: 0, harps: 0 };
      const stageAt = t => { let cur = null; for (const st of stages) { if (st.from <= t) cur = st.stage; } return cur; };
      E.filter(e => e.w === 'his' && (e.ev === 'chord' || e.ev === 'harp')).forEach(e => { const st = stageAt(e.t); if (st && byStage[st]) byStage[st][e.ev === 'chord' ? 'chords' : 'harps']++; });
      const climax = sc.find(x => x.climaxAt > 0);
      out.verdict = { stages: stages.map(x => x.stage + '@' + x.from + 's·' + x.bpm + 'bpm·' + x.master + '·p' + x.p), order: stages.map(x => x.stage).join('→'), byStage, climaxFired: !!climax, climaxT: climax ? climax.t : null,
        end: h.pauseT != null ? (h.dbAtPause != null && h.dbAtPause <= floor ? 'silence' : 'SOUND') : 'never', fader: gen.fader, errors: T.errors.length };
      return out;
    }
    if (cfg.expect === 'chords') {   // (05.11) the configurations are heard and shown: chords sounded, the inset stood while they rang, the plan's primes are 4k+1
      const insetSeen = T.probes.some(pr => pr.his && pr.his.inset); const plan = T.plan || {};
      out.verdict = { chords: h.chords, chordPrimes: h.chordPrimes, chordTypes: h.chordTypes, insetSeen, planPrimes: plan.ps, all4k1: (plan.ps || []).every(v => v % 4 === 1), hasMs: (T.probes[0] && T.probes[0].his && T.probes[0].his.hasMs) || null, verdictText: (h.chords > 0 && insetSeen) ? 'HEARD AND SHOWN' : (h.chords > 0 ? 'heard, inset NOT seen' : 'NO CHORD SOUNDED'), errors: T.errors.length };
      return out;
    }
    if (cfg.expect === 'p') {   // the prime left behind: the last probe's p on both sides and the next plan's primes
      const last = T.probes[T.probes.length - 1] || {}; const pl = (last.his && last.his.planP) || [];
      out.verdict = { pHis: last.his && last.his.p, pHer: last.her && last.her.p, planP: pl, bigPLeft: ((last.his && last.his.p) >= 5000) || pl.some(v => v >= 5000) ? 'BIG P LEFT' : 'none', errors: T.errors.length };
      return out;
    }
    out.verdict = { fader: h.gRef > 0 && h.gMin != null && h.gMin < 0.9 * h.gRef ? 'FADER ' + h.gMin + '/' + h.gRef : 'none',
      cutBeforeSilence: h.killsBeforeSilence.length, pausedAt: h.pauseT == null ? 'never' : (h.dbAtPause != null && h.dbAtPause <= floor ? 'silence' : 'SOUND ' + h.dbAtPause + ' dB'),
      pauseAfterSilence: (h.pauseT != null && h.silentT != null) ? +(h.pauseT - h.silentT).toFixed(2) : null, beatsAfterPark: h.beatsAfterPark, beatsAfterPause: h.beatsAfterPause,
      seamsWithEarlyBeat: h.seamsWithEarlyBeat + '/' + h.seams.length, seamLateMax: h.seamLateMax, restartOldBeats: h.restarts.length ? h.restarts.map(r => r.oldBeatsBeforeIt).join('+') : null, herPauseLag: (out.her && out.her.pauseT != null && h.pauseT != null) ? +(out.her.pauseT - h.pauseT).toFixed(2) : null, errors: T.errors.length };
    return out;
  };
  // compact raw samples, so a result can be re-analysed with a changed rule without re-running the scenario
  T.raw = () => T.cfg && T.cfg.mode === 'form' ? { rec: T.rec, ev: T.ev } : (T.rec || []).map(x => [x.t, x.H && x.H.p, x.H && x.H.bpm, x.H && x.H.ph, x.H && x.H.run && !x.H.pau ? 1 : 0, x.M && x.M.p, x.M && x.M.bpm, x.M && x.M.ph]);
  T.report = () => T.done ? T.result : { running: T.cfg && T.cfg.name, t: T.now(), samples: (T.rec || []).length };
  T.summary = r => r && r.verdict ? { name: r.name, verdict: r.verdict, hisPath: r.hisPath.slice(0, 8), herPath: r.herPath.slice(0, 10), p: r.p.episodes.slice(0, 4), tempo: r.tempo.episodes.slice(0, 4), section: r.section.episodes.slice(0, 5), rogue: r.rogue.slice(0, 4), errors: r.errors.slice(0, 4), restores: r.restores } : r;
  return 'harness loaded';
})();
