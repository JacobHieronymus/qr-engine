// QR Engine — headless silent runner (29.10). Serves the kit root with the muting script injected into every
// HTML page (the same script serve_muted.py injects: all Web Audio into a zero gain, speech stubbed), starts
// Google Chrome headless with --mute-audio and no background throttling, loads duet-harness.js into the
// conductor's page and runs the scenarios one by one. Nothing is heard; nothing needs the Browser pane.
//   deno run -A tests/run-headless.ts <page under the kit root> <scenarios.json> <out.json>
const KIT = new URL('..', import.meta.url).pathname;
const MUTE = Deno.readTextFileSync(new URL('./mute-inject.html', import.meta.url));
const [PAGE, SCEN, OUT] = Deno.args;
const scenarios = JSON.parse(Deno.readTextFileSync(SCEN));
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const TYPES: Record<string, string> = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', css: 'text/css', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', webm: 'video/webm', mp3: 'audio/mpeg', wav: 'audio/wav', woff2: 'font/woff2' };
const ac = new AbortController();
const server = Deno.serve({ port: 0, hostname: '127.0.0.1', signal: ac.signal, onListen() {} }, async (req) => {
  const u = new URL(req.url); let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
  const f = KIT + p.replace(/^\/+/, ''); const ext = (f.split('.').pop() || '').toLowerCase();
  try {
    const b = await Deno.readFile(f);
    if (ext === 'html') { const s = new TextDecoder().decode(b); const i = s.indexOf('<head>'); const o = i >= 0 ? s.slice(0, i + 6) + MUTE + s.slice(i + 6) : MUTE + s; return new Response(o, { headers: { 'content-type': TYPES.html, 'cache-control': 'no-store' } }); }
    return new Response(b, { headers: { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': 'no-store' } });
  } catch { return new Response('not found', { status: 404 }); }
});
const port = (server.addr as Deno.NetAddr).port;
const prof = Deno.env.get('QRT_TMP') ? Deno.env.get('QRT_TMP') + '/chrome-' + port : await Deno.makeTempDir({ prefix: 'qrt-chrome-' });
await Deno.mkdir(prof, { recursive: true });
const chrome = new Deno.Command('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', {
  args: ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${prof}`, '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion',
    '--no-first-run', '--no-default-browser-check', '--window-size=1400,900', 'about:blank'], stderr: 'piped', stdout: 'null' }).spawn();
let wsUrl = ''; { const rd = chrome.stderr.pipeThrough(new TextDecoderStream()).getReader(); let buf = '';
  while (!wsUrl) { const { value, done } = await rd.read(); if (done) break; buf += value; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) wsUrl = m[1]; }
  (async () => { try { while (!(await rd.read()).done) {} } catch {} })(); }
if (!wsUrl) { console.error('no devtools url'); Deno.exit(2); }
const ws = new WebSocket(wsUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map<number, { res: (v: any) => void, rej: (e: any) => void }>(); const exceptions: any[] = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data as string);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id)!; pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') exceptions.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0, 300)); };
const send = (method: string, params: any = {}, sessionId?: string) => new Promise<any>((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId); await send('Runtime.enable', {}, sessionId);
try { await send('Emulation.setFocusEmulationEnabled', { enabled: true }, sessionId); } catch {}
const ev = async (expr: string) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true }, sessionId);
  if (r.exceptionDetails) throw new Error(String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 500)); return r.result.value; };
async function load(page: string) {
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/${page}` }, sessionId);
  for (let i = 0; i < 60; i++) { await sleep(500); try { if (await ev(`document.readyState==='complete' && !!window._qrDuo && !!document.getElementById('engine-play')`)) break; } catch {} }
  await sleep(1500);
  return await ev(`(async()=>{ eval(await (await fetch('/tests/duet-harness.js?'+Date.now())).text()); return typeof window.__QRT; })()`);
}
const results: any[] = []; const raws: any[] = []; const t0 = Date.now();
console.log(`page ${PAGE} · ${scenarios.length} scenarios · port ${port}`);
let loaded = '';
for (const sc of scenarios) {
  const page = sc.page || PAGE;
  // every scenario starts from a freshly loaded page (no mode, pin, ratio or paused prime left over from the one before)
  if (sc.reload !== false) { await load(page); loaded = page; }
  const t1 = Date.now(); exceptions.length = 0;
  let res: any;
  try {
    await ev(`__QRT.start(${JSON.stringify(sc)})`);
    const lim = ((sc.secs || 60) + 90) * 1000;
    while (Date.now() - t1 < lim) { await sleep(3000); if (await ev('__QRT.done')) break; }
    res = await ev('__QRT.done ? __QRT.result : {name:' + JSON.stringify(sc.name) + ', error:"timeout", rep:__QRT.report()}');
  } catch (e) { res = { name: sc.name, error: String(e) }; }
  res.pageExceptions = exceptions.slice(0, 10); res.page = page; res.wallSecs = Math.round((Date.now() - t1) / 1000);
  try { raws.push({ name: sc.name, raw: await ev('__QRT.raw()') }); Deno.writeTextFileSync(OUT.replace(/\.json$/, '.raw.json'), JSON.stringify(raws)); } catch {}
  results.push(res);
  Deno.writeTextFileSync(OUT, JSON.stringify({ page: PAGE, at: new Date().toISOString(), results }, null, 1));
  console.log(`  ${sc.name}: ${JSON.stringify(res.verdict || res.error)}  (${res.wallSecs}s)`);
}
console.log(`done in ${Math.round((Date.now() - t0) / 1000)} s → ${OUT}`);
try { ws.close(); } catch {} try { chrome.kill('SIGTERM'); } catch {} ac.abort();
try { await chrome.status; } catch {} try { if (!Deno.env.get('QRT_TMP')) await Deno.remove(prof, { recursive: true }); } catch {}
Deno.exit(0);
