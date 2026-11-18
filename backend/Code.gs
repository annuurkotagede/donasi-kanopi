/**
 * BACKEND — Sistem Informasi Donatur Kanopi Islamic Centre Masjid An-Nuur Kotagede
 * Google Apps Script (container-bound ke Google Sheet) sebagai REST API sederhana.
 *
 * Endpoint (Web App):
 *   GET  ?action=publik            -> data publik (nama bisa disamarkan, tanpa keterangan internal)
 *   POST {action, token, payload}  -> login | admin_list | create | update | delete | config_save | logout
 *        (kirim dengan Content-Type: text/plain agar tidak kena preflight CORS)
 *
 * Langkah awal: jalankan fungsi setup() sekali, lalu isi ADMIN_PASSWORD di
 * Project Settings > Script Properties. Lihat README.md.
 */

const SHEET_DATA = 'Donasi';
const SHEET_CFG = 'Config';
const HEADERS = ['ID', 'Tanggal', 'Donatur', 'Cara Bayar', 'Bank/Penerima',
  'Masuk Cash', 'Masuk TF', 'Keluar Cash', 'Keluar TF', 'Keterangan', 'Dibuat', 'Diubah'];

const DEFAULT_CFG = [
  ['judul', 'Donatur Pembangunan Kanopi Islamic Centre Masjid An-Nuur Kotagede'],
  ['subjudul', 'Laporan transparan penerimaan dana pembangunan kanopi — Masjid An-Nuur, Jl. Pelemsari 105, Prenggan, Kotagede, Yogyakarta'],
  ['cutOff', '2026-11-16'],
  ['target', '0'],
  ['tampilNama', 'penuh'], // penuh | singkat | sembunyi
  ['infoRekening', 'BSI a.n. Masjid An-Nuur (isi nomor rekening resmi di Dashboard Admin > Pengaturan)'],
  ['kontak', '']
];

// Data awal sesuai foto "DONATUR PEMBANGUNAN KANOPI AN-NUUR 2026" (cut off Senin 16/11/2026)
const SEED = [
  ['2026-11-07', 'Hudi Riyanto', 'TF.Mandiri', 'BSI An Nuur', 0, 100000, 0, 0, '.5.59.'],
  ['2026-11-07', 'Noor Arifin', 'TF.BNI', 'BSI An Nuur', 0, 2000000, 0, 0, '.10.08.03'],
  ['2026-11-08', 'Bambang Muhajid', 'TF.Mandiri', 'BSI An Nuur', 0, 500000, 0, 0, '5.30.53'],
  ['2026-11-09', 'KB Martodiryo (H.Riyadi)', 'TF.BSI', 'BSI An Nuur', 0, 1000000, 0, 0, 'Bp.Aris H.18.41.14'],
  ['2026-11-12', 'Bu Jumari', 'TF.Dana', 'BSI An Nuur', 0, 200000, 0, 0, '07.15'],
  ['2026-11-13', 'Bu Sri Zuwantini', 'TF.Mandiri Taspen', 'BSI An Nuur', 0, 500000, 0, 0, '07.03.46'],
  ['2026-11-13', 'Bu Sri Zuwantini', 'TF.Mandiri Taspen', 'BSI An Nuur', 0, 500000, 0, 0, '07.05.'],
  ['2026-11-13', 'Tri Astuti', 'TF.Byond BSI', 'BSI An Nuur', 0, 500000, 0, 0, '07.07.24'],
  ['2026-11-15', 'Samidi', 'Cash', 'Samidi', 500000, 0, 0, 0, '']
];

/* ============================ SETUP ============================ */

/** Jalankan sekali dari editor Apps Script. Aman dijalankan ulang (tidak menimpa data). */
function setup() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET_DATA) || ss.insertSheet(SHEET_DATA);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
      .setFontWeight('bold').setBackground('#0f5132').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange('B:B').setNumberFormat('@');          // tanggal disimpan sebagai teks yyyy-mm-dd
    sh.getRange('F:I').setNumberFormat('#,##0');
    const now = new Date();
    const rows = SEED.map((r, i) => [i + 1, r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], now, now]);
    sh.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
    sh.setColumnWidths(1, HEADERS.length, 120);
    sh.setColumnWidth(3, 220);
  }
  let cf = ss.getSheetByName(SHEET_CFG) || ss.insertSheet(SHEET_CFG);
  if (cf.getLastRow() === 0) {
    cf.getRange(1, 1, 1, 2).setValues([['Kunci', 'Nilai']]).setFontWeight('bold');
    cf.getRange(2, 1, DEFAULT_CFG.length, 2).setValues(DEFAULT_CFG);
    cf.getRange('B:B').setNumberFormat('@');
    cf.setColumnWidth(1, 140); cf.setColumnWidth(2, 520);
  }
  if (!PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD')) {
    Logger.log('PERHATIAN: ADMIN_PASSWORD belum diatur. Buka Project Settings > Script Properties, tambah ADMIN_PASSWORD.');
  }
  Logger.log('Setup selesai.');
}

