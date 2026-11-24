#!/usr/bin/env node
/**
 * IDA-6 Automation — Slack report image
 *
 * Reads dashboard/data.json (written by build-dashboard.js) and renders two
 * wide (landscape) PNGs for the Slack message. Wide images show large in
 * Slack; one tall image gets shrunk to a narrow strip.
 *
 *   1. Summary   OUT_FILE
 *        header, pass-rate gauge, count tiles with sparklines and change vs
 *        last run, results per run, module hotspots, failed tests
 *   2. Protocols PROTO_OUT_FILE  (only when the run has protocol tests)
 *        protocol x clinical-stage heat map, laid out in two columns once
 *        there are more than 10 protocols, with pass rate and trend
 *
 * Everything is drawn with plain HTML + SVG, so nothing is downloaded at
 * render time (no chart library, no CDN).
 *
 * Usage:
 *   node .github/dashboard/build-slack-image.js
 *
 * Env vars (all optional):
 *   DATA_FILE      default dashboard/data.json
 *   OUT_FILE       default dashboard/slack/board.png
 *   PROTO_OUT_FILE default: OUT_FILE with "-protocols" before .png
 *   HTML_OUT       also save the rendered HTML here (handy for tweaking the design)
 *   CHROMIUM_PATH  use this Chromium instead of Playwright's own
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = process.env.DATA_FILE || 'dashboard/data.json';
const OUT_FILE = process.env.OUT_FILE || 'dashboard/slack/board.png';
const PROTO_OUT_FILE = process.env.PROTO_OUT_FILE || OUT_FILE.replace(/\.png$/i, '') + '-protocols.png';
const HTML_OUT = process.env.HTML_OUT || '';

/* ------------------------------------------------------------------ *
 * Theme
 * ------------------------------------------------------------------ */

const C = {
  bg: '#080D1A',
  card: '#0F172A',
  card2: '#131D35',
  line: 'rgba(120,150,230,.16)',
  ink: '#E7ECF7',
  ink2: '#A9B4CC',
  muted: '#6E7A96',
  pass: '#22D3A0',
  fail: '#FF4D6D',
  flaky: '#FFB547',
  skip: '#7C8BA8',
  accent: '#5B8CFF',
  cyan: '#38BDF8',
};

const STAGES = [
  { key: 'qs', label: 'Questions' },
  { key: 'pe', label: 'Physical exam' },
  { key: 'mh', label: 'Medical history' },
  { key: 'vs', label: 'Visit summary' },
  { key: 'e2e', label: 'End-to-end' },
];

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const num = (v) => Number(v) || 0;
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));

function dur(ms) {
  ms = num(ms);
  if (ms < 1000) return ms + ' ms';
  const s = ms / 1000;
  if (s < 60) return s.toFixed(1) + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ' + Math.round(s % 60) + 's';
  return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
}

function rateColor(rate) {
  if (rate >= 98) return C.pass;
  if (rate >= 90) return C.flaky;
  return C.fail;
}

/** Readable test name: "TC_VM_022_Verify_Weight_Change_Yes" -> id "TC_VM_022", text "Weight Change Yes" */
function splitTitle(title) {
  const m = String(title).match(/^((?:TC_)?[A-Z]{1,4}_\d{2,4})_?(.*)$/);
  const id = m ? m[1] : '';
  const rest = (m ? m[2] : String(title)).replace(/^Verify_/i, '').replace(/_/g, ' ').trim();
  return { id, text: rest || String(title) };
}

/* ------------------------------------------------------------------ *
 * SVG pieces
 * ------------------------------------------------------------------ */

