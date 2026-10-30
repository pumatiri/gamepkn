/**
 * ============================================================
 *  PASAL NOIR — Detektif Konstitusi   (Backend / Code.gs)
 *  Game edukasi PKN SMP · Google Apps Script Web App
 * ============================================================
 *  Cara pakai singkat:
 *   1. Buka Google Sheet kosong → Extensions → Apps Script.
 *   2. Tempel Code.gs, Setup.gs, dan buat file HTML "Index".
 *   3. Jalankan fungsi setup() sekali (beri izin).
 *   4. Deploy → New deployment → Web app
 *        Execute as: Me   |  Who has access: Anyone
 *   5. Login pertama: admin / admin123  (SEGERA ganti password!)
 *
 *  Keamanan:
 *   - Kunci jawaban TIDAK PERNAH dikirim ke browser sebelum soal dijawab.
 *   - Skor dihitung di server (anti-curang), bukan di browser.
 *   - Password disimpan sebagai hash SHA-256 + salt.
 *   - Sesi memakai token acak (CacheService, 6 jam).
 *   - Login dibatasi: 5x salah → terkunci 5 menit.
 */

var CONFIG = {
  SPREADSHEET_ID: '',      // kosongkan jika script dibuat dari dalam Sheet (container-bound)
  SESSION_TTL: 21600,      // detik (6 jam)
  MAX_FAIL: 5,
  LOCK_SEC: 300,
  GAME_NAME: 'Pasal Noir'
};

var SCHEMA = {
  Users:      ['UserID','Nama','Kelas','Username','PassHash','Salt','Role','Avatar','Status','Dibuat','LoginTerakhir'],
  Kasus:      ['CaseID','Urutan','Judul','Kategori','Level','Lokasi','Ikon','Warna','Ringkasan','Narasi','Tokoh','Tujuan','Status'],
  Petunjuk:   ['ClueID','CaseID','Urutan','Judul','Jenis','Isi','Biaya'],
  Pertanyaan: ['QID','CaseID','Urutan','Pertanyaan','OpsiA','OpsiB','OpsiC','OpsiD','Kunci','Pasal','BunyiPasal','Penjelasan','Poin'],
  Hasil:      ['ResultID','UserID','Username','Nama','Kelas','CaseID','Skor','Max','Benar','Total','Petunjuk','Durasi','Bintang','Waktu','Detail'],
  Pengaturan: ['Kunci','Nilai']
};

var RANKS = [
  { n: 'Detektif Magang',      i: 'fa-user-secret',      min: 0 },
  { n: 'Detektif Muda',        i: 'fa-magnifying-glass', min: 80 },
  { n: 'Detektif Madya',       i: 'fa-fingerprint',      min: 200 },
  { n: 'Inspektur Konstitusi', i: 'fa-scale-balanced',   min: 350 },
  { n: 'Komisaris Agung',      i: 'fa-crown',            min: 500 }
];

/* ---------------------- Web App entry ---------------------- */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Pasal Noir — Detektif Konstitusi')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* Satu pintu masuk RPC dari browser (google.script.run.rpc) */
function rpc(fn, args) {
  try {
    if (!Object.prototype.hasOwnProperty.call(H, fn)) throw new Error('Perintah tidak dikenal.');
    return { ok: true, data: H[fn].apply(null, args || []) };
  } catch (e) {
    return { ok: false, msg: (e && e.message) ? e.message : String(e) };
  }
}

/* ---------------------- Utilitas data ---------------------- */
function ss_() {
  return CONFIG.SPREADSHEET_ID ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}
