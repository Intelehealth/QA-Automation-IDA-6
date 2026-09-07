#!/usr/bin/env node
/**
 * IDA-6 Automation — Dashboard generator
 *
 * Reads Playwright's results.json (json reporter) and produces a
 * self-contained HTML dashboard at public/index.html.
 *
 * Usage:
 *   node .github/dashboard/generate-dashboard.js
 *
 * Env vars (all optional, filled in by GitHub Actions):
 *   RESULTS_FILE, OUT_DIR, TREND_FILE, PROJECT_NAME, REPO, BRANCH, ACTOR,
 *   RUN_NUMBER, RUN_URL, COMMIT_SHA, COMMIT_MESSAGE, COMMIT_URL,
 *   ALLURE_URL, BASE_URL, ENVIRONMENT
 */

const fs = require('fs');
const path = require('path');

const RESULTS_FILE = process.env.RESULTS_FILE || 'results.json';
const OUT_DIR = process.env.OUT_DIR || 'public';
const TREND_FILE = process.env.TREND_FILE || 'trend.json';
const MAX_TREND_POINTS = 20;

const meta = {
  project: process.env.PROJECT_NAME || 'IDA-6 Automation',
  repo: process.env.REPO || '',
  branch: process.env.BRANCH || '',
  actor: process.env.ACTOR || '',
  runNumber: process.env.RUN_NUMBER || '0',
  runUrl: process.env.RUN_URL || '#',
  commitSha: (process.env.COMMIT_SHA || '').slice(0, 7),
  commitMessage: (process.env.COMMIT_MESSAGE || '').split('\n')[0],
  commitUrl: process.env.COMMIT_URL || '#',
  allureUrl: process.env.ALLURE_URL || 'allure/',
  baseUrl: process.env.BASE_URL || 'https://dev.intelehealth.org',
  environment: process.env.ENVIRONMENT || 'DEV',
  generatedAt: new Date().toISOString(),
};

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return String(str || '').replace(/\u001b\[[0-9;]*m/g, '');
}

function titleCase(str) {
  return String(str)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Module name resolution order:
 *   1. A tag written as @module:Start Visit  (or @module=StartVisit)
 *   2. The outermost describe() block inside the spec file
 *   3. The spec file name, prettified  (start-visit.spec.js -> "Start Visit")
 */
function resolveModule(fileTitle, describeChain, tags) {
  const tagged = (tags || [])
    .map((t) => String(t))
    .find((t) => /^@?module[:=]/i.test(t));

  if (tagged) return titleCase(tagged.replace(/^@?module[:=]/i, ''));
  if (describeChain.length) return describeChain[0];

  const base = path.basename(fileTitle || 'unknown')
    .replace(/\.(spec|test)\.(t|j)sx?$/i, '')
    .replace(/\.(t|j)sx?$/i, '');

  return titleCase(base);
}

/* ------------------------------------------------------------------ *
 * Parse results.json
 * ------------------------------------------------------------------ */

function readResults() {
  if (!fs.existsSync(RESULTS_FILE)) {
    console.warn(`WARN: ${RESULTS_FILE} not found — building an empty dashboard.`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  } catch (err) {
    console.error(`ERROR: could not parse ${RESULTS_FILE}`);
    console.error(err.message);
    return null;
  }
}

function collectTests(raw) {
  const tests = [];
  if (!raw || !Array.isArray(raw.suites)) return tests;

  let counter = 0;

  const walk = (suite, fileTitle, describeChain) => {
    const file = suite.file || fileTitle;
    const chain = suite.title && suite.title !== file
      ? describeChain.concat(suite.title)
      : describeChain;

    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const results = test.results || [];
        const last = results[results.length - 1] || {};

        // Playwright reports: expected | unexpected | flaky | skipped
        let status = test.status || (spec.ok ? 'expected' : 'unexpected');
        if (last.status === 'skipped' && status !== 'flaky') status = 'skipped';

        const duration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

        const errorText = results
          .map((r) => (r.error && (r.error.message || r.error.value)) || '')
          .filter(Boolean)
          .map(stripAnsi)
          .join('\n')
          .trim();

        const tags = (spec.tags || []).concat(test.tags || []);

        tests.push({
          id: `t${counter++}`,
          title: spec.title || '(untitled test)',
          suite: chain.join(' › '),
          module: resolveModule(file, chain, tags),
          file: file || '',
          line: spec.line || 0,
          project: test.projectName || '',
          status,
          duration,
          retries: Math.max(0, results.length - 1),
          error: errorText.slice(0, 900),
        });
      }
    }

    for (const child of suite.suites || []) walk(child, file, chain);
  };

  for (const suite of raw.suites) walk(suite, suite.file || suite.title, []);
  return tests;
}