function polar(cx, cy, r, deg) {
  const a = (deg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arcPath(cx, cy, r, from, to) {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** 270° gauge: grey track, coloured value arc with glow, tick marks */
function gauge(rate, sub) {
  const size = 260, cx = 130, cy = 136, r = 104, start = -135, sweep = 270;
  const end = start + (sweep * Math.max(0, Math.min(100, rate))) / 100;
  const col = rateColor(rate);
  let ticks = '';
  for (let i = 0; i <= 10; i++) {
    const d = start + (sweep * i) / 10;
    const [a1, b1] = polar(cx, cy, r + 15, d);
    const [a2, b2] = polar(cx, cy, r + (i % 5 === 0 ? 24 : 20), d);
    ticks += `<line x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}" stroke="${C.muted}" stroke-width="${i % 5 === 0 ? 2 : 1}" opacity=".7"/>`;
  }
  return `<svg width="${size}" height="${size + 14}" viewBox="0 0 ${size} ${size + 14}">
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <linearGradient id="gg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${C.cyan}"/><stop offset="1" stop-color="${col}"/></linearGradient>
    </defs>
    ${ticks}
    <path d="${arcPath(cx, cy, r, start, start + sweep)}" fill="none" stroke="rgba(124,139,168,.18)" stroke-width="18" stroke-linecap="round"/>
    ${rate > 0 ? `<path d="${arcPath(cx, cy, r, start, Math.max(start + 0.5, end))}" fill="none" stroke="url(#gg)" stroke-width="18" stroke-linecap="round" filter="url(#glow)"/>` : ''}
    <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="52" font-weight="800" fill="${C.ink}" letter-spacing="-1">${rate}<tspan font-size="26" fill="${C.ink2}">%</tspan></text>
    <text x="${cx}" y="${cy + 34}" text-anchor="middle" font-size="14" fill="${C.ink2}" letter-spacing="3">PASS RATE</text>
    <text x="${cx}" y="${cy + 132}" text-anchor="middle" font-size="13" fill="${C.ink2}">${esc(sub)}</text>
  </svg>`;
}

/** Small line + soft area under it */
function sparkline(values, color, w = 150, h = 38, id = 's') {
  if (!values || values.length < 2) {
    return `<div class="spark-empty">—</div>`;
  }
  let lo = Math.min(...values), hi = Math.max(...values);
  if (hi === lo) { hi += 1; lo -= 1; }
  const x = (i) => 2 + i * ((w - 4) / (values.length - 1));
  const y = (v) => 4 + (h - 8) - ((v - lo) / (hi - lo)) * (h - 8);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `M ${x(0)},${h} L ${pts.split(' ').join(' L ')} L ${x(values.length - 1)},${h} Z`;
  const gid = 'sg' + id;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" fill="url(#${gid})"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(values.length - 1)}" cy="${y(values[values.length - 1])}" r="3.5" fill="${color}" stroke="${C.card}" stroke-width="2"/>
  </svg>`;
}

/** Stacked bars per run (passed / flaky / failed / skipped) with a pass-rate line on a second axis */
function trendChart(runs, w = 900, h = 300) {
  if (!runs.length) return `<div class="empty">Run history builds up from the next run.</div>`;
  const padL = 46, padR = 50, padT = 16, padB = 44;
  const iw = w - padL - padR, ih = h - padT - padB;
  const maxY = Math.max(5, ...runs.map((r) => num(r.total) || (num(r.passed) + num(r.failed) + num(r.flaky) + num(r.skipped))));
  const top = Math.ceil(maxY / 50) * 50 || 5;
  const rates = runs.map((r) => {
    const tot = num(r.total) - num(r.skipped);
    return tot > 0 ? pct(num(r.passed) + num(r.flaky), tot) : 0;
  });
  const rLo = Math.max(0, Math.min(90, Math.floor((Math.min(...rates) - 2) / 5) * 5));
  const slot = iw / runs.length;
  const bw = Math.min(46, slot * 0.56);
  const y = (v) => padT + ih - (v / top) * ih;
  const yr = (v) => padT + ih - ((v - rLo) / (100 - rLo)) * ih;
  const cx = (i) => padL + slot * i + slot / 2;

  let grid = '';
  for (let g = 0; g <= 4; g++) {
    const v = Math.round((top / 4) * g), gy = y(v);
    const rv = Math.round(rLo + ((100 - rLo) / 4) * g);
    grid += `<line x1="${padL}" y1="${gy}" x2="${w - padR}" y2="${gy}" stroke="${C.line}" stroke-dasharray="3 5"/>` +
      `<text x="${padL - 10}" y="${gy + 4}" text-anchor="end" font-size="11" fill="${C.muted}">${v}</text>` +
      `<text x="${w - padR + 10}" y="${gy + 4}" font-size="11" fill="${C.cyan}">${rv}%</text>`;
  }

  const bars = runs.map((r, i) => {
    const parts = [['passed', C.pass], ['flaky', C.flaky], ['failed', C.fail], ['skipped', C.skip]];
    let acc = 0, out = '';
    const last = i === runs.length - 1;
    for (const [k, col] of parts) {
      const v = num(r[k]);
      if (!v) continue;
      const y1 = y(acc + v), y0 = y(acc);
      out += `<rect x="${cx(i) - bw / 2}" y="${y1}" width="${bw}" height="${Math.max(1.5, y0 - y1)}" fill="${col}" opacity="${last ? 1 : 0.78}"/>`;
      acc += v;
    }
    const label = `<text x="${cx(i)}" y="${h - 24}" text-anchor="middle" font-size="12" fill="${last ? C.ink : C.muted}" font-weight="${last ? 700 : 400}">#${esc(r.run)}</text>` +
      `<text x="${cx(i)}" y="${h - 9}" text-anchor="middle" font-size="10" fill="${C.muted}">${esc(String(r.date || '').slice(5))}</text>`;
    const fails = num(r.failed) ? `<text x="${cx(i)}" y="${y(acc) - 7}" text-anchor="middle" font-size="11" font-weight="700" fill="${C.fail}">${num(r.failed)}</text>` : '';
    return out + fails + label;
  }).join('');

  const line = rates.map((v, i) => `${cx(i)},${yr(v)}`).join(' ');
  const dots = rates.map((v, i) => `<circle cx="${cx(i)}" cy="${yr(v)}" r="4.5" fill="${C.card}" stroke="${C.cyan}" stroke-width="2.5"/>`).join('');

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><filter id="lg" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    ${grid}${bars}
    ${runs.length > 1 ? `<polyline points="${line}" fill="none" stroke="${C.cyan}" stroke-width="2.5" filter="url(#lg)"/>` : ''}
    ${dots}
  </svg>`;
}

/* ------------------------------------------------------------------ *
 * Build the page
 * ------------------------------------------------------------------ */

function buildHtml(data, mode) {
  mode = mode || 'summary';
  const meta = data.meta || {};
  const t = data.totals || {};
  // Runs with no results (e.g. a run where every shard failed to start) would
  // show as a fake drop to 0, so leave them out of the history.
  const trend = (data.trend || []).filter((p) => num(p.total) > 0).slice(-10);
  const modules = data.modules || [];
  const protocols = data.protocols || [];
  const tests = data.tests || [];

  const total = num(t.total), passed = num(t.passed), failed = num(t.failed), flaky = num(t.flaky), skipped = num(t.skipped);
  const executed = total - skipped;
  const rate = num(t.passRate) || pct(passed + flaky, executed);

  const cur = num(meta.runNumber);
  const prev = trend.filter((p) => num(p.run) < cur).slice(-1)[0] || null;
  const prevRate = prev ? pct(num(prev.passed) + num(prev.flaky), num(prev.total) - num(prev.skipped)) : null;
  const series = (k) => trend.map((p) => num(p[k]));

  const delta = (now, before, worseUp) => {
    if (before == null) return '<span class="dl">first run</span>';
    const d = Math.round((now - before) * 10) / 10;
    if (!d) return `<span class="dl">= vs #${esc(prev.run)}</span>`;
    const cls = worseUp == null ? 'nt' : ((d > 0) === worseUp ? 'bd' : 'gd');
    return `<span class="dl ${cls}">${d > 0 ? '▲' : '▼'} ${Math.abs(d)}</span><span class="dl"> vs #${esc(prev.run)}</span>`;
  };

  /* header status */
  const status = failed
    ? { cls: 'bad', text: failed + ' FAILED' }
    : { cls: 'good', text: 'ALL PASSED' };

  const failingProtocols = protocols.filter((p) => p.failed > 0);
  const verdict = failed
    ? `${failed} failed test${failed === 1 ? '' : 's'}` +
      (protocols.length ? ` · ${failingProtocols.length} of ${protocols.length} protocols need attention` : '')
    : `All ${executed} executed tests passed${flaky ? ` (${flaky} after retry)` : ''}`;

  /* count tiles */
  const tiles = [
    { label: 'Total tests', v: total, sub: pct(executed, total) + '% ran', col: C.accent, d: delta(total, prev && num(prev.total), null), s: series('total') },
    { label: 'Passed', v: passed, sub: pct(passed, total) + '%', col: C.pass, d: delta(passed, prev && num(prev.passed), false), s: series('passed') },
    { label: 'Failed', v: failed, sub: pct(failed, total) + '%', col: C.fail, d: delta(failed, prev && num(prev.failed), true), s: series('failed') },
    { label: 'Flaky', v: flaky, sub: pct(flaky, total) + '%', col: C.flaky, d: delta(flaky, prev && num(prev.flaky), true), s: series('flaky') },
    { label: 'Skipped', v: skipped, sub: pct(skipped, total) + '%', col: C.skip, d: delta(skipped, prev && num(prev.skipped), true), s: series('skipped') },
  ].map((x, i) => `
    <div class="tile" style="--c:${x.col}">
      <div class="tl">${x.label}</div>
      <div class="tv">${x.v}<span class="ts">${esc(x.sub)}</span></div>
      <div class="td">${x.d}</div>
      <div class="tsp">${sparkline(x.s, x.col, 170, 40, 't' + i)}</div>
    </div>`).join('');

  /* status split bar */
  const split = [['Passed', passed, C.pass], ['Failed', failed, C.fail], ['Flaky', flaky, C.flaky], ['Skipped', skipped, C.skip]];
  const splitBar = `<div class="split">${split.map(([, n, c]) => n ? `<i style="width:${(n / (total || 1)) * 100}%;background:${c};box-shadow:0 0 12px ${c}66"></i>` : '').join('')}</div>
    <div class="splitkey">${split.map(([l, n, c]) => `<span><b style="background:${c}"></b>${l} <em>${n}</em> <u>${pct(n, total)}%</u></span>`).join('')}</div>`;

  /* module hotspots */
  const hot = modules.slice().sort((a, b) => num(b.failed) - num(a.failed) || num(a.passRate) - num(b.passRate) || num(b.total) - num(a.total)).slice(0, 8);
  const hotRows = hot.map((m) => {
    const tot = num(m.total) || 1;
    const w = (n) => (num(n) / tot) * 100;
    return `<div class="hrow">
      <div class="hn">${esc(clip(m.name, 34))}</div>
      <div class="hb"><i style="width:${w(m.passed)}%;background:${C.pass}"></i><i style="width:${w(m.flaky)}%;background:${C.flaky}"></i><i style="width:${w(m.failed)}%;background:${C.fail}"></i></div>
      <div class="hv">${num(m.failed) ? `<span style="color:${C.fail}">${num(m.failed)} ✕</span>` : `<span style="color:${C.pass}">✓</span>`}</div>
      <div class="hr" style="color:${rateColor(num(m.passRate))}">${num(m.passRate)}%</div>
    </div>`;
  }).join('');

  /* protocol heat map */
  const protoKpis = (() => {
    if (!protocols.length) return '';
    const green = protocols.length - failingProtocols.length;
    const withE2e = protocols.filter((p) => p.stages && p.stages.e2e && p.stages.e2e.total);
    const e2eOk = withE2e.filter((p) => !p.stages.e2e.failed).length;
    const ptot = protocols.reduce((a, p) => a + num(p.total), 0);
    const pok = protocols.reduce((a, p) => a + num(p.passed) + num(p.flaky), 0);
    const pskip = protocols.reduce((a, p) => a + num(p.skipped), 0);
    const items = [
      ['Protocols', protocols.length, C.ink],
      ['Fully passing', green, C.pass],
      ['With failures', failingProtocols.length, failingProtocols.length ? C.fail : C.pass],
      ['Protocol pass rate', pct(pok, ptot - pskip) + '%', rateColor(pct(pok, ptot - pskip))],
      ['End-to-end visits', e2eOk + '/' + withE2e.length, withE2e.length && e2eOk < withE2e.length ? C.fail : C.pass],
    ];
    return `<div class="pk">${items.map(([l, v, c]) => `<div><span>${l}</span><b style="color:${c}">${v}</b></div>`).join('')}</div>`;
  })();

  const twoCols = protocols.length > 10;
  const nameMax = twoCols ? 26 : 30;
  const sparkW = twoCols ? 84 : 120;
  const protoRowList = protocols.map((p, i) => {
    const cells = STAGES.map((s) => {
      const st = (p.stages || {})[s.key] || { total: 0 };
      if (!st.total) return `<div class="cell na">—</div>`;
      const ok = num(st.passed) + num(st.flaky), ex = num(st.total) - num(st.skipped);
      if (st.failed) {
        const sev = Math.min(1, num(st.failed) / Math.max(1, ex));
        return `<div class="cell bad" style="background:rgba(255,77,109,${(0.18 + sev * 0.5).toFixed(2)})"><b>${num(st.failed)} ✕</b><small>${ok}/${ex}</small></div>`;
      }
      if (st.flaky) return `<div class="cell fl"><b>${num(st.flaky)} ~</b><small>${ok}/${ex}</small></div>`;
      return `<div class="cell ok"><b>✓</b><small>${ok}/${ex}</small></div>`;
    }).join('');
    const pts = trend.filter((x) => x.protocols && x.protocols[p.name] != null).map((x) => num(x.protocols[p.name]));
    const col = rateColor(num(p.passRate));
    return `<div class="prow">
      <div class="pn"><b>${esc(clip(p.name, nameMax))}</b><small>${num(p.total)} tests${num(p.failed) ? ` · <span style="color:${C.fail}">${num(p.failed)} failed</span>` : ''}${num(p.flaky) ? ` · ${num(p.flaky)} flaky` : ''}</small></div>
      ${cells}
      <div class="pr"><div class="prb"><i style="width:${num(p.passRate)}%;background:${col};box-shadow:0 0 10px ${col}88"></i></div><b style="color:${col}">${num(p.passRate)}%</b></div>
      <div class="psp">${sparkline(pts, col, sparkW, 30, 'p' + i)}</div>
    </div>`;
  });
  const STAGE_SHORT = { qs: 'Questions', pe: 'Phys. exam', mh: 'Med. history', vs: 'Visit summary', e2e: 'End-to-end' };
  const phead = `<div class="phead"><div>Protocol</div>${STAGES.map((s) => `<div>${twoCols ? STAGE_SHORT[s.key] : s.label}</div>`).join('')}<div>Pass rate</div><div>Trend</div></div>`;
  const half = Math.ceil(protoRowList.length / 2);
  const protoTable = twoCols
    ? `<div class="pcols"><div>${phead}${protoRowList.slice(0, half).join('')}</div><div>${phead}${protoRowList.slice(half).join('')}</div></div>`
    : phead + protoRowList.join('');

  /* failed tests list */
  const failedTests = tests.filter((x) => x.status === 'unexpected')
    .sort((a, b) => (a.protocol ? 0 : 1) - (b.protocol ? 0 : 1) || String(a.protocol || a.module).localeCompare(String(b.protocol || b.module)) || String(a.title).localeCompare(String(b.title)));
  const FAIL_MAX = 12;
  const stageName = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));
  const failRowsList = failedTests.slice(0, FAIL_MAX).map((x) => {
    const n = splitTitle(x.title);
    return `<div class="frow">
      <span class="fd"></span>
      <span class="fid">${esc(n.id)}</span>
      <span class="ft">${esc(clip(n.text, 44))}</span>
      <span class="ftag">${esc(clip(x.protocol || x.module, 22))}</span>
      ${x.stage ? `<span class="ftag dim">${esc(stageName[x.stage] || '')}</span>` : '<span></span>'}
    </div>`;
  });
  const failRows = `<div class="flist">${failRowsList.join('')}</div>` +
    (failedTests.length > FAIL_MAX ? `<div class="fmore">+ ${failedTests.length - FAIL_MAX} more failed tests on the dashboard</div>` : '');

  const flakyCount = tests.filter((x) => x.status === 'flaky').length;

  /* run facts */
  const chips = [
    ['Branch', meta.branch], ['Environment', meta.environment], ['Browser', 'Chromium'],
    ['Triggered by', meta.actor], ['Executed', meta.runTime],
    ['Wall clock', data.stats && data.stats.wallClock ? dur(data.stats.wallClock) : ''],
  ].filter(([, v]) => v).map(([l, v]) => `<span class="chip"><i>${l}</i>${esc(v)}</span>`).join('');

  const runsForTrend = trend.length ? trend : [{ run: meta.runNumber, date: '', passed, failed, flaky, skipped, total }];

  const summaryBody = `
    <div class="ov">
      <div class="card gaugec">
        ${gauge(rate, `${passed + flaky} of ${executed} executed passed`)}
        <div class="gd">${delta(rate, prevRate, false)}</div>
      </div>
      <div class="card">
        <div class="verdict"><b style="background:${failed ? C.fail : C.pass}">${failed ? '!' : '✓'}</b>${esc(verdict)}</div>
        ${splitBar}
        <div class="tiles">${tiles}</div>
      </div>
    </div>

    <div class="row2">
      <div class="card">
        <div class="ct">Results per run<em>last ${runsForTrend.length} run${runsForTrend.length === 1 ? '' : 's'}</em></div>
        ${trendChart(runsForTrend, 870, 290)}
        <div class="legend"><span><b style="background:${C.pass}"></b>Passed</span><span><b style="background:${C.flaky}"></b>Flaky</span><span><b style="background:${C.fail}"></b>Failed</span><span><b style="background:${C.skip}"></b>Skipped</span><span><b class="ln" style="background:${C.cyan}"></b>Pass rate (right axis)</span></div>
      </div>
      <div class="card">
        <div class="ct">Module hotspots<em>${modules.length} modules · ranked by failures</em></div>
        ${hotRows || '<div class="empty">No modules in this run.</div>'}
      </div>
    </div>

    <div class="card">
      <div class="ct">Failed tests<em>${failedTests.length} failed${flakyCount ? ` · ${flakyCount} flaky` : ''}</em></div>
      ${failedTests.length ? failRows : `<div class="allgood"><b>✓</b>No failed tests in this run${flakyCount ? ` — ${flakyCount} passed on retry` : ''}.</div>`}
    </div>

`;

  const protoBody = `
    ${protocols.length ? `
    <div class="card">
      <div class="ct">Protocol validation<em>${failingProtocols.length ? `${failingProtocols.length} of ${protocols.length} protocols need attention` : `all ${protocols.length} protocols passing`}</em></div>
      ${protoKpis}
      ${protoTable}
      <div class="pfoot"><span>Each cell = tests in that clinical stage</span><span>Trend — = history builds from the next run</span><span><span style="color:${C.pass}">✓</span> all passed</span><span><span style="color:${C.fail}">✕</span> failed (deeper red = bigger share failing)</span><span><span style="color:${C.flaky}">~</span> flaky</span><span>— no tests</span></div>
    </div>` : ''}

`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${C.bg};font-family:Inter,"Segoe UI",system-ui,-apple-system,Helvetica,Arial,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased}
  #board{width:${mode === 'protocols' && twoCols ? 1900 : 1600}px;padding:28px 30px 26px;position:relative;overflow:hidden;
    background:
      radial-gradient(900px 420px at 8% -8%, rgba(91,140,255,.22), transparent 60%),
      radial-gradient(700px 380px at 105% 10%, rgba(56,189,248,.14), transparent 60%),
      linear-gradient(${C.line} 1px, transparent 1px) 0 0/40px 40px,
      linear-gradient(90deg, ${C.line} 1px, transparent 1px) 0 0/40px 40px,
      ${C.bg};}
  #board::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg, rgba(8,13,26,.55), rgba(8,13,26,.92) 40%);pointer-events:none}
  #board>*{position:relative}
  .card{background:linear-gradient(180deg, rgba(19,29,53,.92), rgba(15,23,42,.94));border:1px solid ${C.line};border-radius:16px;padding:18px 20px;box-shadow:0 0 0 1px rgba(0,0,0,.2), 0 18px 40px rgba(0,0,0,.35)}
  .ct{display:flex;align-items:center;gap:10px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:${C.ink2};font-weight:700;margin-bottom:14px}
  .ct::before{content:"";width:8px;height:8px;border-radius:2px;background:${C.cyan};box-shadow:0 0 10px ${C.cyan}}
  .ct em{margin-left:auto;font-style:normal;letter-spacing:.02em;text-transform:none;font-weight:500;color:${C.muted};font-size:13px}

  /* header */
  .hdr{display:flex;align-items:center;gap:20px;margin-bottom:18px}
  .logo{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;font-weight:900;font-size:18px;color:#fff;
    background:linear-gradient(135deg, ${C.accent}, ${C.cyan});box-shadow:0 0 24px rgba(91,140,255,.55)}
  .ttl small{display:block;font-size:12px;letter-spacing:.24em;color:${C.cyan};font-weight:700;margin-bottom:3px}
  .ttl h1{font-size:30px;font-weight:800;letter-spacing:-.02em}
  .ttl h1 span{color:${C.ink2};font-weight:500}
  .stat{margin-left:auto;padding:10px 20px;border-radius:999px;font-weight:800;letter-spacing:.12em;font-size:16px;display:flex;align-items:center;gap:10px}
  .stat::before{content:"";width:10px;height:10px;border-radius:50%;background:currentColor;box-shadow:0 0 12px currentColor}
  .stat.bad{color:${C.fail};background:rgba(255,77,109,.12);border:1px solid rgba(255,77,109,.45);box-shadow:0 0 28px rgba(255,77,109,.25)}
  .stat.good{color:${C.pass};background:rgba(34,211,160,.12);border:1px solid rgba(34,211,160,.45);box-shadow:0 0 28px rgba(34,211,160,.25)}
  .chips{display:flex;flex-wrap:wrap;gap:8px;margin:-4px 0 18px}
  .chip{font-size:13px;color:${C.ink};background:rgba(91,140,255,.08);border:1px solid ${C.line};border-radius:8px;padding:6px 11px}
  .chip i{font-style:normal;color:${C.muted};margin-right:7px}

  /* overview */
  .ov{display:grid;grid-template-columns:300px 1fr;gap:18px;margin-bottom:18px}
  .gaugec{display:flex;flex-direction:column;align-items:center;justify-content:center}
  .gaugec .gd{font-size:13px;margin-top:-4px}
  .verdict{font-size:19px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:10px}
  .verdict b{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:15px;color:#0B1020}
  .split{display:flex;height:14px;border-radius:7px;overflow:hidden;background:rgba(124,139,168,.18)}
  .split i{display:block;height:100%}
  .splitkey{display:flex;gap:24px;margin:10px 0 16px;font-size:14px;color:${C.ink2}}
  .splitkey b{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:7px;vertical-align:-1px}
  .splitkey em{font-style:normal;color:${C.ink};font-weight:700;margin:0 4px}
  .splitkey u{text-decoration:none;color:${C.muted}}
  .tiles{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
  .tile{background:rgba(8,13,26,.55);border:1px solid ${C.line};border-radius:12px;padding:12px 14px 6px;position:relative;overflow:hidden}
  .tile::before{content:"";position:absolute;left:0;top:0;right:0;height:3px;background:var(--c);box-shadow:0 0 14px var(--c)}
  .tl{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${C.ink2};font-weight:600}
  .tv{font-size:36px;font-weight:800;letter-spacing:-.02em;margin-top:2px;line-height:1.1}
  .ts{font-size:15px;font-weight:700;color:var(--c);margin-left:9px;letter-spacing:0}
  .td{font-size:12.5px;margin-top:2px;min-height:18px}
  .dl{color:${C.muted}} .dl.bd{color:${C.fail};font-weight:700} .dl.gd{color:${C.pass};font-weight:700} .dl.nt{color:${C.ink2};font-weight:700}
  .tsp{margin-top:4px;height:42px}
  .spark-empty{font-size:14px;color:${C.muted};padding-top:8px;text-align:center}

  /* trend + hotspots */
  .row2{display:grid;grid-template-columns:1.45fr 1fr;gap:18px;margin-bottom:18px}
  .legend{display:flex;gap:18px;font-size:12.5px;color:${C.ink2};margin-top:4px}
  .legend b{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-2px}
  .legend .ln{width:18px;height:3px;border-radius:2px;vertical-align:3px}
  .hrow{display:grid;grid-template-columns:210px 1fr 48px 62px;align-items:center;gap:12px;padding:8px 0;border-bottom:1px dashed ${C.line}}
  .hrow:last-child{border-bottom:0}
  .hn{font-size:14px;color:${C.ink};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .hb{display:flex;height:10px;border-radius:5px;overflow:hidden;background:rgba(124,139,168,.15)}
  .hb i{display:block;height:100%}
  .hv{font-size:13px;font-weight:800;text-align:right}
  .hr{font-size:14px;font-weight:800;text-align:right}

  /* protocols */
  .pk{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:14px}
  .pk div{background:rgba(8,13,26,.55);border:1px solid ${C.line};border-radius:10px;padding:10px 14px;display:flex;flex-direction:column}
  .pk span{font-size:12px;color:${C.ink2};letter-spacing:.06em;text-transform:uppercase}
  .pk b{font-size:26px;font-weight:800}
  .phead,.prow{display:grid;grid-template-columns:270px repeat(5,1fr) 190px 130px;gap:8px;align-items:center}
  .pcols{display:grid;grid-template-columns:1fr 1fr;gap:34px}
  .pcols .phead,.pcols .prow{grid-template-columns:205px repeat(5,1fr) 128px 90px;gap:6px}
  .pcols .phead{font-size:11px;letter-spacing:.06em}
  .pcols .pr b{min-width:50px;font-size:14px}
  .phead{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:${C.muted};font-weight:700;padding:0 0 8px}
  .phead div{text-align:center} .phead div:first-child{text-align:left}
  .prow{padding:6px 0;border-top:1px solid ${C.line}}
  .pn{min-width:0}
  .pn b{display:block;font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pn small{font-size:12.5px;color:${C.muted}}
  .cell{height:44px;border-radius:9px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid transparent}
  .cell b{font-size:15px;font-weight:800;line-height:1.1} .cell small{font-size:11px;opacity:.8}
  .cell.ok{background:rgba(34,211,160,.10);border-color:rgba(34,211,160,.28);color:${C.pass}}
  .cell.bad{border-color:rgba(255,77,109,.6);color:#FFE3E8;box-shadow:inset 0 0 14px rgba(255,77,109,.25)}
  .cell.fl{background:rgba(255,181,71,.13);border-color:rgba(255,181,71,.45);color:${C.flaky}}
  .cell.na{background:rgba(124,139,168,.06);color:${C.muted}}
  .pr{display:flex;align-items:center;gap:10px;padding-left:6px}
  .pr b{font-size:15px;font-weight:800;min-width:54px;text-align:right}
  .prb{flex:1;height:8px;border-radius:4px;background:rgba(124,139,168,.18);overflow:hidden}
  .prb i{display:block;height:100%;border-radius:4px}
  .psp{display:flex;justify-content:center}
  .pfoot{display:flex;gap:18px;font-size:12px;color:${C.muted};margin-top:12px}

  /* failures */
  .flist{display:grid;grid-template-columns:1fr 1fr;column-gap:34px}
  .frow{display:grid;grid-template-columns:12px 96px 1fr auto auto;gap:12px;align-items:center;padding:8px 0;border-bottom:1px dashed ${C.line};font-size:14px}
  .fd{width:9px;height:9px;border-radius:50%;background:${C.fail};box-shadow:0 0 10px ${C.fail}}
  .fid{font-family:ui-monospace,Menlo,Consolas,monospace;color:${C.cyan};font-size:13px}
  .ft{color:${C.ink};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ftag{font-size:12px;padding:3px 9px;border-radius:6px;background:rgba(255,77,109,.12);border:1px solid rgba(255,77,109,.35);color:#FFC2CD;white-space:nowrap}
  .ftag.dim{background:rgba(124,139,168,.1);border-color:${C.line};color:${C.ink2}}
  .fmore{font-size:13px;color:${C.muted};padding-top:10px}
  .allgood{display:flex;align-items:center;gap:14px;font-size:17px;color:${C.pass};padding:14px 0}
  .allgood b{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:rgba(34,211,160,.15);border:1px solid rgba(34,211,160,.5);box-shadow:0 0 20px rgba(34,211,160,.35)}
  .empty{color:${C.muted};font-size:14px;padding:30px 0;text-align:center}

  .foot{display:flex;gap:22px;flex-wrap:wrap;font-size:12.5px;color:${C.muted};margin-top:16px}
  .foot b{color:${C.ink2};font-weight:600}
  </style></head><body>
  <div id="board">

    <div class="hdr">
      <div class="logo">QA</div>
      <div class="ttl"><small>${esc(String(meta.project || 'IDA-6 Automation').toUpperCase())} · TEST REPORT</small>
        <h1>Run #${esc(meta.runNumber)} <span>· ${mode === 'protocols' ? 'Protocol validation' : esc(meta.branch || '')}</span></h1></div>
      <div class="stat ${status.cls}">${status.text}</div>
    </div>
    <div class="chips">${chips}</div>

    ${mode === 'protocols' ? protoBody : summaryBody}

    <div class="foot">
      ${meta.commitSha ? `<span>Commit <b>${esc(meta.commitSha)}</b>${meta.commitMessage ? ' — ' + esc(clip(meta.commitMessage, 90)) : ''}</span>` : ''}
      <span>Execution time <b>${dur(t.duration)}</b> (sum of tests)</span>
      ${meta.baseUrl ? `<span>Base URL <b>${esc(meta.baseUrl)}</b></span>` : ''}
    </div>
  </div>
  </body></html>`;
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

async function render(page, html, out, width) {
  await page.setViewportSize({ width, height: 1200 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await (await page.$('#board')).screenshot({ path: out });
  const box = await (await page.$('#board')).boundingBox();
  console.log('🖼️ Slack image written:', out, fs.statSync(out).size, 'bytes', Math.round(box.width) + 'x' + Math.round(box.height));
}

async function main() {
  if (!fs.existsSync(DATA_FILE)) {
    console.log(`ℹ️ ${DATA_FILE} not found — no Slack image.`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const summaryHtml = buildHtml(data, 'summary');
  const hasProtocols = (data.protocols || []).length > 0;
  const protoHtml = hasProtocols ? buildHtml(data, 'protocols') : '';
  if (HTML_OUT) {
    fs.writeFileSync(HTML_OUT, summaryHtml);
    if (hasProtocols) fs.writeFileSync(HTML_OUT.replace(/\.html?$/i, '') + '-protocols.html', protoHtml);
  }

  let chromium;
  try { ({ chromium } = require('@playwright/test')); }
  catch (e) { ({ chromium } = require('playwright')); }

  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1.25 });

  await render(page, summaryHtml, OUT_FILE, 1600);
  if (hasProtocols) {
    await render(page, protoHtml, PROTO_OUT_FILE, (data.protocols || []).length > 10 ? 1900 : 1600);
  } else if (fs.existsSync(PROTO_OUT_FILE)) {
    fs.unlinkSync(PROTO_OUT_FILE);
  }
  await browser.close();
}

main().catch((e) => {
  console.log('⚠️ Could not render Slack image:', e.message);
  process.exit(0);
});