function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Sheet "' + name + '" belum ada. Jalankan fungsi setup() di Apps Script.');
  return sh;
}
function headers_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
}
function table_(name) {
  var sh = sheet_(name);
  var v = sh.getDataRange().getValues();
  var h = v.shift();
  var out = [];
  for (var i = 0; i < v.length; i++) {
    if (v[i][0] === '' || v[i][0] === null) continue;
    var o = { _row: i + 2 };
    for (var j = 0; j < h.length; j++) o[h[j]] = v[i][j];
    out.push(o);
  }
  return out;
}
function append_(name, obj) {
  var sh = sheet_(name);
  var h = headers_(sh);
  sh.appendRow(h.map(function (k) { return obj[k] === undefined ? '' : obj[k]; }));
}
function setCell_(name, row, key, val) {
  var sh = sheet_(name);
  var col = headers_(sh).indexOf(key) + 1;
  if (col < 1) throw new Error('Kolom ' + key + ' tidak ditemukan di sheet ' + name);
  sh.getRange(row, col).setValue(val);
}
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function uid_(p) { return p + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase(); }
function nowStr_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }
function fmt_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  return v === null || v === undefined ? '' : String(v);
}
function num_(v, d) { var n = Number(v); return isNaN(n) ? (d || 0) : n; }
function clean_(s, max) { return String(s === undefined || s === null ? '' : s).replace(/^[=+\-@\s]+/, '').replace(/\s+/g, ' ').trim().slice(0, max || 60); }
function hash_(salt, pw) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + pw, Utilities.Charset.UTF_8);
  return d.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}
function getSettings_() {
  var s = {};
  try { table_('Pengaturan').forEach(function (r) { s[String(r.Kunci)] = r.Nilai === null ? '' : String(r.Nilai); }); } catch (e) {}
  return s;
}
function setSetting_(key, val) {
  var rows = table_('Pengaturan');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].Kunci) === key) { setCell_('Pengaturan', rows[i]._row, 'Nilai', val); return; }
  }
  append_('Pengaturan', { Kunci: key, Nilai: val });
}

/* ---------------------- Sesi & autentikasi ---------------------- */
function pubUser_(u) {
  return { id: String(u.UserID), nama: String(u.Nama), kelas: String(u.Kelas), username: String(u.Username), role: String(u.Role), avatar: String(u.Avatar || '🕵️') };
}
function newSession_(uid) {
  var t = Utilities.getUuid() + Utilities.getUuid().slice(0, 8);
  CacheService.getScriptCache().put('sess_' + t, String(uid), CONFIG.SESSION_TTL);
  return t;
}
function auth_(token) {
  if (!token) throw new Error('Sesi berakhir. Silakan masuk lagi.');
  var uid = CacheService.getScriptCache().get('sess_' + token);
  if (!uid) throw new Error('Sesi berakhir. Silakan masuk lagi.');
  var users = table_('Users');
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].UserID) === uid) {
      if (String(users[i].Status) !== 'Aktif') throw new Error('Sesi berakhir. Akun dinonaktifkan.');
      return users[i];
    }
  }
  throw new Error('Sesi berakhir. Silakan masuk lagi.');
}
function admin_(token) {
  var u = auth_(token);
  if (String(u.Role) !== 'admin') throw new Error('Akses ditolak: khusus admin.');
  return u;
}

/* ---------------------- Perhitungan XP & pangkat ---------------------- */
function rankOf_(xp) {
  var cur = RANKS[0], nxt = null;
  for (var i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].min) { cur = RANKS[i]; nxt = RANKS[i + 1] || null; }
  }
  return { name: cur.n, icon: cur.i, min: cur.min, next: nxt ? nxt.min : null, nextName: nxt ? nxt.n : null };
}
/* Skor terbaik per (user, kasus) */
function bestMap_(hasil) {
  var m = {};
  hasil.forEach(function (r) {
    var u = String(r.UserID), c = String(r.CaseID);
    m[u] = m[u] || {};
    var sk = num_(r.Skor);
    if (!m[u][c] || sk > m[u][c].skor) m[u][c] = { skor: sk, bintang: num_(r.Bintang), max: num_(r.Max) };
  });
  return m;
}
function xpOf_(bm, uid) {
  var t = 0, c = bm[uid] || {};
  Object.keys(c).forEach(function (k) { t += c[k].skor; });
  return t;
}
function starsOf_(skor, max) {
  if (!max) return 0;
  var p = skor / max;
  return p >= 0.85 ? 3 : p >= 0.6 ? 2 : p >= 0.35 ? 1 : 0;
}

var H = {};

/* ===================== PUBLIK ===================== */
H.publicInfo = function () {
  var s = getSettings_();
  return { nama: s.NamaGame || CONFIG.GAME_NAME, needCode: !!s.KodeDaftar, pengumuman: s.Pengumuman || '' };
};