/* ------------------------------------------------------------------ *
 * Aggregate
 * ------------------------------------------------------------------ */

const STATUS_KEYS = {
  expected: 'passed',
  unexpected: 'failed',
  flaky: 'flaky',
  skipped: 'skipped',
};

function emptyCounts() {
  return { passed: 0, failed: 0, flaky: 0, skipped: 0, total: 0, duration: 0 };
}

function tally(tests) {
  const counts = emptyCounts();
  for (const t of tests) {
    const key = STATUS_KEYS[t.status] || 'failed';
    counts[key] += 1;
    counts.total += 1;
    counts.duration += t.duration;
  }
  return counts;
}

function buildModules(tests) {
  const byModule = new Map();
  for (const t of tests) {
    if (!byModule.has(t.module)) byModule.set(t.module, []);
    byModule.get(t.module).push(t);
  }
  return Array.from(byModule.entries())
    .map(([name, items]) => {
      const counts = tally(items);
      const denominator = counts.total - counts.skipped;
      return {
        name,
        ...counts,
        passRate: denominator > 0
          ? Math.round(((counts.passed + counts.flaky) / denominator) * 1000) / 10
          : 0,
      };
    })
    .sort((a, b) => b.failed - a.failed || b.total - a.total);
}

/* ------------------------------------------------------------------ *
 * Trend history (persisted across runs on gh-pages)
 * ------------------------------------------------------------------ */

function buildTrend(counts) {
  let history = [];
  if (fs.existsSync(TREND_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(TREND_FILE, 'utf8'));
      if (Array.isArray(parsed)) history = parsed;
    } catch (err) {
      console.warn(`WARN: ignoring unreadable ${TREND_FILE}`);
    }
  }

  const point = {
    run: Number(meta.runNumber) || history.length + 1,
    date: new Date().toISOString().slice(0, 10),
    passed: counts.passed,
    failed: counts.failed,
    flaky: counts.flaky,
    skipped: counts.skipped,
    total: counts.total,
    duration: counts.duration,
  };

  history = history.filter((p) => p && p.run !== point.run);
  history.push(point);
  history.sort((a, b) => a.run - b.run);

  return history.slice(-MAX_TREND_POINTS);
}

/* ------------------------------------------------------------------ *
 * HTML
 * ------------------------------------------------------------------ */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtml(payload) {
  const json = JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(payload.meta.project)} — Test dashboard</title>
<style>
:root{
  --page:#F4F6F9; --card:#FFFFFF; --line:#E2E6EE; --line-soft:#EFF2F6;
  --ink:#1A2333; --ink-2:#4A5568; --muted:#78839A;
  --pass:#2E9E5B; --pass-bg:#E9F6EE;
  --fail:#D93A3A; --fail-bg:#FCEBEB;
  --flaky:#E09514; --flaky-bg:#FDF3E3;
  --skip:#93A0B4; --skip-bg:#EEF1F6;
  --link:#2F5DE0;
  --radius:10px;
  --shadow:0 1px 2px rgba(21,32,54,.06);
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0; background:var(--page); color:var(--ink);
  font-family:"Segoe UI Variable Text","Segoe UI",Inter,system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
  font-size:14px; line-height:1.5;
}
a{color:var(--link)}
.shell{max-width:1560px;margin:0 auto;padding:18px 20px 56px}

