import { test } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// ============================================================
// SMOKE TEST - ALL PROTOCOLS, ONE TEST
//
//   npx playwright test tests/Smoke_Protocols.spec.js
//
// One test, "Smoke_All_Protocols". It runs the protocol suites in this folder
// (every Protocol_*.spec.js), one protocol after another, and tells you, per
// protocol, what passed and WHICH TEST FAILED.
//
// HOW MUCH IT RUNS - SMOKE_LEVEL (optional)
//   load        one test per protocol: it opens and shows its first question
//   assessment  one test per protocol: every question answered      (default)
//   e2e         one test per protocol: the whole visit, with the upload
//   all         EVERY test case of EVERY protocol           (many hours)
//   e.g.  SMOKE_LEVEL=all npx playwright test tests/Smoke_Protocols.spec.js
//
// OTHER SETTINGS (all optional)
//   SMOKE_ONLY=cough,fever   only these protocols (to split a long run)
//   SMOKE_RESUME=1           keep the protocols that already finished in the
//                            last run of the same level, run only the rest
//   SMOKE_RETRIES=0          retries per failing test (default: your config)
//
// A protocol you add later is included automatically: add its
// Protocol_*.spec.js and run this again. Nothing in this file changes.
//
// WHERE TO LOOK (the files are rewritten after every protocol, so you can
// open them while the run is still going)
//   smoke-results/last-result.txt   the table, one row per protocol
//   smoke-results/failed-tests.txt  every failed test, grouped by protocol
//   smoke-results/last-run.log      live progress:  tail -f smoke-results/last-run.log
//   smoke-results/<level>/report/<protocol>   report of one protocol:
//                                   npx playwright show-report smoke-results/<level>/report/<protocol>
// ============================================================

const LEVELS = {
  load: 'Verify_Visit_Reason_Selection_Starts_Assessment',
  assessment: 'Verify_Full_Assessment_Completes',
  e2e: 'Verify_End_To_End',
  all: null // no filter: every test
};
const LEVEL = String(process.env.SMOKE_LEVEL || 'assessment').toLowerCase();
const LEVEL_IS_VALID = Object.prototype.hasOwnProperty.call(LEVELS, LEVEL);
const PATTERN = LEVELS[LEVEL];
const RESUME = String(process.env.SMOKE_RESUME || '') === '1';

const ROOT_DIR = path.resolve('smoke-results');
const LEVEL_DIR = path.join(ROOT_DIR, LEVEL);
const JSON_DIR = path.join(LEVEL_DIR, 'json');
const LOG_FILE = path.join(ROOT_DIR, 'last-run.log');
const TABLE_FILE = path.join(ROOT_DIR, 'last-result.txt');
const FAILED_FILE = path.join(ROOT_DIR, 'failed-tests.txt');

// One long test, never retried (a retry would run every protocol again).
test.describe.configure({ retries: 0 });

const stripAnsi = (text) => String(text ?? '').replace(/\x1b\[[0-9;]*m/g, '');
const normalise = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '');

