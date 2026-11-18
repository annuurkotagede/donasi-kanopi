/* Backend tiruan (localStorage) — aktif hanya jika APP_CONFIG.API_URL kosong. Password demo: admin123 */
(function (root) {
  const KEY = 'annuur_kanopi_demo_v1';
  const U = root.Util || require('./common.js');

  const CONFIG0 = {
    judul: 'Donatur Pembangunan Kanopi Islamic Centre Masjid An-Nuur Kotagede',
    subjudul: 'Laporan transparan penerimaan dana pembangunan kanopi — Masjid An-Nuur, Jl. Pelemsari 105, Prenggan, Kotagede, Yogyakarta',
    cutOff: '2026-11-16', target: 0, tampilNama: 'penuh',
    infoRekening: 'BSI a.n. Masjid An-Nuur (isi nomor rekening resmi di Dashboard Admin > Pengaturan)', kontak: ''
  };
  const mk = (id, tanggal, donatur, caraBayar, bankPenerima, masukCash, masukTF, keterangan) =>
    ({ id, tanggal, donatur, caraBayar, bankPenerima, masukCash, masukTF, keluarCash: 0, keluarTF: 0, keterangan });
  const ROWS0 = [
    mk(1, '2026-11-07', 'Hudi Riyanto', 'TF.Mandiri', 'BSI An Nuur', 0, 100000, '.5.59.'),
    mk(2, '2026-11-07', 'Noor Arifin', 'TF.BNI', 'BSI An Nuur', 0, 2000000, '.10.08.03'),
    mk(3, '2026-11-08', 'Bambang Muhajid', 'TF.Mandiri', 'BSI An Nuur', 0, 500000, '5.30.53'),
    mk(4, '2026-11-09', 'KB Martodiryo (H.Riyadi)', 'TF.BSI', 'BSI An Nuur', 0, 1000000, 'Bp.Aris H.18.41.14'),
    mk(5, '2026-11-12', 'Bu Jumari', 'TF.Dana', 'BSI An Nuur', 0, 200000, '07.15'),
    mk(6, '2026-11-13', 'Bu Sri Zuwantini', 'TF.Mandiri Taspen', 'BSI An Nuur', 0, 500000, '07.03.46'),
    mk(7, '2026-11-13', 'Bu Sri Zuwantini', 'TF.Mandiri Taspen', 'BSI An Nuur', 0, 500000, '07.05.'),
    mk(8, '2026-11-13', 'Tri Astuti', 'TF.Byond BSI', 'BSI An Nuur', 0, 500000, '07.07.24'),
    mk(9, '2026-11-15', 'Samidi', 'Cash', 'Samidi', 500000, 0, '')
  ];

  const store = () => {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.rows) return s; } catch (e) { /* abaikan */ }
    return { config: { ...CONFIG0 }, rows: ROWS0.map(r => ({ ...r })) };
  };
  const save = s => localStorage.setItem(KEY, JSON.stringify(s));

  function clean(p) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.tanggal || '')) throw new Error('Tanggal tidak valid.');
    if (!String(p.donatur || '').trim()) throw new Error('Nama donatur wajib diisi.');
    const o = {
      tanggal: p.tanggal, donatur: String(p.donatur).trim(), caraBayar: String(p.caraBayar || '').trim(),
      bankPenerima: String(p.bankPenerima || '').trim(), keterangan: String(p.keterangan || '').trim(),
      masukCash: +p.masukCash || 0, masukTF: +p.masukTF || 0, keluarCash: +p.keluarCash || 0, keluarTF: +p.keluarTF || 0
    };
    if ([o.masukCash, o.masukTF, o.keluarCash, o.keluarTF].some(v => v < 0)) throw new Error('Nominal tidak boleh negatif.');
    if (o.masukCash + o.masukTF + o.keluarCash + o.keluarTF <= 0) throw new Error('Isi nominal masuk atau keluar.');
    return o;
  }

  const auth = t => { if (t !== 'demo-token') { const e = new Error('Sesi berakhir, silakan login ulang.'); e.code = 401; throw e; } };

  const handle = async (action, payload, token) => {
    const s = store(); const p = payload || {};
    switch (action) {
      case 'publik':
        return { config: s.config, rows: s.rows.map(r => ({ ...r, donatur: U.mask(r.donatur, s.config.tampilNama), keterangan: undefined })) };
      case 'login':
        if (p.password !== 'admin123') throw new Error('Password salah. (Mode demo: admin123)');
        return { token: 'demo-token' };
      case 'logout': return true;
      case 'admin_list': auth(token); return { config: s.config, rows: s.rows };
      case 'create': {
        auth(token);
        const id = s.rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
        s.rows.push({ id, ...clean(p) }); save(s); return { id };
      }
      case 'update': {
        auth(token);
        const i = s.rows.findIndex(r => r.id === +p.id);
        if (i < 0) throw new Error('Data tidak ditemukan.');
        s.rows[i] = { id: +p.id, ...clean(p) }; save(s); return { id: +p.id };
      }
      case 'delete': {
        auth(token);
        const n = s.rows.length; s.rows = s.rows.filter(r => r.id !== +p.id);
        if (s.rows.length === n) throw new Error('Data tidak ditemukan.');
        save(s); return { id: +p.id };
      }
      case 'config_save': {
        auth(token);
        if (!['penuh', 'singkat', 'sembunyi'].includes(p.tampilNama)) throw new Error('Mode tampil nama tidak valid.');
        s.config = { ...s.config, judul: p.judul, subjudul: p.subjudul, cutOff: p.cutOff, target: Math.max(0, +p.target || 0),
          tampilNama: p.tampilNama, infoRekening: p.infoRekening, kontak: p.kontak };
        save(s); return s.config;
      }
      default: throw new Error('Aksi tidak dikenal');
    }
  };

  root.Demo = { handle, reset: () => localStorage.removeItem(KEY) };
  if (typeof module !== 'undefined') module.exports = root.Demo;
})(typeof window !== 'undefined' ? window : globalThis);