/* ---------- top bar ---------- */
.topbar{
  display:flex; flex-wrap:wrap; gap:14px; align-items:center;
  background:var(--card); border:1px solid var(--line); border-radius:var(--radius);
  box-shadow:var(--shadow); padding:14px 18px; margin-bottom:16px;
}
.brand{display:flex;flex-direction:column;gap:2px;margin-right:6px}
.brand h1{margin:0;font-size:19px;font-weight:650;letter-spacing:-.01em}
.brand .sub{color:var(--muted);font-size:12.5px}
.filters{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-left:auto}
.field{display:flex;flex-direction:column;gap:4px}
.field span{font-size:11.5px;color:var(--muted)}
select,input[type=search]{
  font:inherit; font-size:13px; color:var(--ink); background:#fff;
  border:1px solid var(--line); border-radius:7px; padding:7px 10px; min-width:170px;
  outline-offset:2px;
}
select:focus-visible,input:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid var(--link)}
.btn{
  display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:550;
  padding:8px 13px;border-radius:7px;border:1px solid var(--line);
  background:#fff;color:var(--ink);text-decoration:none;cursor:pointer;
}
.btn.primary{background:var(--link);border-color:var(--link);color:#fff}
.btn.ghost{border-style:dashed;color:var(--ink-2)}

/* ---------- kpi ---------- */
.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:16px}
.kpi{
  background:var(--card);border:1px solid var(--line);border-radius:var(--radius);
  box-shadow:var(--shadow);padding:13px 15px;display:flex;flex-direction:column;gap:7px;
}
.kpi .label{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink-2)}
.kpi .value{font-size:25px;font-weight:640;letter-spacing:-.02em;line-height:1.1}
.kpi .foot{font-size:11.5px;color:var(--muted)}
.dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto}
.dot.pass{background:var(--pass)} .dot.fail{background:var(--fail)}
.dot.flaky{background:var(--flaky)} .dot.skip{background:var(--skip)}
.dot.total{background:var(--link)} .dot.time{background:#6C7A93}

/* ---------- panels ---------- */
.grid{display:grid;gap:14px;margin-bottom:14px}
.grid.two{grid-template-columns:minmax(340px,1fr) minmax(0,2.1fr)}
.panel{
  background:var(--card);border:1px solid var(--line);border-radius:var(--radius);
  box-shadow:var(--shadow);display:flex;flex-direction:column;min-width:0;
}
.panel-head{
  display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--line-soft);
}
.panel-head h2{margin:0;font-size:14.5px;font-weight:620}
.panel-head .note{margin-left:auto;font-size:12px;color:var(--muted)}
.panel-body{padding:14px 16px}
.panel-body.tight{padding:6px 0 0}

/* ---------- charts ---------- */
.chart{width:100%;height:auto;display:block}
.legend{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;padding:10px 4px 2px;font-size:12.5px;color:var(--ink-2)}
.legend i{display:inline-block;width:14px;height:5px;border-radius:3px;margin-right:6px;vertical-align:middle}
.donut-wrap{display:flex;flex-direction:column;align-items:center}