H.register = function (t, d) {
  d = d || {};
  var nama = clean_(d.nama, 40), kelas = clean_(d.kelas, 12).toUpperCase();
  var username = String(d.username || '').trim().toLowerCase();
  var pw = String(d.password || '');
  if (nama.length < 3) throw new Error('Nama lengkap minimal 3 huruf.');
  if (!kelas) throw new Error('Kelas wajib diisi (contoh: 8A).');
  if (!/^[a-z0-9_.]{4,20}$/.test(username)) throw new Error('Username 4–20 karakter: huruf, angka, titik, atau underscore.');
  if (pw.length < 6) throw new Error('Password minimal 6 karakter.');
  var s = getSettings_();
  if (s.KodeDaftar && String(d.kode || '').trim().toLowerCase() !== String(s.KodeDaftar).trim().toLowerCase()) {
    throw new Error('Kode pendaftaran kelas salah. Tanyakan pada gurumu.');
  }
  return withLock_(function () {
    var users = table_('Users');
    for (var i = 0; i < users.length; i++) {
      if (String(users[i].Username).toLowerCase() === username) throw new Error('Username sudah dipakai. Pilih yang lain.');
    }
    var salt = Utilities.getUuid();
    var id = uid_('U');
    append_('Users', {
      UserID: id, Nama: nama, Kelas: kelas, Username: username, PassHash: hash_(salt, pw), Salt: salt,
      Role: 'siswa', Avatar: String(d.avatar || '🕵️').slice(0, 8), Status: 'Aktif', Dibuat: nowStr_(), LoginTerakhir: nowStr_()
    });
    var u = { UserID: id, Nama: nama, Kelas: kelas, Username: username, Role: 'siswa', Avatar: d.avatar || '🕵️' };
    return { token: newSession_(id), user: pubUser_(u) };
  });
};

H.login = function (t, d) {
  d = d || {};
  var username = String(d.username || '').trim().toLowerCase();
  var pw = String(d.password || '');
  if (!username || !pw) throw new Error('Isi username dan password.');
  var cache = CacheService.getScriptCache();
  var fk = 'fail_' + username;
  if (num_(cache.get(fk)) >= CONFIG.MAX_FAIL) throw new Error('Terlalu banyak percobaan. Coba lagi dalam 5 menit.');
  var users = table_('Users');
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (String(u.Username).toLowerCase() === username) {
      if (hash_(String(u.Salt), pw) === String(u.PassHash)) {
        if (String(u.Status) !== 'Aktif') throw new Error('Akun dinonaktifkan. Hubungi guru/admin.');
        cache.remove(fk);
        setCell_('Users', u._row, 'LoginTerakhir', nowStr_());
        return { token: newSession_(u.UserID), user: pubUser_(u) };
      }
      break;
    }
  }
  cache.put(fk, String(num_(cache.get(fk)) + 1), CONFIG.LOCK_SEC);
  throw new Error('Username atau password salah.');
};

/* ===================== SISWA ===================== */
H.session = function (t) { return { user: pubUser_(auth_(t)) }; };

H.logout = function (t) {
  if (t) CacheService.getScriptCache().remove('sess_' + t);
  return true;
};

H.changePassword = function (t, oldPw, newPw) {
  var u = auth_(t);
  if (hash_(String(u.Salt), String(oldPw || '')) !== String(u.PassHash)) throw new Error('Password lama salah.');
  if (String(newPw || '').length < 6) throw new Error('Password baru minimal 6 karakter.');
  var salt = Utilities.getUuid();
  setCell_('Users', u._row, 'Salt', salt);
  setCell_('Users', u._row, 'PassHash', hash_(salt, String(newPw)));
  return true;
};

