/* Helper bersama (format, perhitungan saldo, ringkasan, CSV, toast) */
(function (root) {
  const Util = {};
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  Util.angka = n => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
  Util.rupiah = n => 'Rp ' + Util.angka(n);
  Util.tgl = iso => {
    if (!iso) return '-';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };
  Util.tglPanjang = iso => {
    if (!iso) return '-';
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${BULAN[m - 1]} ${y}`;
  };
  Util.hariIni = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  Util.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  Util.sortRows = rows => [...rows].sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.id - b.id);

  /** Tambah saldo berjalan (cash, TF, total) seperti kolom SALDO di tabel asli. */
  Util.withSaldo = rows => {
    let c = 0, t = 0;
    return Util.sortRows(rows).map(r => {
      c += (r.masukCash || 0) - (r.keluarCash || 0);
      t += (r.masukTF || 0) - (r.keluarTF || 0);
      return Object.assign({}, r, { saldoCash: c, saldoTF: t, saldo: c + t });
    });
  };

  Util.summary = rows => {
    const s = { masukCash: 0, masukTF: 0, keluarCash: 0, keluarTF: 0, transaksi: 0, terbesar: 0 };
    const uniq = new Set();
    rows.forEach(r => {
      s.masukCash += r.masukCash || 0; s.masukTF += r.masukTF || 0;
      s.keluarCash += r.keluarCash || 0; s.keluarTF += r.keluarTF || 0;
      const m = (r.masukCash || 0) + (r.masukTF || 0);
      if (m > 0) { s.transaksi++; uniq.add(r.donatur.trim().toLowerCase()); s.terbesar = Math.max(s.terbesar, m); }
    });
    s.donaturUnik = uniq.size;
    s.totalMasuk = s.masukCash + s.masukTF;
    s.totalKeluar = s.keluarCash + s.keluarTF;
    s.saldoCash = s.masukCash - s.keluarCash;
    s.saldoTF = s.masukTF - s.keluarTF;
    s.saldo = s.saldoCash + s.saldoTF;
    return s;
  };

  /** Total masuk per tanggal (untuk grafik). */
  Util.harian = rows => {
    const map = {};
    rows.forEach(r => {
      const o = map[r.tanggal] || (map[r.tanggal] = { tanggal: r.tanggal, cash: 0, tf: 0 });
      o.cash += r.masukCash || 0; o.tf += r.masukTF || 0;
    });
    return Object.values(map).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  };

  Util.mask = (name, mode) => {
    name = String(name || '').trim();
    if (mode === 'sembunyi') return 'Hamba Allah';
    if (mode !== 'singkat') return name;
    const p = name.split(/\s+/);
    if (p.length === 1) return p[0].slice(0, 2) + '***';
    return p[0] + ' ' + p.slice(1).map(w => w.charAt(0).toUpperCase() + '***').join(' ');
  };

  Util.toCSV = rows => {
    const head = ['No', 'Tanggal', 'Donatur', 'Cara Bayar', 'Bank/Penerima', 'Masuk Cash', 'Masuk TF', 'Keluar Cash', 'Keluar TF', 'Saldo Cash', 'Saldo TF', 'Keterangan'];
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lines = Util.withSaldo(rows).map((r, i) => [i + 1, r.tanggal, r.donatur, r.caraBayar, r.bankPenerima,
      r.masukCash, r.masukTF, r.keluarCash, r.keluarTF, r.saldoCash, r.saldoTF, r.keterangan || ''].map(q).join(','));
    return '﻿' + [head.map(q).join(','), ...lines].join('\n');
  };

  Util.download = (filename, text, mime) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime || 'text/csv;charset=utf-8' }));
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  };

  Util.toast = (msg, type) => {
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || 'ok');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 3800);
  };

  root.Util = Util;
  if (typeof module !== 'undefined') module.exports = Util;
})(typeof window !== 'undefined' ? window : globalThis);
