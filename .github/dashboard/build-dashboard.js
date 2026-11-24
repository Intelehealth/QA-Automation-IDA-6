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
 *   RESULTS_FILE, OUTPUT_DIR, HISTORY_FILE, HISTORY_LIMIT, PROJECT_NAME,
 *   REPOSITORY, BRANCH, ACTOR, RUN_NUMBER, RUN_URL, RUN_TIME, COMMIT_SHA,
 *   COMMIT_MESSAGE, COMMIT_URL, ALLURE_URL, BASE_URL, ENVIRONMENT
 *
 * TEMPLATE_FILE is accepted but unused — the HTML is generated inline,
 * so there is no separate template file to maintain.
 */

const fs = require('fs');
const path = require('path');

const RESULTS_FILE = process.env.RESULTS_FILE || 'results.json';
const OUT_DIR = process.env.OUTPUT_DIR || process.env.OUT_DIR || 'dashboard';
const TREND_FILE = process.env.HISTORY_FILE || process.env.TREND_FILE || 'dashboard-history.json';
const MAX_TREND_POINTS = Number(process.env.HISTORY_LIMIT) || 20;

const meta = {
  project: process.env.PROJECT_NAME || 'IDA-6 Automation',
  repo: process.env.REPOSITORY || process.env.REPO || '',
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
  runTime: process.env.RUN_TIME || '',
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
 * Trims boilerplate wording from describe() titles so the dropdown stays readable.
 *   "Physical Examination Module - Full Test Suite"  ->  "Physical Examination"
 *   "Start Visit Module"                             ->  "Start Visit"
 * Delete this function's body (return name) to keep titles verbatim.
 */
function cleanModuleName(name) {
  var cleaned = String(name)
    .replace(/\s*[-–—:]\s*(full\s+)?test\s+suite\s*$/i, '')
    .replace(/\s*[-–—:]\s*test\s+cases?\s*$/i, '')
    .replace(/\s+module\s*$/i, '')
    .replace(/\s+suite\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned || String(name).trim();
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

  if (tagged) return cleanModuleName(titleCase(tagged.replace(/^@?module[:=]/i, '')));
  if (describeChain.length) return cleanModuleName(describeChain[0]);

  const base = path.basename(fileTitle || 'unknown')
    .replace(/\.(spec|test)\.(t|j)sx?$/i, '')
    .replace(/\.(t|j)sx?$/i, '');

  return cleanModuleName(titleCase(base));
}

/* ------------------------------------------------------------------ *
 * Protocols
 *
 * A test belongs to a protocol when either:
 *   1. its outermost describe() is "<Name> Protocol ..."
 *        "Vomiting Protocol - Full Test Suite"  ->  "Vomiting"
 *   2. its spec file is Protocol_<Name>.spec.js
 *        Protocol_ShoulderArmHandPain.spec.js   ->  "Shoulder Arm Hand Pain"
 * Everything else (Smoke_Protocols, Medical History, ...) is not a protocol.
 *
 * The clinical-flow stage comes from words in the test title. The first
 * match wins, so "Physical_Exam_Confirm_Navigates_To_Medical_History"
 * counts as Physical exam.
 * ------------------------------------------------------------------ */

function resolveProtocol(fileTitle, describeChain) {
  const top = String(describeChain[0] || '');
  const byDescribe = top.match(/^(.*?)\s+protocol\b/i);
  if (byDescribe && byDescribe[1].trim()) return byDescribe[1].trim();

  const base = path.basename(fileTitle || '');
  const byFile = base.match(/^protocol[_-](.+?)\.(spec|test)\.[tj]sx?$/i);
  if (byFile) {
    return byFile[1]
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return '';
}

const STAGES = [
  { key: 'e2e', label: 'End-to-end', re: /end[_\s-]*to[_\s-]*end|\be2e\b/i },
  { key: 'pe', label: 'Physical exam', re: /physical[_\s-]*exam/i },
  { key: 'mh', label: 'Medical history', re: /medical[_\s-]*history/i },
  { key: 'vs', label: 'Visit summary', re: /visit[_\s-]*summary/i },
];
const STAGE_ORDER = ['qs', 'pe', 'mh', 'vs', 'e2e'];
const STAGE_LABEL = { qs: 'Assessment questions', pe: 'Physical exam', mh: 'Medical history', vs: 'Visit summary', e2e: 'End-to-end' };

function resolveStage(title) {
  for (const s of STAGES) if (s.re.test(title)) return s.key;
  return 'qs';
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
        const title = spec.title || '(untitled test)';
        const protocol = resolveProtocol(file, chain);

        tests.push({
          id: `t${counter++}`,
          title,
          suite: chain.join(' › '),
          module: resolveModule(file, chain, tags),
          protocol,
          stage: protocol ? resolveStage(title) : '',
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

function rateOf(counts) {
  const denominator = counts.total - counts.skipped;
  return denominator > 0
    ? Math.round(((counts.passed + counts.flaky) / denominator) * 1000) / 10
    : 0;
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
      return { name, ...counts, passRate: rateOf(counts) };
    })
    .sort((a, b) => b.failed - a.failed || b.total - a.total);
}

function buildProtocols(tests) {
  const byProtocol = new Map();
  for (const t of tests) {
    if (!t.protocol) continue;
    if (!byProtocol.has(t.protocol)) byProtocol.set(t.protocol, []);
    byProtocol.get(t.protocol).push(t);
  }
  return Array.from(byProtocol.entries())
    .map(([name, items]) => {
      const counts = tally(items);
      const stages = {};
      for (const key of STAGE_ORDER) {
        const c = tally(items.filter((t) => t.stage === key));
        stages[key] = { total: c.total, passed: c.passed, failed: c.failed, flaky: c.flaky, skipped: c.skipped };
      }
      return { name, module: items[0].module, ...counts, passRate: rateOf(counts), stages };
    })
    .sort((a, b) => b.failed - a.failed || a.passRate - b.passRate || a.name.localeCompare(b.name));
}

/* ------------------------------------------------------------------ *
 * Trend history (persisted across runs on gh-pages)
 * ------------------------------------------------------------------ */

function buildTrend(counts, protocols) {
  let history = [];

  // On CI the workflow restores history.json from gh-pages. Locally that file
  // won't exist, so fall back to the copy this script wrote last time.
  const candidates = [TREND_FILE, path.join(OUT_DIR, 'history.json')];
  const source = candidates.find((p) => fs.existsSync(p));

  if (source) {
    try {
      const parsed = JSON.parse(fs.readFileSync(source, 'utf8'));
      if (Array.isArray(parsed)) {
        history = parsed;
        console.log(`Loaded ${history.length} previous run(s) from ${source}`);
      }
    } catch (err) {
      console.warn(`WARN: ignoring unreadable ${source}`);
    }
  } else {
    console.log('No previous run history found — starting a new trend.');
  }

  // Pass rate per protocol, so the dashboard can draw a trend line for each.
  const protocolRates = {};
  for (const p of protocols) protocolRates[p.name] = p.passRate;

  const point = {
    run: Number(meta.runNumber) || history.length + 1,
    date: new Date().toISOString().slice(0, 10),
    passed: counts.passed,
    failed: counts.failed,
    flaky: counts.flaky,
    skipped: counts.skipped,
    total: counts.total,
    duration: counts.duration,
    protocols: protocolRates,
  };

  // Leave out runs with no results (e.g. every shard failed to start),
  // otherwise the trend shows a fake drop to zero.
  history = history.filter((p) => p && p.run !== point.run && Number(p.total) > 0);
  if (point.total > 0) history.push(point);
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
<title>${escapeHtml(payload.meta.project)} — dashboard</title>
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
.btn.small{padding:5px 10px;font-size:12px}

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
  flex-wrap:wrap;
}
.panel-head h2{margin:0;font-size:14.5px;font-weight:620}
.panel-head .note{margin-left:auto;font-size:12px;color:var(--muted)}
.panel-body{padding:14px 16px}
.panel-body.tight{padding:6px 0 0}

/* ---------- section nav + labels ---------- */
.jump{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 4px}
.jump a{font-size:12.5px;color:var(--ink-2);text-decoration:none;padding:5px 12px;border:1px solid var(--line);border-radius:20px;background:#fff}
.jump a:hover{border-color:var(--link);color:var(--link)}
.section-label{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:650;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:22px 2px 9px}
.section-label::after{content:"";flex:1;height:1px;background:var(--line)}
.section-label .num{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--ink);color:#fff;font-size:11px;letter-spacing:0}
html{scroll-behavior:smooth}
section[id]{scroll-margin-top:14px}

/* ---------- run overview ---------- */
.ov-body{display:grid;grid-template-columns:230px minmax(0,1fr);gap:28px;padding:18px 22px 20px;align-items:center}
.ov-donut{display:flex;flex-direction:column;align-items:center;gap:4px}
.ov-donut .of{font-size:12.5px;color:var(--muted)}
.verdict{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:620;padding:10px 14px;border-radius:8px;margin-bottom:16px;background:var(--skip-bg);color:var(--ink-2)}
.verdict .vi{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;font-size:14px;font-weight:700;color:#fff;background:var(--skip);flex:0 0 auto}
.verdict.bad{background:var(--fail-bg);color:#9F2424} .verdict.bad .vi{background:var(--fail)}
.verdict.good{background:var(--pass-bg);color:#1E7442} .verdict.good .vi{background:var(--pass)}
.ovbar{display:flex;height:14px;border-radius:7px;overflow:hidden;background:var(--skip-bg)}
.ovbar i{display:block;height:100%}
.ov-barkey{display:flex;flex-wrap:wrap;gap:6px 20px;font-size:12.5px;color:var(--ink-2);margin:9px 0 16px}
.ov-barkey b{color:var(--ink);font-weight:650}
.ov-barkey .dot{display:inline-block;margin-right:6px;vertical-align:middle}
.ov-tiles{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.tile{border:1px solid var(--line);border-top:3px solid var(--c);border-radius:8px;padding:10px 13px 11px}
.tile .label{font-size:12.5px;color:var(--ink-2)}
.tile .value{font-size:27px;font-weight:650;letter-spacing:-.02em;line-height:1.15}
.tile .pc{font-size:13px;font-weight:650;color:var(--c)}
.tile .delta{font-size:11.5px;color:var(--muted);margin-top:3px;min-height:17px}
.delta .bad{color:var(--fail);font-weight:600} .delta .good{color:var(--pass);font-weight:600}
.ov-meta{display:flex;flex-wrap:wrap;gap:6px 24px;font-size:12.5px;color:var(--muted);margin-top:14px}
.ov-meta b{color:var(--ink);font-weight:600}

/* ---------- protocol validation ---------- */
.panel.feature{border-top:3px solid var(--link)}
.panel-head .sub{font-size:12px;color:var(--muted)}
.chk{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink-2);cursor:pointer;white-space:nowrap}
.pkpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.pkpi{background:#F8FAFC;border:1px solid var(--line-soft);border-radius:8px;padding:10px 13px}
.pkpi .label{font-size:12px;color:var(--ink-2)}
.pkpi .value{font-size:22px;font-weight:640;letter-spacing:-.02em;line-height:1.2}
.pkpi .foot{font-size:11.5px;color:var(--muted)}
.pkpi .value.good{color:var(--pass)} .pkpi .value.bad{color:var(--fail)}
.st{
  display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;
  padding:0 6px;border-radius:12px;font-size:12px;font-weight:600;
}
.st.ok{background:var(--pass-bg);color:#1E7442}
.st.bad{background:var(--fail-bg);color:#B32626}
.st.flaky{background:var(--flaky-bg);color:#96650A}
.st.na{background:transparent;color:#B8C0CD;font-weight:400}
th.c,td.c{text-align:center}
tr.prow{cursor:pointer}
tr.prow:hover td{background:#F8FAFD}
tr.prow.open td{background:#F4F7FF}
tr.pdetail td{background:#F8FAFC;padding:12px 16px 14px}
.caret{display:inline-block;width:12px;color:var(--muted);transition:transform .15s}
tr.prow.open .caret{transform:rotate(90deg)}
.pname{font-weight:600}
.flist{margin:8px 0 10px;padding:0;list-style:none;display:grid;gap:6px}
.flist li{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap}
.flist .etext{flex-basis:100%;color:#7E2020;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;padding-left:2px}
.stage-key{display:flex;flex-wrap:wrap;gap:6px 18px;padding:10px 16px 12px;font-size:12px;color:var(--muted);border-top:1px solid var(--line-soft)}
.stage-key b{color:var(--ink-2);font-weight:600}

/* ---------- charts ---------- */
.chart{width:100%;height:auto;display:block}
.legend{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;padding:10px 4px 2px;font-size:12.5px;color:var(--ink-2)}
.legend i{display:inline-block;width:14px;height:5px;border-radius:3px;margin-right:6px;vertical-align:middle}
.chart-hint{margin:4px 0 0;text-align:center;font-size:12.5px;color:var(--muted)}
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
.scroll.tall{max-height:620px}
.scroll thead th{position:sticky;top:0;z-index:1}
.empty{padding:26px 16px;color:var(--muted);text-align:center}
.rowlink{background:none;border:0;padding:0;font:inherit;color:var(--link);cursor:pointer;text-decoration:underline}

/* ---------- footer ---------- */
footer.foot{
  display:flex;flex-wrap:wrap;gap:8px 22px;align-items:center;
  color:var(--muted);font-size:12.5px;padding:14px 4px 0;
}

@media (max-width:1180px){
  .kpis{grid-template-columns:repeat(3,1fr)}
  .ov-body{grid-template-columns:1fr}
  .ov-tiles{grid-template-columns:repeat(3,1fr)}
  .pkpis{grid-template-columns:repeat(3,1fr)}
  .grid.two{grid-template-columns:1fr}
}
@media (max-width:640px){
  .shell{padding:12px 12px 40px}
  .kpis,.pkpis,.ov-tiles{grid-template-columns:repeat(2,1fr)}
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

  <nav class="jump" aria-label="Jump to section">
    <a href="#overview">Overview</a><a href="#protocol-panel">Protocols</a><a href="#trend-panel">Trend</a>
    <a href="#modules-panel">Modules</a><a href="#failures-panel">Failures</a><a href="#all-panel">All tests</a>
  </nav>

  <div class="section-label"><span class="num">1</span>Overall results</div>
  <section class="panel" id="overview">
    <div class="panel-head">
      <h2>Run overview</h2>
      <span class="sub" id="ov-scope"></span>
      <span class="note" id="ov-compare"></span>
    </div>
    <div class="ov-body">
      <div class="ov-donut" id="donut"></div>
      <div>
        <div class="verdict" id="ov-verdict"></div>
        <div id="ov-bar"></div>
        <div class="ov-tiles" id="kpis"></div>
        <div class="ov-meta" id="ov-meta"></div>
      </div>
    </div>
  </section>

  <div class="section-label"><span class="num">2</span>Protocols</div>
  <section class="panel feature" style="margin-bottom:14px" id="protocol-panel">
    <div class="panel-head">
      <h2>Protocol validation</h2>
      <span class="sub" id="proto-sub"></span>
      <span class="note" style="display:flex;gap:16px;align-items:center">
        <label class="chk"><input type="checkbox" id="proto-only"> Only protocols with failures</label>
      </span>
    </div>
    <div class="panel-body"><div class="pkpis" id="proto-kpis"></div></div>
    <div class="panel-body tight scroll tall" id="protocols"></div>
    <div class="stage-key">
      <span><b>Stages</b> — where in the clinical flow each protocol's tests run:</span>
      <span>Assessment questions</span><span>Physical exam</span><span>Medical history</span><span>Visit summary</span><span>End-to-end visit</span>
      <span style="margin-left:auto"><span class="st ok">&#10003;</span> all passed &nbsp; <span class="st bad">2</span> failed tests &nbsp; <span class="st flaky">1</span> flaky &nbsp; <span class="st na">–</span> no tests</span>
    </div>
  </section>

  <div class="section-label"><span class="num">3</span>Trends and modules</div>
  <section class="panel" style="margin-bottom:14px" id="trend-panel">
    <div class="panel-head">
      <h2>Results per run</h2>
      <span class="note" id="trend-note"></span>
    </div>
    <div class="panel-body" id="trend"></div>
  </section>

  <section class="panel" style="margin-bottom:14px" id="modules-panel">
    <div class="panel-head">
      <h2>Module breakdown</h2>
      <span class="note">Select a module to filter the whole page</span>
    </div>
    <div class="panel-body tight scroll" id="modules"></div>
  </section>

  <div class="section-label"><span class="num">4</span>Test details</div>
  <section class="grid two" id="failures-panel" style="grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)">
    <div class="panel">
      <div class="panel-head"><h2>Failed and flaky tests</h2><span class="note" id="fail-note"></span></div>
      <div class="panel-body tight scroll" id="failures"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Slowest tests</h2><span class="note">Top 10 by duration</span></div>
      <div class="panel-body tight scroll" id="slowest"></div>
    </div>
  </section>

  <section class="panel" id="all-panel">
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
  var PROTOCOLS = DATA.protocols || [];

  var LABEL = { expected:'Passed', unexpected:'Failed', flaky:'Flaky', skipped:'Skipped' };
  var CLASS = { expected:'pass', unexpected:'fail', flaky:'flaky', skipped:'skip' };
  var COLOR = { passed:'#2E9E5B', failed:'#D93A3A', flaky:'#E09514', skipped:'#93A0B4' };
  var STAGES = [
    { key:'qs',  label:'Questions',       full:'Assessment questions' },
    { key:'pe',  label:'Physical exam',   full:'Physical exam' },
    { key:'mh',  label:'Medical history', full:'Medical history' },
    { key:'vs',  label:'Visit summary',   full:'Visit summary' },
    { key:'e2e', label:'End-to-end',      full:'End-to-end visit' }
  ];

  var state = { module:'', status:'', search:'' };
  var protoState = { open:'', onlyFailing:false };

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

  /* ---------- run overview ---------- */
  function isFiltered(){ return !!(state.module || state.status || state.search.trim()); }

  function previousRun(){
    var cur = Number(META.runNumber) || 0, prev = null;
    TREND.forEach(function (p) { if (p.run < cur && (!prev || p.run > prev.run)) prev = p; });
    return prev;
  }

  // worseWhenUp: true = going up is bad (failed), false = going up is good (passed), null = neutral
  function deltaHtml(now, before, worseWhenUp, run){
    if (before == null) return '';
    var d = now - before;
    if (!d) return 'Same as #' + esc(run);
    var cls = worseWhenUp == null ? '' : ((d > 0) === worseWhenUp ? 'bad' : 'good');
    return '<span class="' + cls + '">' + (d > 0 ? '&#9650; ' : '&#9660; ') + Math.abs(d) + '</span> vs #' + esc(run);
  }

  function renderOverview(list){
    var c = counts(list);
    var executed = c.total - c.skipped;
    var prev = isFiltered() ? null : previousRun();
    var run = prev ? prev.run : '';
    var pv = function (k) { return prev ? (Number(prev[k]) || 0) : null; };

    el('ov-scope').textContent = scopeLabel() + ((state.status || state.search.trim()) ? ' · filtered' : '');
    el('ov-compare').textContent = prev ? 'Arrows compare with run #' + prev.run
      : (isFiltered() ? 'Run comparison hidden while filtered' : '');

    /* verdict line */
    var v = el('ov-verdict');
    if (!c.total) {
      v.className = 'verdict';
      v.innerHTML = '<span class="vi">?</span>No tests match the current filters.';
    } else if (c.failed) {
      var mods = {};
      list.forEach(function (t) { if (t.status === 'unexpected') mods[t.module] = 1; });
      var nMods = Object.keys(mods).length;
      var parts = [c.failed + ' test' + (c.failed === 1 ? '' : 's') + ' failed in ' + nMods + ' module' + (nMods === 1 ? '' : 's')];
      if (!isFiltered() && PROTOCOLS.length) {
        var bad = PROTOCOLS.filter(function (p) { return p.failed > 0; }).length;
        parts.push(bad + ' of ' + PROTOCOLS.length + ' protocols need attention');
      }
      v.className = 'verdict bad';
      v.innerHTML = '<span class="vi">!</span>' + esc(parts.join('  ·  '));
    } else {
      v.className = 'verdict good';
      v.innerHTML = '<span class="vi">&#10003;</span>' + esc('All ' + executed + ' executed tests passed' +
        (c.flaky ? ' (' + c.flaky + ' needed a retry)' : ''));
    }

    /* one bar that splits every test by status */
    var seg = [
      { k:'passed', label:'Passed', n:c.passed },
      { k:'failed', label:'Failed', n:c.failed },
      { k:'flaky', label:'Flaky', n:c.flaky },
      { k:'skipped', label:'Skipped', n:c.skipped }
    ];
    el('ov-bar').innerHTML =
      '<div class="ovbar" role="img" aria-label="' + esc(seg.map(function (s2) { return s2.label + ' ' + pct(s2.n, c.total) + '%'; }).join(', ')) + '">' +
        seg.map(function (s2) {
          return '<i style="width:' + (c.total ? (s2.n / c.total) * 100 : 0) + '%;background:' + COLOR[s2.k] + '" title="' +
            esc(s2.label + ': ' + s2.n + ' (' + pct(s2.n, c.total) + '%)') + '"></i>';
        }).join('') +
      '</div>' +
      '<div class="ov-barkey">' + seg.map(function (s2) {
        return '<span><span class="dot" style="background:' + COLOR[s2.k] + '"></span>' + s2.label + ' <b>' + pct(s2.n, c.total) + '%</b></span>';
      }).join('') + '</div>';

    /* count tiles: number, share of all tests, change since last run */
    var tiles = [
      { label:'Total tests', value:c.total, pc:executed + ' executed', color:'#2F5DE0', d:deltaHtml(c.total, pv('total'), null, run) },
      { label:'Passed', value:c.passed, pc:pct(c.passed, c.total) + '%', color:COLOR.passed, d:deltaHtml(c.passed, pv('passed'), false, run) },
      { label:'Failed', value:c.failed, pc:pct(c.failed, c.total) + '%', color:COLOR.failed, d:deltaHtml(c.failed, pv('failed'), true, run) },
      { label:'Flaky', value:c.flaky, pc:pct(c.flaky, c.total) + '%', color:COLOR.flaky, d:deltaHtml(c.flaky, pv('flaky'), true, run) },
      { label:'Skipped', value:c.skipped, pc:pct(c.skipped, c.total) + '%', color:COLOR.skipped, d:deltaHtml(c.skipped, pv('skipped'), true, run) }
    ];
    el('kpis').innerHTML = tiles.map(function (x) {
      return '<div class="tile" style="--c:' + x.color + '">' +
        '<div class="label">' + esc(x.label) + '</div>' +
        '<div class="value">' + esc(x.value) + '</div>' +
        '<div class="pc">' + esc(x.pc) + '</div>' +
        '<div class="delta">' + x.d + '</div>' +
      '</div>';
    }).join('');

    /* run facts */
    var mset = {};
    list.forEach(function (t) { mset[t.module] = 1; });
    var meta = [
      '<span>Execution time <b>' + dur(c.duration) + '</b> (sum of tests)</span>'
    ];
    if (!isFiltered() && DATA.stats && DATA.stats.wallClock) meta.push('<span>Wall clock <b>' + dur(DATA.stats.wallClock) + '</b></span>');
    meta.push('<span>Modules <b>' + Object.keys(mset).length + '</b></span>');
    if (PROTOCOLS.length) meta.push('<span>Protocols <b>' + PROTOCOLS.length + '</b></span>');
    if (META.environment) meta.push('<span>Environment <b>' + esc(META.environment) + '</b></span>');
    el('ov-meta').innerHTML = meta.join('');
  }

  /* ---------- protocol validation ---------- */
  function protocolTrend(name){
    var pts = [];
    TREND.forEach(function (p) {
      if (p.protocols && p.protocols[name] != null) pts.push({ run:p.run, rate:Number(p.protocols[name]) });
    });
    return pts.slice(-10);
  }

  function sparkline(pts){
    if (pts.length < 2) {
      return '<span class="tmeta" title="The trend line starts after the next run">builds next run</span>';
    }
    var w = 96, h = 26, lo = 100;
    pts.forEach(function (p) { lo = Math.min(lo, p.rate); });
    lo = Math.max(0, Math.min(90, Math.floor(lo / 10) * 10));
    var x = function (i) { return 3 + i * ((w - 6) / (pts.length - 1)); };
    var y = function (v) { return 3 + (h - 6) - ((v - lo) / (100 - lo || 1)) * (h - 6); };
    var last = pts[pts.length - 1], first = pts[0];
    var color = last.rate >= 100 ? COLOR.passed : (last.rate < first.rate ? COLOR.failed : COLOR.flaky);
    var tip = pts.map(function (p) { return '#' + p.run + ': ' + p.rate + '%'; }).join('  ');
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Pass rate per run ' + esc(tip) + '">' +
      '<title>' + esc(tip) + '</title>' +
      '<polyline fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="' +
        pts.map(function (p, i) { return x(i) + ',' + y(p.rate); }).join(' ') + '"></polyline>' +
      '<circle cx="' + x(pts.length - 1) + '" cy="' + y(last.rate) + '" r="3" fill="' + color + '"></circle>' +
    '</svg>';
  }

  function stageCell(s, label){
    if (!s || !s.total) return '<span class="st na" title="No ' + esc(label) + ' tests">–</span>';
    var passed = s.passed + s.flaky;
    var tip = esc(label + ': ' + passed + ' of ' + (s.total - s.skipped) + ' passed');
    if (s.failed) return '<span class="st bad" title="' + tip + '">' + s.failed + '</span>';
    if (s.flaky) return '<span class="st flaky" title="' + tip + ' (' + s.flaky + ' flaky)">' + s.flaky + '</span>';
    return '<span class="st ok" title="' + tip + '">&#10003;</span>';
  }

  function renderProtocolKpis(){
    var tested = PROTOCOLS.length;
    var green = PROTOCOLS.filter(function (p) { return !p.failed; }).length;
    var withFail = tested - green;
    var failedTests = PROTOCOLS.reduce(function (s, p) { return s + p.failed; }, 0);
    var c = PROTOCOLS.reduce(function (a, p) {
      a.passed += p.passed; a.flaky += p.flaky; a.failed += p.failed; a.skipped += p.skipped; a.total += p.total;
      return a;
    }, { passed:0, flaky:0, failed:0, skipped:0, total:0 });
    var rate = pct(c.passed + c.flaky, c.total - c.skipped);
    var withE2e = PROTOCOLS.filter(function (p) { return p.stages && p.stages.e2e && p.stages.e2e.total; });
    var e2eOk = withE2e.filter(function (p) { return !p.stages.e2e.failed; }).length;

    var cards = [
      { label:'Protocols tested', value:tested, foot:c.total + ' protocol tests', cls:'' },
      { label:'Fully passing', value:green, foot:'every test green', cls:'good' },
      { label:'With failures', value:withFail, foot:failedTests + ' failed test' + (failedTests === 1 ? '' : 's'), cls:withFail ? 'bad' : '' },
      { label:'Protocol pass rate', value:rate + '%', foot:'passed + flaky / executed', cls:'' },
      { label:'End-to-end visits', value:e2eOk + ' / ' + withE2e.length, foot:'full visit completes', cls:withE2e.length && e2eOk < withE2e.length ? 'bad' : 'good' }
    ];
    el('proto-kpis').innerHTML = cards.map(function (x) {
      return '<div class="pkpi"><div class="label">' + esc(x.label) + '</div>' +
        '<div class="value ' + x.cls + '">' + esc(x.value) + '</div>' +
        '<div class="foot">' + esc(x.foot) + '</div></div>';
    }).join('');
    el('proto-sub').textContent = withFail
      ? withFail + ' of ' + tested + ' protocols need attention'
      : 'All ' + tested + ' protocols passing';
  }

  function protocolDetail(p){
    var bad = TESTS.filter(function (t) {
      return t.protocol === p.name && (t.status === 'unexpected' || t.status === 'flaky');
    }).sort(function (a, b) {
      return STAGES.map(function (s) { return s.key; }).indexOf(a.stage) - STAGES.map(function (s) { return s.key; }).indexOf(b.stage);
    });
    var stageName = {};
    STAGES.forEach(function (s) { stageName[s.key] = s.full; });

    var body = bad.length
      ? '<div class="tname">Failed and flaky tests in ' + esc(p.name) + '</div><ul class="flist">' +
          bad.map(function (t) {
            var firstLine = (t.error || '').split('\\n')[0];
            return '<li><span class="pill ' + CLASS[t.status] + '">' + LABEL[t.status] + '</span>' +
              '<span class="tag">' + esc(stageName[t.stage] || '') + '</span>' +
              '<span>' + esc(t.title) + '</span>' +
              '<span class="tmeta">' + esc(t.file) + (t.line ? ':' + t.line : '') + '</span>' +
              (firstLine ? '<span class="etext">' + esc(firstLine.slice(0, 220)) + '</span>' : '') +
            '</li>';
          }).join('') + '</ul>'
      : '<div class="tmeta" style="margin-bottom:10px">All ' + p.total + ' tests in this protocol passed.</div>';

    return '<tr class="pdetail"><td colspan="11">' + body +
      '<button class="btn small" type="button" data-proto-filter="' + esc(p.module) + '">Show all ' + esc(p.name) + ' tests below</button>' +
      '</td></tr>';
  }

  function renderProtocols(){
    var panel = el('protocol-panel');
    if (!PROTOCOLS.length) { panel.style.display = 'none'; return; }
    panel.style.display = '';
    renderProtocolKpis();

    var rows = PROTOCOLS.filter(function (p) { return !protoState.onlyFailing || p.failed > 0; });
    if (!rows.length) {
      el('protocols').innerHTML = '<div class="empty">No protocol has failures in this run.</div>';
      return;
    }

    el('protocols').innerHTML =
      '<table><thead><tr>' +
        '<th>Protocol</th><th>Health</th>' +
        STAGES.map(function (s) { return '<th class="c" title="' + esc(s.full) + '">' + esc(s.label) + '</th>'; }).join('') +
        '<th class="num">Passed</th><th class="num">Pass rate</th><th>Trend</th><th class="num">Time</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (p) {
        var w = function (n) { return p.total ? (n / p.total) * 100 : 0; };
        var open = protoState.open === p.name;
        var rateColor = p.failed ? 'var(--fail)' : (p.flaky ? 'var(--flaky)' : 'var(--pass)');
        var row = '<tr class="prow' + (open ? ' open' : '') + '" data-proto="' + esc(p.name) + '" tabindex="0" aria-expanded="' + open + '">' +
          '<td><span class="caret">&#9656;</span> <span class="pname">' + esc(p.name) + '</span>' +
            '<div class="tmeta" style="padding-left:16px">' + p.total + ' tests' +
              (p.failed ? ' · <span style="color:var(--fail)">' + p.failed + ' failed</span>' : '') +
              (p.flaky ? ' · ' + p.flaky + ' flaky' : '') + '</div></td>' +
          '<td style="vertical-align:middle"><div class="bar" title="' + p.passRate + '% passing">' +
            '<i class="p" style="width:' + w(p.passed) + '%"></i>' +
            '<i class="k" style="width:' + w(p.flaky) + '%"></i>' +
            '<i class="f" style="width:' + w(p.failed) + '%"></i>' +
          '</div></td>' +
          STAGES.map(function (s) {
            return '<td class="c" style="vertical-align:middle">' + stageCell(p.stages && p.stages[s.key], s.full) + '</td>';
          }).join('') +
          '<td class="num" style="vertical-align:middle">' + (p.passed + p.flaky) + ' / ' + (p.total - p.skipped) + '</td>' +
          '<td class="num" style="vertical-align:middle;font-weight:650;color:' + rateColor + '">' + p.passRate + '%</td>' +
          '<td style="vertical-align:middle">' + sparkline(protocolTrend(p.name)) + '</td>' +
          '<td class="num" style="vertical-align:middle">' + dur(p.duration) + '</td>' +
        '</tr>';
        return row + (open ? protocolDetail(p) : '');
      }).join('') + '</tbody></table>';
  }

  /* ---------- pass-rate ring (inside the overview) ---------- */
  function renderDonut(list){
    var c = counts(list);
    if (!c.total) { el('donut').innerHTML = ''; return; }
    var slices = [
      { key:'passed', value:c.passed }, { key:'failed', value:c.failed },
      { key:'flaky', value:c.flaky }, { key:'skipped', value:c.skipped }
    ].filter(function (s2) { return s2.value > 0; });

    var size = 200, r = 78, sw = 22, cx = size / 2, cy = size / 2;
    var circ = 2 * Math.PI * r, offset = 0;
    var rings = slices.map(function (s2) {
      var frac = s2.value / c.total;
      var seg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none"' +
        ' stroke="' + COLOR[s2.key] + '" stroke-width="' + sw + '"' +
        ' stroke-dasharray="' + (frac * circ) + ' ' + circ + '"' +
        ' stroke-dashoffset="' + (-offset * circ) + '"' +
        ' transform="rotate(-90 ' + cx + ' ' + cy + ')"></circle>';
      offset += frac;
      return seg;
    }).join('');
    var rate = pct(c.passed + c.flaky, c.total - c.skipped);

    el('donut').innerHTML =
      '<svg class="chart" viewBox="0 0 ' + size + ' ' + size + '" style="max-width:210px" role="img" aria-label="Pass rate ' + rate + '%">' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#EEF1F6" stroke-width="' + sw + '"></circle>' +
        rings +
        '<text x="' + cx + '" y="' + (cy + 2) + '" text-anchor="middle" font-size="34" font-weight="700" fill="#1A2333">' + rate + '%</text>' +
        '<text x="' + cx + '" y="' + (cy + 24) + '" text-anchor="middle" font-size="12.5" fill="#78839A">pass rate</text>' +
      '</svg>' +
      '<div class="of">' + (c.passed + c.flaky) + ' of ' + (c.total - c.skipped) + ' executed tests passed</div>';
  }

  /* ---------- trend line chart ---------- */
  function renderTrend(){
    var host = el('trend');
    if (TREND.length < 1) {
      host.innerHTML = '<div class="empty">Run history builds up here from the next run onward.</div>';
      return;
    }
    el('trend-note').textContent = TREND.length === 1
      ? 'First run — lines appear from the next run'
      : 'Last ' + TREND.length + ' runs';

    // Size the drawing to the panel so the chart never balloons on wide screens.
    var W = Math.max(560, Math.round(host.clientWidth || 1000));
    var H = 260, padL = 44, padR = 18, padT = 14, padB = 40;
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

    var single = n === 1;

    var lines = series.map(function (s) {
      var pts = TREND.map(function (p, i) { return x(i) + ',' + y(p[s.key] || 0); }).join(' ');

      // One run has nothing to connect, so draw a short labelled dash
      // instead of leaving a bare dot floating on the grid.
      var stub = '';
      if (single) {
        var cx0 = x(0), cy0 = y(TREND[0][s.key] || 0);
        stub = '<line x1="' + (cx0 - 46) + '" y1="' + cy0 + '" x2="' + (cx0 + 46) + '" y2="' + cy0 + '"' +
          ' stroke="' + s.color + '" stroke-width="3.5" stroke-linecap="round"></line>' +
          '<text x="' + (cx0 + 58) + '" y="' + (cy0 + 4) + '" font-size="12.5" font-weight="600" fill="' + s.color + '">' +
          s.label + ' ' + (TREND[0][s.key] || 0) + '</text>';
      }

      var dots = TREND.map(function (p, i) {
        return '<circle cx="' + x(i) + '" cy="' + y(p[s.key] || 0) + '" r="5"' +
          ' fill="' + s.color + '" stroke="#FFFFFF" stroke-width="2">' +
          '<title>Run #' + esc(p.run) + ' — ' + s.label + ': ' + (p[s.key] || 0) + '</title></circle>';
      }).join('');

      var path = single ? '' :
        '<polyline fill="none" stroke="' + s.color + '" stroke-width="3"' +
        ' stroke-linejoin="round" stroke-linecap="round" points="' + pts + '"></polyline>';

      return path + stub + dots;
    }).join('');

    var everyNth = Math.ceil(n / 12);
    var xLabels = TREND.map(function (p, i) {
      if (i % everyNth !== 0 && i !== n - 1) return '';
      return '<text x="' + x(i) + '" y="' + (H - 16) + '" text-anchor="middle" font-size="11" fill="#78839A">#' + esc(p.run) + '</text>' +
        '<text x="' + x(i) + '" y="' + (H - 3) + '" text-anchor="middle" font-size="10" fill="#A2ABBC">' + esc(String(p.date).slice(5)) + '</text>';
    }).join('');

    host.innerHTML =
      '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '"' +
      ' style="height:' + H + 'px" role="img" aria-label="Test results per run">' +
        grid + lines + xLabels +
        '<line x1="' + padL + '" y1="' + (padT + innerH) + '" x2="' + (W - padR) + '" y2="' + (padT + innerH) + '" stroke="#E2E6EE"></line>' +
      '</svg>' +
      '<div class="legend">' + series.map(function (s) {
        return '<span><i style="background:' + s.color + '"></i>' + s.label + '</span>';
      }).join('') + '</div>' +
      (TREND.length === 1
        ? '<p class="chart-hint">One run recorded so far. Each CI run adds a point and the lines connect up from run two.</p>'
        : '');
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
    foot.push('<span>Generated ' + (META.runTime || new Date(META.generatedAt).toLocaleString()) + '</span>');
    el('foot').innerHTML = foot.join('');
  }

  function renderAllPanels(){
    var list = filtered();
    renderOverview(list);
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

    // Protocol panel: expand a row, or jump the rest of the page to that protocol.
    function toggleProtocol(row){
      var name = row.getAttribute('data-proto');
      protoState.open = protoState.open === name ? '' : name;
      renderProtocols();
    }
    el('protocols').addEventListener('click', function (e) {
      var jump = e.target.closest('[data-proto-filter]');
      if (jump) {
        state.module = jump.getAttribute('data-proto-filter');
        state.status = '';
        sel.value = state.module; el('f-status').value = '';
        sync();
        el('all-tests').scrollIntoView({ behavior:'smooth', block:'start' });
        return;
      }
      var row = e.target.closest('tr.prow');
      if (row) toggleProtocol(row);
    });
    el('protocols').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var row = e.target.closest('tr.prow');
      if (!row) return;
      e.preventDefault();
      toggleProtocol(row);
    });
    el('proto-only').addEventListener('change', function (e) {
      protoState.onlyFailing = e.target.checked;
      renderProtocols();
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
  renderProtocols();
  renderAllPanels();

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderTrend, 150);
  });
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
  const protocols = buildProtocols(tests);
  const trend = buildTrend(stats, protocols);

  if (raw && raw.stats && raw.stats.duration) {
    stats.wallClock = raw.stats.duration;
  }

  const passRate = rateOf(stats);

  // "totals" is what the workflow's Parse Test Results step reads,
  // so Slack and the dashboard can never disagree.
  const totals = {
    passed: stats.passed,
    failed: stats.failed,
    flaky: stats.flaky,
    skipped: stats.skipped,
    total: stats.total,
    duration: stats.duration,
    passRate,
  };

  const payload = { meta, totals, stats, modules, protocols, tests, trend };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderHtml(payload));
  fs.writeFileSync(path.join(OUT_DIR, 'data.json'), JSON.stringify(payload, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'history.json'), JSON.stringify(trend, null, 2));

  console.log('========================================');
  console.log('DASHBOARD BUILT');
  console.log('========================================');
  console.log(`Tests    : ${stats.total}`);
  console.log(`Passed   : ${stats.passed}`);
  console.log(`Failed   : ${stats.failed}`);
  console.log(`Flaky    : ${stats.flaky}`);
  console.log(`Skipped  : ${stats.skipped}`);
  console.log(`Pass rate: ${passRate}%`);
  console.log(`Modules  : ${modules.map((m) => m.name).join(', ') || '(none)'}`);
  console.log(`Protocols: ${protocols.map((p) => `${p.name} (${p.passRate}%)`).join(', ') || '(none)'}`);
  console.log(`Output   : ${path.join(OUT_DIR, 'index.html')}`);
  console.log('========================================');
}

main();