H.cases = function (t) {
  var u = auth_(t);
  var qs = table_('Pertanyaan'), kasus = table_('Kasus'), hasil = table_('Hasil');
  var qCount = {}, qMax = {};
  qs.forEach(function (q) {
    var c = String(q.CaseID);
    qCount[c] = (qCount[c] || 0) + 1;
    qMax[c] = (qMax[c] || 0) + num_(q.Poin, 20);
  });
  var bm = bestMap_(hasil);
  var mine = bm[String(u.UserID)] || {};
  var xp = xpOf_(bm, String(u.UserID));
  var list = kasus.filter(function (k) { return String(k.Status) === 'Aktif'; })
    .sort(function (a, b) { return num_(a.Urutan) - num_(b.Urutan); })
    .map(function (k) {
      var c = String(k.CaseID), b = mine[c];
      return {
        id: c, judul: String(k.Judul), kategori: String(k.Kategori), level: String(k.Level), lokasi: String(k.Lokasi),
        ikon: String(k.Ikon || 'fa-folder-open'), warna: String(k.Warna || 'amber'), ringkasan: String(k.Ringkasan),
        soal: qCount[c] || 0, max: qMax[c] || 0, best: b ? b.skor : null, bintang: b ? b.bintang : 0
      };
    });
  var done = list.filter(function (c) { return c.best !== null; }).length;
  var stars = 0; list.forEach(function (c) { stars += c.bintang; });
  var board = leaderboard_(hasil, bm);
  var myPos = 0;
  for (var i = 0; i < board.length; i++) if (board[i].id === String(u.UserID)) { myPos = i + 1; break; }
  return { cases: list, xp: xp, rank: rankOf_(xp), selesai: done, bintang: stars, posisi: myPos, totalSiswa: board.length };
};

H.startCase = function (t, caseId) {
  var u = auth_(t);
  var k = findCase_(caseId);
  var clues = table_('Petunjuk').filter(function (c) { return String(c.CaseID) === String(caseId); })
    .sort(function (a, b) { return num_(a.Urutan) - num_(b.Urutan); });
  var qs = questionsOf_(caseId);
  if (!qs.length) throw new Error('Kasus ini belum punya pertanyaan.');
  var att = { start: Date.now(), answers: {}, clues: [] };
  CacheService.getScriptCache().put(attKey_(u, caseId), JSON.stringify(att), CONFIG.SESSION_TTL);
  return {
    kasus: {
      id: String(k.CaseID), judul: String(k.Judul), kategori: String(k.Kategori), level: String(k.Level), lokasi: String(k.Lokasi),
      ikon: String(k.Ikon || 'fa-folder-open'), warna: String(k.Warna || 'amber'), narasi: String(k.Narasi),
      tokoh: String(k.Tokoh || '').split('|').map(function (s) { return s.trim(); }).filter(String),
      tujuan: String(k.Tujuan || '')
    },
    petunjuk: clues.map(function (c) {
      var biaya = num_(c.Biaya);
      return {
        id: String(c.ClueID), judul: String(c.Judul), jenis: String(c.Jenis), biaya: biaya,
        isi: biaya === 0 ? String(c.Isi) : null
      };
    }),
    soal: qs.map(function (q) {
      var o = {};
      ['A', 'B', 'C', 'D'].forEach(function (L) { var v = q['Opsi' + L]; if (v !== '' && v !== null && v !== undefined) o[L] = String(v); });
      return { id: String(q.QID), teks: String(q.Pertanyaan), opsi: o, poin: num_(q.Poin, 20) };
    })
  };
};

H.openClue = function (t, caseId, clueId) {
  var u = auth_(t);
  var att = getAtt_(u, caseId);
  var clue = null;
  table_('Petunjuk').forEach(function (c) { if (String(c.ClueID) === String(clueId) && String(c.CaseID) === String(caseId)) clue = c; });
  if (!clue) throw new Error('Petunjuk tidak ditemukan.');
  var biaya = num_(clue.Biaya);
  if (biaya > 0 && att.clues.indexOf(String(clueId)) < 0) {
    att.clues.push(String(clueId));
    saveAtt_(u, caseId, att);
  }
  return { id: String(clue.ClueID), isi: String(clue.Isi), biaya: biaya };
};

H.answer = function (t, caseId, qid, choice) {
  var u = auth_(t);
  var att = getAtt_(u, caseId);
  choice = String(choice || '').toUpperCase();
  var q = null;
  questionsOf_(caseId).forEach(function (x) { if (String(x.QID) === String(qid)) q = x; });
  if (!q) throw new Error('Pertanyaan tidak ditemukan.');
  if (['A', 'B', 'C', 'D'].indexOf(choice) < 0 || !q['Opsi' + choice]) throw new Error('Pilihan tidak valid.');
  var key = String(q.Kunci).toUpperCase().trim();
  var prev = att.answers[String(qid)];
  var ok = prev ? prev.ok : (choice === key);
  var got = prev ? prev.p : (ok ? num_(q.Poin, 20) : 0);
  if (!prev) {
    att.answers[String(qid)] = { c: choice, ok: ok ? 1 : 0, p: got };
    saveAtt_(u, caseId, att);
  }
  return {
    benar: !!ok, kunci: key, poin: got, pilihan: prev ? prev.c : choice,
    pasal: String(q.Pasal || ''), bunyi: String(q.BunyiPasal || ''), penjelasan: String(q.Penjelasan || ''),
    terjawab: Object.keys(att.answers).length
  };
};