/* ---------- tables ---------- */
table{width:100%;border-collapse:collapse;font-size:13px}
th{
  text-align:left;font-weight:600;color:var(--ink-2);font-size:12.5px;
  padding:10px 16px;border-bottom:1px solid var(--line);background:#FBFCFD;white-space:nowrap;
}
td{padding:10px 16px;border-bottom:1px solid var(--line-soft);vertical-align:top}
tbody tr:last-child td{border-bottom:0}
th.num,td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.tname{font-weight:520;color:var(--ink)}
.tmeta{color:var(--muted);font-size:12px;margin-top:2px}
.err{
  margin-top:6px;padding:7px 9px;border-left:3px solid var(--fail);background:var(--fail-bg);
  border-radius:0 6px 6px 0;color:#7E2020;font-size:12px;white-space:pre-wrap;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;max-height:96px;overflow:auto;
}
.pill{
  display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:20px;
  font-size:12px;font-weight:560;white-space:nowrap;
}
.pill.pass{background:var(--pass-bg);color:#1E7442}
.pill.fail{background:var(--fail-bg);color:#B32626}
.pill.flaky{background:var(--flaky-bg);color:#96650A}
.pill.skip{background:var(--skip-bg);color:#5C6879}
.tag{
  display:inline-block;padding:2px 8px;border:1px solid var(--line);border-radius:6px;
  font-size:12px;color:var(--ink-2);background:#FBFCFD;white-space:nowrap;
}
.bar{height:7px;border-radius:4px;background:var(--skip-bg);overflow:hidden;display:flex;min-width:110px}
.bar i{display:block;height:100%}
.bar i.p{background:var(--pass)} .bar i.f{background:var(--fail)} .bar i.k{background:var(--flaky)}
.scroll{max-height:460px;overflow:auto}
.scroll thead th{position:sticky;top:0;z-index:1}
.empty{padding:26px 16px;color:var(--muted);text-align:center}
.rowlink{background:none;border:0;padding:0;font:inherit;color:var(--link);cursor:pointer;text-decoration:underline}

/* ---------- footer ---------- */
.foot{
  display:flex;flex-wrap:wrap;gap:8px 22px;align-items:center;
  color:var(--muted);font-size:12.5px;padding:14px 4px 0;
}

@media (max-width:1180px){
  .kpis{grid-template-columns:repeat(3,1fr)}
  .grid.two{grid-template-columns:1fr}
}
@media (max-width:640px){
  .shell{padding:12px 12px 40px}
  .kpis{grid-template-columns:repeat(2,1fr)}
  .filters{margin-left:0;width:100%}
  select,input[type=search]{min-width:0;width:100%}
  .field{flex:1 1 140px}
  td,th{padding:9px 12px}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<div class="shell">

  <header class="topbar">
    <div class="brand">
      <h1>${escapeHtml(payload.meta.project)} — test dashboard</h1>
      <div class="sub" id="run-sub"></div>
    </div>

    <div class="filters">
      <label class="field">
        <span>Module</span>
        <select id="f-module"><option value="">All modules</option></select>
      </label>
      <label class="field">
        <span>Status</span>
        <select id="f-status">
          <option value="">All statuses</option>
          <option value="expected">Passed</option>
          <option value="unexpected">Failed</option>
          <option value="flaky">Flaky</option>
          <option value="skipped">Skipped</option>
        </select>
      </label>
      <label class="field">
        <span>Search</span>
        <input type="search" id="f-search" placeholder="Test name or error">
      </label>
      <button class="btn ghost" id="f-reset" type="button">Clear filters</button>
      <a class="btn primary" id="allure-link" href="${escapeHtml(payload.meta.allureUrl)}">Open Allure report</a>
    </div>
  </header>

  <section class="kpis" id="kpis"></section>

  <section class="panel" style="margin-bottom:14px">
    <div class="panel-head">
      <h2>Results per run</h2>
      <span class="note" id="trend-note"></span>
    </div>
    <div class="panel-body" id="trend"></div>
  </section>

  <section class="grid two">
    <div class="panel">
      <div class="panel-head"><h2>Results by status</h2><span class="note" id="donut-note"></span></div>
      <div class="panel-body" id="donut"></div>
      <div id="status-table"></div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h2>Module breakdown</h2>
        <span class="note">Select a row to filter</span>
      </div>
      <div class="panel-body tight scroll" id="modules"></div>
    </div>
  </section>

  <section class="grid two" style="grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)">
    <div class="panel">
      <div class="panel-head"><h2>Failed and flaky tests</h2><span class="note" id="fail-note"></span></div>
      <div class="panel-body tight scroll" id="failures"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Slowest tests</h2><span class="note">Top 10 by duration</span></div>
      <div class="panel-body tight scroll" id="slowest"></div>
    </div>
  </section>

  <section class="panel">
    <div class="panel-head"><h2>All test cases</h2><span class="note" id="all-note"></span></div>
    <div class="panel-body tight scroll" id="all-tests"></div>
  </section>

  <footer class="foot" id="foot"></footer>
</div>

<script id="dashboard-data" type="application/json">${json}</script>
<script>
(function () {
  var DATA = JSON.parse(document.getElementById('dashboard-data').textContent);
  var TESTS = DATA.tests || [];
  var META = DATA.meta || {};
  var TREND = DATA.trend || [];

  var LABEL = { expected:'Passed', unexpected:'Failed', flaky:'Flaky', skipped:'Skipped' };
  var CLASS = { expected:'pass', unexpected:'fail', flaky:'flaky', skipped:'skip' };
  var COLOR = { passed:'#2E9E5B', failed:'#D93A3A', flaky:'#E09514', skipped:'#93A0B4' };

  var state = { module:'', status:'', search:'' };

  /* ---------- utils ---------- */
  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function dur(ms){
    ms = Number(ms) || 0;
    if (ms < 1000) return ms + ' ms';
    var s = ms / 1000;
    if (s < 60) return s.toFixed(1) + ' s';
    var m = Math.floor(s / 60), r = Math.round(s % 60);
    if (m < 60) return m + 'm ' + r + 's';
    var h = Math.floor(m / 60);
    return h + 'h ' + (m % 60) + 'm';
  }
  function pct(n, d){ return d > 0 ? Math.round((n / d) * 1000) / 10 : 0; }
  function el(id){ return document.getElementById(id); }

  function counts(list){
    var c = { passed:0, failed:0, flaky:0, skipped:0, total:list.length, duration:0 };
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t.status === 'expected') c.passed++;
      else if (t.status === 'flaky') c.flaky++;
      else if (t.status === 'skipped') c.skipped++;
      else c.failed++;
      c.duration += t.duration || 0;
    }
    return c;
  }

  function filtered(){
    var q = state.search.trim().toLowerCase();
    return TESTS.filter(function (t) {
      if (state.module && t.module !== state.module) return false;
      if (state.status && t.status !== state.status) return false;
      if (q) {
        var hay = (t.title + ' ' + t.suite + ' ' + t.module + ' ' + t.file + ' ' + (t.error || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function scopeLabel(){
    return state.module ? state.module : 'All modules';
  }

  /* ---------- KPI cards ---------- */
  function renderKpis(list){
    var c = counts(list);
    var executed = c.total - c.skipped;
    var cards = [
      { k:'total', label:'Test cases', value:c.total, foot:scopeLabel() },
      { k:'time',  label:'Execution time', value:dur(c.duration), foot:'Sum of test durations' },
      { k:'pass',  label:'Passed', value:c.passed, foot:pct(c.passed, executed) + '% of executed' },
      { k:'fail',  label:'Failed', value:c.failed, foot:pct(c.failed, executed) + '% of executed' },
      { k:'flaky', label:'Flaky', value:c.flaky, foot:'Passed on retry' },
      { k:'skip',  label:'Skipped', value:c.skipped, foot:'Not executed' }
    ];
    el('kpis').innerHTML = cards.map(function (x) {
      return '<div class="kpi">' +
        '<div class="label"><span class="dot ' + x.k + '"></span>' + esc(x.label) + '</div>' +
        '<div class="value">' + esc(x.value) + '</div>' +
        '<div class="foot">' + esc(x.foot) + '</div>' +
      '</div>';
    }).join('');
  }

  /* ---------- donut ---------- */
  function renderDonut(list){
    var c = counts(list);
    var slices = [
      { key:'passed', label:'Passed', value:c.passed },
      { key:'failed', label:'Failed', value:c.failed },
      { key:'flaky', label:'Flaky', value:c.flaky },
      { key:'skipped', label:'Skipped', value:c.skipped }
    ].filter(function (s) { return s.value > 0; });

    el('donut-note').textContent = scopeLabel();

    if (!c.total) {
      el('donut').innerHTML = '<div class="empty">No tests match the current filters.</div>';
      el('status-table').innerHTML = '';
      return;
    }

    var size = 200, r = 74, sw = 26, cx = size / 2, cy = size / 2;
    var circ = 2 * Math.PI * r, offset = 0;
    var rings = slices.map(function (s) {
      var frac = s.value / c.total;
      var seg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none"' +
        ' stroke="' + COLOR[s.key] + '" stroke-width="' + sw + '"' +
        ' stroke-dasharray="' + (frac * circ) + ' ' + circ + '"' +
        ' stroke-dashoffset="' + (-offset * circ) + '"' +
        ' transform="rotate(-90 ' + cx + ' ' + cy + ')"><title>' +
        esc(s.label + ': ' + s.value) + '</title></circle>';
      offset += frac;
      return seg;
    }).join('');

    var executed = c.total - c.skipped;
    var rate = pct(c.passed + c.flaky, executed);

    el('donut').innerHTML =
      '<div class="donut-wrap">' +
        '<svg class="chart" viewBox="0 0 ' + size + ' ' + size + '" style="max-width:230px" role="img" aria-label="Results by status">' +
          '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#EEF1F6" stroke-width="' + sw + '"></circle>' +
          rings +
          '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" font-size="27" font-weight="650" fill="#1A2333">' + rate + '%</text>' +
          '<text x="' + cx + '" y="' + (cy + 17) + '" text-anchor="middle" font-size="11.5" fill="#78839A">pass rate</text>' +
        '</svg>' +
        '<div class="legend">' + slices.map(function (s) {
          return '<span><i style="background:' + COLOR[s.key] + '"></i>' + esc(s.label) + '</span>';
        }).join('') + '</div>' +
      '</div>';

    var rows = [
      { label:'Passed', cls:'pass', n:c.passed },
      { label:'Failed', cls:'fail', n:c.failed },
      { label:'Flaky', cls:'flaky', n:c.flaky },
      { label:'Skipped', cls:'skip', n:c.skipped }
    ];
    el('status-table').innerHTML =
      '<table><thead><tr><th>Status</th><th class="num">Share</th><th class="num">Tests</th></tr></thead><tbody>' +
      rows.map(function (r2) {
        return '<tr><td><span class="pill ' + r2.cls + '">' + esc(r2.label) + '</span></td>' +
          '<td class="num">' + pct(r2.n, c.total) + '%</td>' +
          '<td class="num">' + r2.n + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  /* ---------- trend line chart ---------- */
  function renderTrend(){
    var host = el('trend');
    if (TREND.length < 1) {
      host.innerHTML = '<div class="empty">Run history builds up here from the next run onward.</div>';
      return;
    }
    el('trend-note').textContent = 'Last ' + TREND.length + ' run' + (TREND.length === 1 ? '' : 's');

    var W = 1000, H = 250, padL = 44, padR = 18, padT = 14, padB = 40;
    var innerW = W - padL - padR, innerH = H - padT - padB;
    var maxY = 1;
    TREND.forEach(function (p) { maxY = Math.max(maxY, p.total || 0); });
    maxY = Math.ceil(maxY / 5) * 5 || 5;

    var n = TREND.length;
    var stepX = n > 1 ? innerW / (n - 1) : 0;
    var x = function (i) { return padL + (n > 1 ? i * stepX : innerW / 2); };
    var y = function (v) { return padT + innerH - (v / maxY) * innerH; };

    var gridCount = 5, grid = '';
    for (var g = 0; g <= gridCount; g++) {
      var val = Math.round((maxY / gridCount) * g);
      var gy = y(val);
      grid += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="#EFF2F6"></line>' +
        '<text x="' + (padL - 9) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="11" fill="#78839A">' + val + '</text>';
    }

    var series = [
      { key:'passed', color:COLOR.passed, label:'Passed' },
      { key:'failed', color:COLOR.failed, label:'Failed' },
      { key:'flaky', color:COLOR.flaky, label:'Flaky' },
      { key:'skipped', color:COLOR.skipped, label:'Skipped' }
    ];

    var lines = series.map(function (s) {
      var pts = TREND.map(function (p, i) { return x(i) + ',' + y(p[s.key] || 0); }).join(' ');
      var dots = TREND.map(function (p, i) {
        return '<circle cx="' + x(i) + '" cy="' + y(p[s.key] || 0) + '" r="3.5" fill="' + s.color + '">' +
          '<title>Run #' + esc(p.run) + ' — ' + s.label + ': ' + (p[s.key] || 0) + '</title></circle>';
      }).join('');
      return '<polyline fill="none" stroke="' + s.color + '" stroke-width="2.2" stroke-linejoin="round" points="' + pts + '"></polyline>' + dots;
    }).join('');

    var everyNth = Math.ceil(n / 12);
    var xLabels = TREND.map(function (p, i) {
      if (i % everyNth !== 0 && i !== n - 1) return '';
      return '<text x="' + x(i) + '" y="' + (H - 16) + '" text-anchor="middle" font-size="11" fill="#78839A">#' + esc(p.run) + '</text>' +
        '<text x="' + x(i) + '" y="' + (H - 3) + '" text-anchor="middle" font-size="10" fill="#A2ABBC">' + esc(String(p.date).slice(5)) + '</text>';
    }).join('');

    host.innerHTML =
      '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Test results per run">' +
        grid + lines + xLabels +
        '<line x1="' + padL + '" y1="' + (padT + innerH) + '" x2="' + (W - padR) + '" y2="' + (padT + innerH) + '" stroke="#E2E6EE"></line>' +
      '</svg>' +
      '<div class="legend">' + series.map(function (s) {
        return '<span><i style="background:' + s.color + '"></i>' + s.label + '</span>';
      }).join('') + '</div>';
  }

  /* ---------- module table ---------- */
  function renderModules(){
    var groups = {};
    TESTS.forEach(function (t) { (groups[t.module] = groups[t.module] || []).push(t); });

    var rows = Object.keys(groups).map(function (name) {
      var c = counts(groups[name]);
      var executed = c.total - c.skipped;
      return { name:name, c:c, rate:pct(c.passed + c.flaky, executed) };
    }).sort(function (a, b) { return b.c.failed - a.c.failed || b.c.total - a.c.total; });

    if (!rows.length) {
      el('modules').innerHTML = '<div class="empty">No modules found in results.json.</div>';
      return;
    }

    el('modules').innerHTML =
      '<table><thead><tr>' +
        '<th>Module</th><th>Health</th><th class="num">Pass</th><th class="num">Fail</th>' +
        '<th class="num">Flaky</th><th class="num">Skip</th><th class="num">Total</th><th class="num">Time</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        var c = r.c, w = function (n) { return c.total ? (n / c.total) * 100 : 0; };
        var active = state.module === r.name;
        return '<tr' + (active ? ' style="background:#F4F7FF"' : '') + '>' +
          '<td><button class="rowlink" data-module="' + esc(r.name) + '">' + esc(r.name) + '</button>' +
            '<div class="tmeta">' + r.rate + '% passing</div></td>' +
          '<td><div class="bar" title="' + r.rate + '% passing">' +
            '<i class="p" style="width:' + w(c.passed) + '%"></i>' +
            '<i class="k" style="width:' + w(c.flaky) + '%"></i>' +
            '<i class="f" style="width:' + w(c.failed) + '%"></i>' +
          '</div></td>' +
          '<td class="num">' + c.passed + '</td>' +
          '<td class="num">' + c.failed + '</td>' +
          '<td class="num">' + c.flaky + '</td>' +
          '<td class="num">' + c.skipped + '</td>' +
          '<td class="num">' + c.total + '</td>' +
          '<td class="num">' + dur(c.duration) + '</td>' +
        '</tr>';
      }).join('') + '</tbody></table>';
  }

  /* ---------- failures ---------- */
  function renderFailures(list){
    var bad = list.filter(function (t) { return t.status === 'unexpected' || t.status === 'flaky'; })
      .sort(function (a, b) { return (a.status === b.status) ? 0 : (a.status === 'unexpected' ? -1 : 1); });

    el('fail-note').textContent = bad.length + ' of ' + list.length + ' shown';

    if (!bad.length) {
      el('failures').innerHTML = '<div class="empty">No failures in this selection.</div>';
      return;
    }

    el('failures').innerHTML =
      '<table><thead><tr><th>Test case</th><th>Module</th><th class="num">Retries</th><th class="num">Time</th></tr></thead><tbody>' +
      bad.map(function (t) {
        return '<tr>' +
          '<td><div class="tname">' + esc(t.title) + '</div>' +
            (t.suite ? '<div class="tmeta">' + esc(t.suite) + '</div>' : '') +
            '<div class="tmeta">' + esc(t.file) + (t.line ? ':' + t.line : '') + '</div>' +
            '<div style="margin-top:6px"><span class="pill ' + CLASS[t.status] + '">' + LABEL[t.status] + '</span></div>' +
            (t.error ? '<div class="err">' + esc(t.error) + '</div>' : '') +
          '</td>' +
          '<td><span class="tag">' + esc(t.module) + '</span></td>' +
          '<td class="num">' + t.retries + '</td>' +
          '<td class="num">' + dur(t.duration) + '</td>' +
        '</tr>';
      }).join('') + '</tbody></table>';
  }

  /* ---------- slowest ---------- */
  function renderSlowest(list){
    var top = list.slice().sort(function (a, b) { return b.duration - a.duration; }).slice(0, 10);
    if (!top.length) {
      el('slowest').innerHTML = '<div class="empty">Nothing to rank yet.</div>';
      return;
    }
    var max = top[0].duration || 1;
    el('slowest').innerHTML =
      '<table><thead><tr><th>Test case</th><th>Module</th><th class="num">Duration</th></tr></thead><tbody>' +
      top.map(function (t) {
        return '<tr>' +
          '<td><div class="tname">' + esc(t.title) + '</div>' +
            '<div class="bar" style="margin-top:6px;max-width:220px"><i class="p" style="width:' +
              ((t.duration / max) * 100) + '%;background:#8FA2C4"></i></div></td>' +
          '<td><span class="tag">' + esc(t.module) + '</span></td>' +
          '<td class="num">' + dur(t.duration) + '</td>' +
        '</tr>';
      }).join('') + '</tbody></table>';
  }

  /* ---------- all tests ---------- */
  function renderAll(list){
    el('all-note').textContent = list.length + ' test' + (list.length === 1 ? '' : 's') + ' · ' + scopeLabel();
    if (!list.length) {
      el('all-tests').innerHTML = '<div class="empty">No tests match the current filters.</div>';
      return;
    }
    el('all-tests').innerHTML =
      '<table><thead><tr><th>Status</th><th>Test case</th><th>Module</th><th>Spec file</th>' +
      '<th class="num">Retries</th><th class="num">Duration</th></tr></thead><tbody>' +
      list.map(function (t) {
        return '<tr>' +
          '<td><span class="pill ' + CLASS[t.status] + '">' + LABEL[t.status] + '</span></td>' +
          '<td><div class="tname">' + esc(t.title) + '</div>' +
            (t.suite ? '<div class="tmeta">' + esc(t.suite) + '</div>' : '') + '</td>' +
          '<td><span class="tag">' + esc(t.module) + '</span></td>' +
          '<td><span class="tmeta">' + esc(t.file) + (t.line ? ':' + t.line : '') + '</span></td>' +
          '<td class="num">' + t.retries + '</td>' +
          '<td class="num">' + dur(t.duration) + '</td>' +
        '</tr>';
      }).join('') + '</tbody></table>';
  }

  /* ---------- chrome ---------- */
  function renderChrome(){
    var parts = [];
    if (META.branch) parts.push('Branch ' + META.branch);
    if (META.runNumber) parts.push('Run #' + META.runNumber);
    if (META.actor) parts.push('Triggered by ' + META.actor);
    if (META.environment) parts.push(META.environment);
    el('run-sub').textContent = parts.join('  ·  ');

    var foot = [];
    if (META.commitSha) {
      foot.push('<span>Commit <a href="' + esc(META.commitUrl) + '">' + esc(META.commitSha) + '</a>' +
        (META.commitMessage ? ' — ' + esc(META.commitMessage) : '') + '</span>');
    }
    if (META.runUrl) foot.push('<a href="' + esc(META.runUrl) + '">GitHub Actions log</a>');
    if (META.baseUrl) foot.push('<span>Base URL ' + esc(META.baseUrl) + '</span>');
    foot.push('<span>Generated ' + new Date(META.generatedAt).toLocaleString() + '</span>');
    el('foot').innerHTML = foot.join('');
  }

  function renderAllPanels(){
    var list = filtered();
    renderKpis(list);
    renderDonut(list);
    renderModules();
    renderFailures(list);
    renderSlowest(list);
    renderAll(list);
  }

  /* ---------- wiring ---------- */
  function initFilters(){
    var mods = {};
    TESTS.forEach(function (t) { mods[t.module] = true; });
    var sel = el('f-module');
    Object.keys(mods).sort().forEach(function (m) {
      var o = document.createElement('option');
      o.value = m; o.textContent = m;
      sel.appendChild(o);
    });

    sel.addEventListener('change', function () { state.module = sel.value; sync(); });
    el('f-status').addEventListener('change', function (e) { state.status = e.target.value; sync(); });

    var timer;
    el('f-search').addEventListener('input', function (e) {
      clearTimeout(timer);
      var v = e.target.value;
      timer = setTimeout(function () { state.search = v; sync(); }, 140);
    });

    el('f-reset').addEventListener('click', function () {
      state = { module:'', status:'', search:'' };
      sel.value = ''; el('f-status').value = ''; el('f-search').value = '';
      sync();
    });

    el('modules').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-module]');
      if (!btn) return;
      var name = btn.getAttribute('data-module');
      state.module = (state.module === name) ? '' : name;
      sel.value = state.module;
      sync();
    });
  }

  function sync(){
    renderAllPanels();
    var q = [];
    if (state.module) q.push('module=' + encodeURIComponent(state.module));
    if (state.status) q.push('status=' + state.status);
    if (state.search) q.push('q=' + encodeURIComponent(state.search));
    history.replaceState(null, '', q.length ? '?' + q.join('&') : location.pathname);
  }

  function readUrl(){
    var p = new URLSearchParams(location.search);
    state.module = p.get('module') || '';
    state.status = p.get('status') || '';
    state.search = p.get('q') || '';
    el('f-status').value = state.status;
    el('f-search').value = state.search;
    var sel = el('f-module');
    if (state.module && !Array.prototype.some.call(sel.options, function (o) { return o.value === state.module; })) {
      state.module = '';
    }
    sel.value = state.module;
  }

  initFilters();
  readUrl();
  renderChrome();
  renderTrend();
  renderAllPanels();
})();
</script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

function main() {
  const raw = readResults();
  const tests = collectTests(raw);
  const stats = tally(tests);
  const modules = buildModules(tests);
  const trend = buildTrend(stats);

  if (raw && raw.stats && raw.stats.duration) {
    stats.wallClock = raw.stats.duration;
  }

  const payload = { meta, stats, modules, tests, trend };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderHtml(payload));
  fs.writeFileSync(path.join(OUT_DIR, 'dashboard-data.json'), JSON.stringify(payload, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'trend.json'), JSON.stringify(trend, null, 2));

  console.log('========================================');
  console.log('DASHBOARD BUILT');
  console.log('========================================');
  console.log(`Tests    : ${stats.total}`);
  console.log(`Passed   : ${stats.passed}`);
  console.log(`Failed   : ${stats.failed}`);
  console.log(`Flaky    : ${stats.flaky}`);
  console.log(`Skipped  : ${stats.skipped}`);
  console.log(`Modules  : ${modules.map((m) => m.name).join(', ') || '(none)'}`);
  console.log(`Output   : ${path.join(OUT_DIR, 'index.html')}`);
  console.log('========================================');
}

main();