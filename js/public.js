/* Portal publik: daftar donatur transparan (read-only) */
(function () {
  const U = Util;
  const $ = s => document.querySelector(s);
  let rows = [];
  let cfg = {};

  function stat(label, value, sub, cls) {
    return `<div class="card stat ${cls || ''}"><div class="label">${U.esc(label)}</div><div class="value">${U.esc(value)}</div><div class="sub">${U.esc(sub || '')}</div></div>`;
  }

  function renderStats() {
    const s = U.summary(rows);
    $('#stats').innerHTML = [
      stat('Total Dana Terkumpul', U.rupiah(s.totalMasuk), `${s.transaksi} transaksi dari ${s.donaturUnik} donatur`, 'gold'),
      stat('Via Transfer', U.rupiah(s.masukTF), 'Rekening penerima panitia'),
      stat('Via Cash', U.rupiah(s.masukCash), 'Diterima langsung panitia'),
      stat('Pengeluaran', U.rupiah(s.totalKeluar), 'Total dana keluar'),
      stat('Saldo Dana', U.rupiah(s.saldo), `Cash ${U.rupiah(s.saldoCash)} · TF ${U.rupiah(s.saldoTF)}`)
    ].join('');

    const card = $('#targetCard');
    if (cfg.target > 0) {
      card.classList.remove('hidden');
      const pct = Math.min(100, s.totalMasuk / cfg.target * 100);
      $('#bar').style.width = pct.toFixed(1) + '%';
      $('#barText').textContent = `${pct.toFixed(1)}% dari target ${U.rupiah(cfg.target)} — kurang ${U.rupiah(Math.max(0, cfg.target - s.totalMasuk))}`;
    } else {
      card.classList.add('hidden');
    }
  }

  function renderTable() {
    const q = $('#q').value.trim().toLowerCase();
    const m = $('#fMetode').value;
    const all = U.withSaldo(rows).map((r, i) => Object.assign(r, { no: i + 1 }));
    // hanya transaksi dana masuk yang ditampilkan sebagai daftar donatur
    const list = all.filter(r => (r.masukCash + r.masukTF) > 0)
      .filter(r => !q || r.donatur.toLowerCase().includes(q))
      .filter(r => !m || (m === 'cash' ? r.masukCash > 0 : r.masukTF > 0));

    if (!list.length) {
      $('#tbody').innerHTML = '<tr><td colspan="8" class="empty">Belum ada data yang cocok.</td></tr>';
      $('#tfoot').innerHTML = '';
      return;
    }
    $('#tbody').innerHTML = list.map(r => `
      <tr>
        <td>${r.no}</td>
        <td class="nowrap">${U.tgl(r.tanggal)}</td>
        <td>${U.esc(r.donatur)}</td>
        <td><span class="pill ${r.masukCash > 0 ? 'cash' : 'tf'}">${U.esc(r.caraBayar || (r.masukCash > 0 ? 'Cash' : 'TF'))}</span></td>
        <td>${U.esc(r.bankPenerima)}</td>
        <td class="num">${r.masukCash ? U.angka(r.masukCash) : ''}</td>
        <td class="num">${r.masukTF ? U.angka(r.masukTF) : ''}</td>
        <td class="num">${U.angka(r.saldo)}</td>
      </tr>`).join('');
    const t = U.summary(list);
    $('#tfoot').innerHTML = `<tr><td colspan="5">JUMLAH${q || m ? ' (hasil filter)' : ''}</td><td class="num">${U.angka(t.masukCash)}</td><td class="num">${U.angka(t.masukTF)}</td><td class="num">${U.angka(t.totalMasuk)}</td></tr>`;
  }

  function renderMeta() {
    $('#judul').textContent = cfg.judul || '';
    document.title = cfg.judul || document.title;
    $('#subjudul').textContent = cfg.subjudul || '';
    $('#cutoff').textContent = 'Cut off: ' + U.tglPanjang(cfg.cutOff);
    $('#infoRek').textContent = cfg.infoRekening || '-';
    $('#kontak').textContent = cfg.kontak || '-';
  }

  async function load() {
    try {
      const d = await Api.publik();
      cfg = d.config; rows = d.rows;
      $('#loadErr').classList.add('hidden');
      renderMeta(); renderStats(); renderTable();
      const draw = () => Charts.render(rows, { harian: 'chHarian', metode: 'chMetode' });
      if (typeof Chart !== 'undefined') draw(); else window.addEventListener('load', draw, { once: true });
    } catch (e) {
      const box = $('#loadErr');
      box.textContent = 'Gagal memuat data: ' + e.message;
      box.classList.remove('hidden');
      $('#tbody').innerHTML = '<tr><td colspan="8" class="empty">Data tidak dapat dimuat.</td></tr>';
    }
  }

  $('#q').addEventListener('input', renderTable);
  $('#fMetode').addEventListener('change', renderTable);
  $('#btnPrint').addEventListener('click', () => window.print());
  if (Api.isDemo) $('#demoNote').classList.remove('hidden');
  load();
  if (APP_CONFIG.AUTO_REFRESH_MS > 0) setInterval(load, APP_CONFIG.AUTO_REFRESH_MS);
})();