H.finish = function (t, caseId) {
  var u = auth_(t);
  var att = getAtt_(u, caseId);
  var qs = questionsOf_(caseId);
  if (Object.keys(att.answers).length < qs.length) throw new Error('Jawab semua pertanyaan dulu sebelum menutup kasus.');
  var clues = table_('Petunjuk').filter(function (c) { return String(c.CaseID) === String(caseId); });
  var cost = 0;
  clues.forEach(function (c) { if (att.clues.indexOf(String(c.ClueID)) >= 0) cost += num_(c.Biaya); });
  var sum = 0, max = 0, benar = 0, detail = [], review = [];
  qs.forEach(function (q) {
    var a = att.answers[String(q.QID)];
    max += num_(q.Poin, 20);
    sum += a.p; benar += a.ok;
    detail.push({ q: String(q.QID), ok: a.ok, c: a.c });
    review.push({ teks: String(q.Pertanyaan), benar: !!a.ok, pasal: String(q.Pasal || '') });
  });
  var skor = Math.max(0, sum - cost);
  var bintang = starsOf_(skor, max);
  var durasi = Math.round((Date.now() - att.start) / 1000);
  return withLock_(function () {
    var hasil = table_('Hasil');
    var bmBefore = bestMap_(hasil);
    var xpBefore = xpOf_(bmBefore, String(u.UserID));
    append_('Hasil', {
      ResultID: uid_('R'), UserID: String(u.UserID), Username: String(u.Username), Nama: String(u.Nama), Kelas: String(u.Kelas),
      CaseID: String(caseId), Skor: skor, Max: max, Benar: benar, Total: qs.length, Petunjuk: att.clues.length,
      Durasi: durasi, Bintang: bintang, Waktu: nowStr_(), Detail: JSON.stringify(detail)
    });
    var mine = bmBefore[String(u.UserID)] || {};
    var prevBest = mine[String(caseId)] ? mine[String(caseId)].skor : 0;
    var xpAfter = xpBefore + Math.max(0, skor - prevBest);
    CacheService.getScriptCache().remove(attKey_(u, caseId));
    var rb = rankOf_(xpBefore), ra = rankOf_(xpAfter);
    return {
      skor: skor, max: max, benar: benar, total: qs.length, bintang: bintang, durasi: durasi, biayaPetunjuk: cost,
      xpBefore: xpBefore, xpAfter: xpAfter, rank: ra, naikPangkat: ra.name !== rb.name,
      rekorBaru: skor > prevBest, review: review
    };
  });
};

H.leaderboard = function (t) {
  var u = auth_(t);
  var hasil = table_('Hasil');
  var board = leaderboard_(hasil, bestMap_(hasil));
  return { board: board.slice(0, 50), saya: String(u.UserID) };
};

H.profile = function (t) {
  var u = auth_(t);
  var hasil = table_('Hasil');
  var bm = bestMap_(hasil);
  var xp = xpOf_(bm, String(u.UserID));
  var titles = {};
  table_('Kasus').forEach(function (k) { titles[String(k.CaseID)] = String(k.Judul); });
  var mine = hasil.filter(function (r) { return String(r.UserID) === String(u.UserID); }).reverse().slice(0, 10)
    .map(function (r) {
      return { kasus: titles[String(r.CaseID)] || String(r.CaseID), skor: num_(r.Skor), max: num_(r.Max), bintang: num_(r.Bintang), waktu: fmt_(r.Waktu) };
    });
  return { user: pubUser_(u), xp: xp, rank: rankOf_(xp), riwayat: mine, percobaan: hasil.filter(function (r) { return String(r.UserID) === String(u.UserID); }).length };
};