/* ============================ ROUTER ============================ */

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'publik';
    if (action === 'publik') return json_({ ok: true, data: publik_() });
    if (action === 'ping') return json_({ ok: true, data: 'pong' });
    throw new Error('Aksi tidak dikenal');
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = body.action;
    const p = body.payload || {};
    if (action === 'login') return json_({ ok: true, data: login_(p) });

    requireAuth_(body.token);
    if (action === 'logout') {
      CacheService.getScriptCache().remove('tok_' + body.token);
      return json_({ ok: true, data: true });
    }
    if (action === 'admin_list') return json_({ ok: true, data: { config: readConfig_(), rows: readRows_() } });

    // Operasi tulis -> dikunci agar tidak bentrok
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      if (action === 'create') return json_({ ok: true, data: create_(p) });
      if (action === 'update') return json_({ ok: true, data: update_(p) });
      if (action === 'delete') return json_({ ok: true, data: remove_(p) });
      if (action === 'config_save') return json_({ ok: true, data: saveConfig_(p) });
    } finally {
      lock.releaseLock();
    }
    throw new Error('Aksi tidak dikenal');
  } catch (err) {
    const msg = String(err.message || err);
    return json_({ ok: false, error: msg, code: msg === 'UNAUTHORIZED' ? 401 : 400 });
  }
}

/* ============================ AUTH ============================ */

function login_(p) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('login_fails') || 0);
  if (fails >= 5) throw new Error('Terlalu banyak percobaan gagal. Coba lagi dalam 10 menit.');
  const pw = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!pw) throw new Error('ADMIN_PASSWORD belum diatur di Script Properties.');
  if (!safeEq_(String(p.password || ''), pw)) {
    cache.put('login_fails', String(fails + 1), 600);
    throw new Error('Password salah.');
  }
  cache.remove('login_fails');
  const token = Utilities.getUuid() + Utilities.getUuid();
  cache.put('tok_' + token, '1', 21600); // 6 jam
  return { token: token };
}

function requireAuth_(token) {
  if (!token || !CacheService.getScriptCache().get('tok_' + token)) throw new Error('UNAUTHORIZED');
}

function safeEq_(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* ============================ DATA ============================ */

function publik_() {
  const cfg = readConfig_();
  const mode = cfg.tampilNama || 'penuh';
  const rows = readRows_().map(function (r) {
    return {
      id: r.id, tanggal: r.tanggal, donatur: maskName_(r.donatur, mode),
      caraBayar: r.caraBayar, bankPenerima: r.bankPenerima,
      masukCash: r.masukCash, masukTF: r.masukTF, keluarCash: r.keluarCash, keluarTF: r.keluarTF
    };
  });
  return { config: cfg, rows: rows };
}

function maskName_(name, mode) {
  name = String(name || '').trim();
  if (mode === 'sembunyi') return 'Hamba Allah';
  if (mode !== 'singkat') return name;
  const parts = name.split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2) + '***';
  return parts[0] + ' ' + parts.slice(1).map(function (w) { return w.charAt(0).toUpperCase() + '***'; }).join(' ');
}

function readRows_() {
  const sh = sheet_(SHEET_DATA);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const tz = Session.getScriptTimeZone();
  return sh.getRange(2, 1, last - 1, HEADERS.length).getValues()
    .filter(function (r) { return r[0] !== '' && r[2] !== ''; })
    .map(function (r) {
      return {
        id: Number(r[0]), tanggal: toISO_(r[1], tz), donatur: String(r[2]),
        caraBayar: String(r[3]), bankPenerima: String(r[4]),
        masukCash: num_(r[5]), masukTF: num_(r[6]), keluarCash: num_(r[7]), keluarTF: num_(r[8]),
        keterangan: String(r[9] || '')
      };
    });
}