function duration(ms) {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m${String(s % 60).padStart(2, '0')}s`;
}

// "Protocol_BackAndNeckPain.spec.js" -> "Back And Neck Pain"
function protocolNameOf(file) {
  return path
    .basename(file)
    .replace(/^Protocol_/, '')
    .replace(/\.spec\.[cm]?[jt]s$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

// Which protocols to run: all, or the ones named in SMOKE_ONLY. A name matches
// a protocol exactly ("fever" is Fever, not Fever And Rash), or, when nothing
// matches exactly, any protocol whose name contains it ("rash").
function chooseSuites(all) {
  const wanted = String(process.env.SMOKE_ONLY || '').split(',').map(normalise).filter(Boolean);
  if (!wanted.length) return all;
  const picked = new Set();
  for (const token of wanted) {
    const exact = all.filter((f) => normalise(protocolNameOf(f)) === token);
    const matches = exact.length ? exact : all.filter((f) => normalise(protocolNameOf(f)).includes(token));
    matches.forEach((f) => picked.add(f));
  }
  return all.filter((f) => picked.has(f));
}

// Runs a command, appending everything it prints to the log file as it goes.
function run(command, args, env) {
  return new Promise((resolve) => {
    const log = fs.createWriteStream(LOG_FILE, { flags: 'a' });
    const child = spawn(command, args, { env, shell: process.platform === 'win32' });
    child.stdout.on('data', (chunk) => log.write(chunk));
    child.stderr.on('data', (chunk) => log.write(chunk));
    child.on('error', (error) => {
      log.write(`\nCould not start: ${error.message}\n`);
      log.end(() => resolve(-1));
    });
    child.on('close', (code) => log.end(() => resolve(code)));
  });
}

function collectSpecs(suite, found = []) {
  for (const spec of suite.specs || []) found.push(spec);
  for (const child of suite.suites || []) collectSpecs(child, found);
  return found;
}

function firstLine(text, max = 200) {
  const line = (stripAnsi(text).split('\n').map((l) => l.trim()).filter(Boolean)[0] || '').replace(/^Error:\s*/, '');
  return line.length > max ? `${line.slice(0, max - 3)}...` : line;
}

// Turns one protocol's JSON result into counts and the list of failed tests.
function summarize(file, jsonFile) {
  const row = { name: protocolNameOf(file), file, total: 0, passed: 0, flaky: 0, skipped: 0, failed: [], ms: 0, state: 'ok', note: '' };

  if (!fs.existsSync(jsonFile)) return { ...row, state: 'NO RESULT', note: 'the run produced no result file' };

  let report;
  try {
    report = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  } catch {
    return { ...row, state: 'NO RESULT', note: 'the result file could not be read' };
  }

  const specs = (report.suites || []).flatMap((s) => collectSpecs(s));
  const loadErrors = (report.errors || []).map((e) => firstLine(e.message || '', 220)).filter(Boolean);
  if (!specs.length && loadErrors.length) {
    // "No tests found" just means the file has no test of the chosen level.
    if (/^No tests found/i.test(loadErrors[0])) {
      return { ...row, state: 'NO TEST', note: PATTERN ? `no test named *${PATTERN}* in ${file}` : `no tests in ${file}` };
    }
    return { ...row, state: 'ERROR', note: loadErrors[0] };
  }

  for (const spec of specs) {
    for (const t of spec.tests || []) {
      const results = t.results || [];
      const last = results[results.length - 1] || {};
      row.ms += results.reduce((sum, r) => sum + (r.duration || 0), 0);
      row.total += 1;
      if (t.status === 'skipped') row.skipped += 1;
      else if (t.status === 'expected') row.passed += 1;
      else if (t.status === 'flaky') { row.passed += 1; row.flaky += 1; }
      else {
        const message = (last.error && last.error.message) || (last.errors && last.errors[0] && last.errors[0].message) || last.status || 'failed';
        row.failed.push({ title: spec.title, error: firstLine(message) });
      }
    }
  }

  if (!row.total) return { ...row, state: 'NO TEST', note: PATTERN ? `no test named *${PATTERN}* in ${file}` : `no tests in ${file}` };
  if (!row.passed && !row.failed.length) return { ...row, state: 'SKIPPED' };
  return row;
}

const isGood = (row) => row.state === 'ok' && row.failed.length === 0;
const verdict = (row) => (row.state !== 'ok' ? row.state : row.failed.length ? 'FAIL' : 'PASS');

function buildTable(rows, waiting, startedAt) {
  const all = [...rows, ...waiting.map((file) => ({ name: protocolNameOf(file), waiting: true }))];
  const width = Math.max(...all.map((r) => r.name.length), 10) + 2;
  const head = `${'PROTOCOL'.padEnd(width)}${'RESULT'.padEnd(10)}${'TESTS'.padEnd(7)}${'PASSED'.padEnd(8)}${'FAILED'.padEnd(8)}${'TIME'.padEnd(8)}NOTE`;

  const lines = all.map((r) => {
    if (r.waiting) return `${r.name.padEnd(width)}${'waiting'.padEnd(10)}`;
    const note = r.note || [r.flaky ? `${r.flaky} passed on a retry` : '', r.skipped ? `${r.skipped} skipped` : ''].filter(Boolean).join(', ');
    return `${r.name.padEnd(width)}${verdict(r).padEnd(10)}${String(r.total).padEnd(7)}${String(r.passed).padEnd(8)}${String(r.failed.length).padEnd(8)}${duration(r.ms).padEnd(8)}${note}`;
  });

  const tests = rows.reduce((s, r) => s + r.total, 0);
  const passed = rows.reduce((s, r) => s + r.passed, 0);
  const failed = rows.reduce((s, r) => s + r.failed.length, 0);

  return [
    `Smoke test, level "${LEVEL}"${PATTERN ? ` (${PATTERN})` : ' (every test case)'}`,
    `Started ${new Date(startedAt).toISOString().slice(0, 16).replace('T', ' ')}, running for ${duration(Date.now() - startedAt)}`,
    '',
    head,
    ...lines,
    '',
    `${rows.filter(isGood).length} of ${all.length} protocols fully passed. Tests: ${tests} run, ${passed} passed, ${failed} failed.`
  ].join('\n');
}

function buildFailedList(rows) {
  const bad = rows.filter((r) => !isGood(r));
  if (!bad.length) return 'No failed tests.';
  const failedTests = rows.reduce((sum, r) => sum + r.failed.length, 0);
  const cannotRun = rows.filter((r) => r.state !== 'ok').length;
  const lines = [`FAILED TESTS: ${failedTests}${cannotRun ? `   PROTOCOLS THAT COULD NOT RUN: ${cannotRun}` : ''}`, ''];
  for (const r of bad) {
    if (r.state !== 'ok') {
      lines.push(`${r.name}  -  ${r.state}${r.note ? `: ${r.note}` : ''}`, '');
      continue;
    }
    lines.push(`${r.name}  (${r.failed.length} failed of ${r.total})`);
    for (const f of r.failed) lines.push(`  - ${f.title}`, `      ${f.error}`);
    lines.push('');
  }
  return lines.join('\n');
}

test('Smoke_All_Protocols', async () => {
  test.setTimeout(0); // as long as all the protocols take

  if (!LEVEL_IS_VALID) throw new Error(`SMOKE_LEVEL must be one of: ${Object.keys(LEVELS).join(', ')}`);

  const info = test.info();
  const testDir = info.project.testDir;
  const available = fs.readdirSync(testDir).filter((f) => /^Protocol_.+\.spec\.[cm]?[jt]s$/.test(f)).sort();
  if (!available.length) throw new Error(`No Protocol_*.spec.js files were found in ${testDir}`);

  const suites = chooseSuites(available);
  if (!suites.length) {
    throw new Error(`SMOKE_ONLY="${process.env.SMOKE_ONLY}" matches no protocol. The protocols are: ${available.map(protocolNameOf).join(', ')}`);
  }

  fs.mkdirSync(JSON_DIR, { recursive: true });
  fs.writeFileSync(LOG_FILE, '');

  const startedAt = Date.now();
  const rows = [];

  for (let i = 0; i < suites.length; i++) {
    const file = suites[i];
    const slug = normalise(protocolNameOf(file));
    const jsonFile = path.join(JSON_DIR, `${slug}.json`);

    // Resume: keep a protocol that already has a readable result from the last run.
    let row = null;
    if (RESUME && fs.existsSync(jsonFile)) {
      const kept = summarize(file, jsonFile);
      if (kept.state !== 'NO RESULT') row = { ...kept, note: kept.note || 'kept from the earlier run' };
    }

    if (!row) {
      fs.rmSync(jsonFile, { force: true });
      fs.appendFileSync(LOG_FILE, `\n===== ${protocolNameOf(file)}  (${i + 1} of ${suites.length}) =====\n`);

      const args = [
        'playwright', 'test', `${file.replace(/\./g, '\\.')}$`,
        ...(PATTERN ? ['--grep', PATTERN] : []),
        `--project=${info.project.name}`,
        '--workers=1',
        '--reporter=list,json,html',
        '--output', path.join(LEVEL_DIR, 'artifacts', slug)
      ];
      if (process.env.SMOKE_RETRIES !== undefined && process.env.SMOKE_RETRIES !== '') {
        args.push(`--retries=${Number(process.env.SMOKE_RETRIES)}`);
      }

      await run('npx', args, {
        ...process.env,
        PLAYWRIGHT_JSON_OUTPUT_NAME: jsonFile,
        PLAYWRIGHT_HTML_REPORT: path.join(LEVEL_DIR, 'report', slug),
        PLAYWRIGHT_HTML_OPEN: 'never'
      });
      row = summarize(file, jsonFile);
    }

    rows.push(row);

    // rewritten after every protocol, so it can be read while the run goes on
    const table = buildTable(rows, suites.slice(i + 1), startedAt);
    fs.writeFileSync(TABLE_FILE, table);
    fs.writeFileSync(FAILED_FILE, buildFailedList(rows));
    fs.appendFileSync(LOG_FILE, `\n----- so far -----\n${table}\n`);
  }

  const table = buildTable(rows, [], startedAt);
  const failedList = buildFailedList(rows);
  await info.attach('result table', { body: table, contentType: 'text/plain' });
  await info.attach('failed tests', { body: failedList, contentType: 'text/plain' });

  const bad = rows.filter((r) => !isGood(r));
  if (bad.length) {
    const failedCount = rows.reduce((s, r) => s + r.failed.length, 0);
    throw new Error(
      `${bad.length} of ${rows.length} protocol(s) need attention (${failedCount} failed test(s)):\n\n${table}\n\n${failedList}\n` +
      `Files: ${TABLE_FILE}, ${FAILED_FILE}, ${LOG_FILE}`
    );
  }
});