/* ===================== ADMIN ===================== */
H.adminStats = function (t) {
  admin_(t);
  var users = table_('Users'), hasil = table_('Hasil'), kasus = table_('Kasus'), qs = table_('Pertanyaan');
  var siswa = users.filter(function (u) { return String(u.Role) === 'siswa'; });
  var total = 0; hasil.forEach(function (r) { total += num_(r.Max) ? num_(r.Skor) / num_(r.Max) : 0; });
  var stat = {}; // QID → {n, salah}
  hasil.forEach(function (r) {
    try {
      JSON.parse(String(r.Detail || '[]')).forEach(function (d) {
        stat[d.q] = stat[d.q] || { n: 0, salah: 0 };
        stat[d.q].n++; if (!d.ok) stat[d.q].salah++;
      });
    } catch (e) {}
  });
  var titles = {};
  kasus.forEach(function (k) { titles[String(k.CaseID)] = String(k.Judul); });
  var hardest = qs.filter(function (q) { return stat[String(q.QID)]; }).map(function (q) {
    var s = stat[String(q.QID)];
    return { teks: String(q.Pertanyaan), kasus: titles[String(q.CaseID)] || '', n: s.n, salah: Math.round(s.salah / s.n * 100) };
  }).sort(function (a, b) { return b.salah - a.salah; }).slice(0, 5);
  return {
    siswa: siswa.length, aktif: siswa.filter(function (u) { return String(u.Status) === 'Aktif'; }).length,
    kasusAktif: kasus.filter(function (k) { return String(k.Status) === 'Aktif'; }).length, kasusTotal: kasus.length,
    percobaan: hasil.length, rata: hasil.length ? Math.round(total / hasil.length * 100) : 0, tersulit: hardest
  };
};

H.adminUsers = function (t) {
  admin_(t);
  var hasil = table_('Hasil'), bm = bestMap_(hasil);
  var att = {}; hasil.forEach(function (r) { att[String(r.UserID)] = (att[String(r.UserID)] || 0) + 1; });
  return table_('Users').map(function (u) {
    var id = String(u.UserID);
    return {
      id: id, nama: String(u.Nama), kelas: String(u.Kelas), username: String(u.Username), role: String(u.Role),
      avatar: String(u.Avatar), status: String(u.Status), login: fmt_(u.LoginTerakhir), xp: xpOf_(bm, id), percobaan: att[id] || 0
    };
  });
};

H.adminToggleUser = function (t, userId) {
  var me = admin_(t);
  if (String(me.UserID) === String(userId)) throw new Error('Tidak bisa menonaktifkan akun sendiri.');
  return withLock_(function () {
    var u = table_('Users').filter(function (x) { return String(x.UserID) === String(userId); })[0];
    if (!u) throw new Error('Pengguna tidak ditemukan.');
    var ns = String(u.Status) === 'Aktif' ? 'Nonaktif' : 'Aktif';
    setCell_('Users', u._row, 'Status', ns);
    return ns;
  });
};

H.adminResetPass = function (t, userId, newPw) {
  admin_(t);
  if (String(newPw || '').length < 6) throw new Error('Password minimal 6 karakter.');
  var u = table_('Users').filter(function (x) { return String(x.UserID) === String(userId); })[0];
  if (!u) throw new Error('Pengguna tidak ditemukan.');
  var salt = Utilities.getUuid();
  setCell_('Users', u._row, 'Salt', salt);
  setCell_('Users', u._row, 'PassHash', hash_(salt, String(newPw)));
  return true;
};

H.adminDeleteUser = function (t, userId) {
  var me = admin_(t);
  if (String(me.UserID) === String(userId)) throw new Error('Tidak bisa menghapus akun sendiri.');
  return withLock_(function () {
    var u = table_('Users').filter(function (x) { return String(x.UserID) === String(userId); })[0];
    if (!u) throw new Error('Pengguna tidak ditemukan.');
    sheet_('Users').deleteRow(u._row);
    return true;
  });
};

H.adminCases = function (t) {
  admin_(t);
  var qs = table_('Pertanyaan'), cl = table_('Petunjuk'), hasil = table_('Hasil');
  var n = function (arr, id) { return arr.filter(function (x) { return String(x.CaseID) === id; }).length; };
  var rows = table_('Kasus').sort(function (a, b) { return num_(a.Urutan) - num_(b.Urutan); }).map(function (k) {
    var id = String(k.CaseID), h = hasil.filter(function (r) { return String(r.CaseID) === id; });
    var avg = 0; h.forEach(function (r) { avg += num_(r.Max) ? num_(r.Skor) / num_(r.Max) : 0; });
    return { id: id, judul: String(k.Judul), level: String(k.Level), status: String(k.Status), soal: n(qs, id), petunjuk: n(cl, id), main: h.length, rata: h.length ? Math.round(avg / h.length * 100) : 0 };
  });
  return { kasus: rows, url: ss_().getUrl() };
};