function readConfig_() {
  const sh = sheet_(SHEET_CFG);
  const cfg = {};
  DEFAULT_CFG.forEach(function (d) { cfg[d[0]] = d[1]; });
  const last = sh.getLastRow();
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, 2).getValues().forEach(function (r) {
      if (r[0] !== '') cfg[String(r[0])] = String(r[1]);
    });
  }
  cfg.target = num_(cfg.target);
  return cfg;
}

function clean_(p) {
  const tanggal = String(p.tanggal || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || isNaN(new Date(tanggal).getTime())) throw new Error('Tanggal tidak valid (format yyyy-mm-dd).');
  const donatur = String(p.donatur || '').trim();
  if (!donatur) throw new Error('Nama donatur wajib diisi.');
  const out = {
    tanggal: tanggal, donatur: donatur.substring(0, 120),
    caraBayar: String(p.caraBayar || '').trim().substring(0, 60),
    bankPenerima: String(p.bankPenerima || '').trim().substring(0, 60),
    masukCash: num_(p.masukCash), masukTF: num_(p.masukTF),
    keluarCash: num_(p.keluarCash), keluarTF: num_(p.keluarTF),
    keterangan: String(p.keterangan || '').trim().substring(0, 200)
  };
  ['masukCash', 'masukTF', 'keluarCash', 'keluarTF'].forEach(function (k) {
    if (out[k] < 0) throw new Error('Nominal tidak boleh negatif.');
  });
  if (out.masukCash + out.masukTF + out.keluarCash + out.keluarTF <= 0) throw new Error('Isi nominal masuk atau keluar.');
  return out;
}

function create_(p) {
  const d = clean_(p);
  const sh = sheet_(SHEET_DATA);
  const rows = readRows_();
  const id = rows.reduce(function (m, r) { return Math.max(m, r.id); }, 0) + 1;
  const now = new Date();
  sh.appendRow([id, d.tanggal, d.donatur, d.caraBayar, d.bankPenerima,
    d.masukCash, d.masukTF, d.keluarCash, d.keluarTF, d.keterangan, now, now]);
  return { id: id };
}

function update_(p) {
  const d = clean_(p);
  const sh = sheet_(SHEET_DATA);
  const row = findRow_(sh, p.id);
  sh.getRange(row, 2, 1, 9).setValues([[d.tanggal, d.donatur, d.caraBayar, d.bankPenerima,
    d.masukCash, d.masukTF, d.keluarCash, d.keluarTF, d.keterangan]]);
  sh.getRange(row, 12).setValue(new Date());
  return { id: Number(p.id) };
}

function remove_(p) {
  const sh = sheet_(SHEET_DATA);
  sh.deleteRow(findRow_(sh, p.id));
  return { id: Number(p.id) };
}

function saveConfig_(p) {
  const allowed = ['judul', 'subjudul', 'cutOff', 'target', 'tampilNama', 'infoRekening', 'kontak'];
  if (['penuh', 'singkat', 'sembunyi'].indexOf(p.tampilNama) < 0) throw new Error('Mode tampil nama tidak valid.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.cutOff || ''))) throw new Error('Tanggal cut off tidak valid.');
  const sh = sheet_(SHEET_CFG);
  const last = sh.getLastRow();
  const keys = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  allowed.forEach(function (k) {
    const val = k === 'target' ? String(Math.max(0, num_(p[k]))) : String(p[k] == null ? '' : p[k]).substring(0, 500);
    const i = keys.indexOf(k);
    if (i >= 0) sh.getRange(i + 2, 2).setValue(val);
    else { sh.appendRow([k, val]); keys.push(k); }
  });
  return readConfig_();
}

/* ============================ HELPERS ============================ */

function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Sheet "' + name + '" belum ada. Jalankan setup() dulu.');
  return sh;
}

function findRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) throw new Error('Data tidak ditemukan.');
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (Number(ids[i][0]) === Number(id)) return i + 2;
  throw new Error('Data tidak ditemukan.');
}

function toISO_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const s = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/); // dd/mm/yyyy
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return s;
}

function num_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const n = Number(String(v || '').replace(/[^\d.-]/g, '').replace(/\./g, ''));
  return isFinite(n) ? n : 0;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
