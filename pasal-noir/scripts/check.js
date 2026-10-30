/* Pemeriksaan cepat tanpa dependensi: sintaks JS di .gs dan <script> pada Index.html,
 * ditambah pengecekan struktur data contoh. Jalankan: npm test */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = path.join(__dirname, '..', 'src');
let failed = 0;
const ok = m => console.log('  ✔ ' + m);
const bad = m => { console.error('  ✘ ' + m); failed++; };

function compile(name, code) {
  try { new vm.Script(code, { filename: name }); ok('sintaks ' + name); }
  catch (e) { bad(name + ': ' + e.message); }
}

['Code.gs', 'Setup.gs'].forEach(f => compile(f, fs.readFileSync(path.join(src, f), 'utf8')));

const html = fs.readFileSync(path.join(src, 'Index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
scripts.forEach((s, i) => compile('Index.html <script> #' + (i + 1), s));
if (!scripts.length) bad('Index.html tidak memiliki <script>');

try { JSON.parse(fs.readFileSync(path.join(src, 'appsscript.json'), 'utf8')); ok('appsscript.json valid'); }
catch (e) { bad('appsscript.json: ' + e.message); }

// Data contoh: ID unik, kunci jawaban valid, setiap kasus punya soal
try {
  const sandbox = {
    Utilities: {}, Session: {}, CacheService: {}, LockService: {}, SpreadsheetApp: {}, HtmlService: {}, Logger: { log() {} }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(src, 'Code.gs'), 'utf8') + '\n' + fs.readFileSync(path.join(src, 'Setup.gs'), 'utf8'), sandbox);
  const store = { Kasus: [], Petunjuk: [], Pertanyaan: [] };
  vm.runInContext('rows_ = function(n, o){ __store[n] = (__store[n] || []).concat(o); }; ss_ = function(){return {};};', Object.assign(sandbox, { __store: store }));
  vm.runInContext('seedSample_()', sandbox);
  const ids = a => a.map(x => x[Object.keys(x)[0]]);
  const uniq = a => new Set(a).size === a.length;
  uniq(ids(store.Kasus)) ? ok('CaseID unik (' + store.Kasus.length + ' kasus)') : bad('CaseID duplikat');
  uniq(ids(store.Pertanyaan)) ? ok('QID unik (' + store.Pertanyaan.length + ' soal)') : bad('QID duplikat');
  uniq(ids(store.Petunjuk)) ? ok('ClueID unik (' + store.Petunjuk.length + ' petunjuk)') : bad('ClueID duplikat');
  store.Pertanyaan.forEach(q => { if (!'ABCD'.includes(q.Kunci) || !q['Opsi' + q.Kunci]) bad('Kunci tidak valid pada ' + q.QID); });
  store.Kasus.forEach(k => { if (!store.Pertanyaan.some(q => q.CaseID === k.CaseID)) bad('Kasus ' + k.CaseID + ' belum punya soal'); });
  const lv = {}; store.Kasus.forEach(k => lv[k.Level] = (lv[k.Level] || 0) + 1);
  ok('sebaran level: ' + JSON.stringify(lv));
} catch (e) { bad('pengecekan data contoh: ' + e.message); }

console.log(failed ? `\nGAGAL: ${failed} masalah` : '\nSemua pemeriksaan lolos.');
process.exit(failed ? 1 : 0);