H.adminSetCaseStatus = function (t, caseId, status) {
  admin_(t);
  if (['Aktif', 'Draft'].indexOf(status) < 0) throw new Error('Status tidak valid.');
  var k = findCase_(caseId);
  setCell_('Kasus', k._row, 'Status', status);
  return true;
};

H.adminResults = function (t) {
  admin_(t);
  var titles = {};
  table_('Kasus').forEach(function (k) { titles[String(k.CaseID)] = String(k.Judul); });
  return table_('Hasil').reverse().slice(0, 300).map(function (r) {
    return {
      nama: String(r.Nama), kelas: String(r.Kelas), username: String(r.Username), kasus: titles[String(r.CaseID)] || String(r.CaseID),
      skor: num_(r.Skor), max: num_(r.Max), benar: num_(r.Benar), total: num_(r.Total), petunjuk: num_(r.Petunjuk),
      durasi: num_(r.Durasi), bintang: num_(r.Bintang), waktu: fmt_(r.Waktu)
    };
  });
};

H.adminGetSettings = function (t) {
  admin_(t);
  var s = getSettings_();
  return { KodeDaftar: s.KodeDaftar || '', Pengumuman: s.Pengumuman || '' };
};
H.adminSetSettings = function (t, d) {
  admin_(t);
  setSetting_('KodeDaftar', clean_(d.KodeDaftar, 30));
  setSetting_('Pengumuman', String(d.Pengumuman || '').slice(0, 200));
  return true;
};

/* ---------------------- Helper internal ---------------------- */
function findCase_(caseId) {
  var k = table_('Kasus').filter(function (x) { return String(x.CaseID) === String(caseId) && String(x.Status) === 'Aktif'; })[0];
  if (!k) throw new Error('Kasus tidak ditemukan atau belum dibuka.');
  return k;
}
function questionsOf_(caseId) {
  return table_('Pertanyaan').filter(function (q) { return String(q.CaseID) === String(caseId); })
    .sort(function (a, b) { return num_(a.Urutan) - num_(b.Urutan); });
}
function attKey_(u, caseId) { return 'att_' + u.UserID + '_' + caseId; }
function getAtt_(u, caseId) {
  var raw = CacheService.getScriptCache().get(attKey_(u, caseId));
  if (!raw) throw new Error('Penyelidikan belum dimulai atau sudah kedaluwarsa. Buka kembali kasusnya.');
  return JSON.parse(raw);
}
function saveAtt_(u, caseId, att) {
  CacheService.getScriptCache().put(attKey_(u, caseId), JSON.stringify(att), CONFIG.SESSION_TTL);
}
function leaderboard_(hasil, bm) {
  var users = table_('Users');
  var att = {}; hasil.forEach(function (r) { att[String(r.UserID)] = (att[String(r.UserID)] || 0) + 1; });
  var out = [];
  users.forEach(function (u) {
    if (String(u.Role) !== 'siswa' || String(u.Status) !== 'Aktif') return;
    var id = String(u.UserID);
    if (!att[id]) return;
    var xp = xpOf_(bm, id), stars = 0, c = bm[id] || {};
    Object.keys(c).forEach(function (k) { stars += c[k].bintang; });
    out.push({ id: id, nama: String(u.Nama), kelas: String(u.Kelas), avatar: String(u.Avatar), xp: xp, bintang: stars, kasus: Object.keys(c).length, pangkat: rankOf_(xp).name });
  });
  out.sort(function (a, b) { return b.xp - a.xp || b.bintang - a.bintang; });
  return out;
}

/* Menu di Google Sheet (jika script container-bound) */
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('🕵️ Pasal Noir')
      .addItem('Siapkan / perbarui struktur sheet (setup)', 'setup')
      .addItem('Tambah kasus contoh K001–K006 (yang belum ada)', 'tambahKasusContoh')
      .addItem('Reset password admin → admin123', 'resetAdminPassword')
      .addToUi();
  } catch (e) {}
}
