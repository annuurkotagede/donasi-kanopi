/* Dashboard admin: login, ringkasan, CRUD donasi, pengaturan */
(function () {
  const U = Util;
  const $ = s => document.querySelector(s);
  const TOKEN_KEY = 'annuur_admin_token';
  let token = sessionStorage.getItem(TOKEN_KEY) || '';
  let rows = [], cfg = {}, editId = null;

  /* ---------- helper ---------- */
  const show = (id, on) => $(id).classList.toggle('hidden', !on);
  async function guard(fn) {
    try { return await fn(); }
    catch (e) {
      if (e.code === 401) { logoutLocal(); $('#loginErr').textContent = e.message; return; }
      U.toast(e.message || 'Terjadi kesalahan', 'err');
    }
  }
  function logoutLocal() {
    token = ''; sessionStorage.removeItem(TOKEN_KEY);
    show('#appView', false); show('#loginView', true);
  }

  /* ---------- auth ---------- */
  $('#loginForm').addEventListener('submit', async ev => {
    ev.preventDefault();
    const btn = $('#btnLogin'); btn.disabled = true; $('#loginErr').textContent = '';
    try {
      const r = await Api.login($('#pw').value);
      token = r.token; sessionStorage.setItem(TOKEN_KEY, token);
      $('#pw').value = '';
      await load(); enter();
    } catch (e) { $('#loginErr').textContent = e.message; }
    finally { btn.disabled = false; }
  });
  $('#btnLogout').addEventListener('click', async () => {
    try { await Api.logout(token); } catch (e) { /* abaikan */ }
    logoutLocal();
  });
  if (Api.isDemo) $('#demoHint').textContent = 'Mode demo — password: admin123';

  function enter() { show('#loginView', false); show('#appView', true); }

  /* ---------- data ---------- */
  async function load() {
    const d = await Api.list(token);
    rows = d.rows; cfg = d.config;
    renderAll();
  }
  function renderAll() { renderStats(); renderRecent(); renderTable(); fillConfig(); drawCharts(); }

  function drawCharts() {
    const draw = () => Charts.render(rows, { harian: 'chHarian', metode: 'chMetode' });
    if (typeof Chart !== 'undefined') draw(); else window.addEventListener('load', draw, { once: true });
  }

  function stat(label, value, sub, cls) {
    return `<div class="card stat ${cls || ''}"><div class="label">${U.esc(label)}</div><div class="value">${U.esc(value)}</div><div class="sub">${U.esc(sub || '')}</div></div>`;
  }
  function renderStats() {
    const s = U.summary(rows);
    $('#stats').innerHTML = [
      stat('Total Dana Masuk', U.rupiah(s.totalMasuk), `${s.transaksi} transaksi · ${s.donaturUnik} donatur`, 'gold'),
      stat('Transfer', U.rupiah(s.masukTF), 'Total masuk via TF'),
      stat('Cash', U.rupiah(s.masukCash), 'Total masuk via cash'),
      stat('Pengeluaran', U.rupiah(s.totalKeluar), ''),
      stat('Saldo', U.rupiah(s.saldo), `Donasi terbesar ${U.rupiah(s.terbesar)}`)
    ].join('');
  }
  function renderRecent() {
    const last = U.sortRows(rows).filter(r => r.masukCash + r.masukTF > 0).slice(-5).reverse();
    $('#recent').innerHTML = last.length ? last.map(r => `<tr><td class="nowrap">${U.tgl(r.tanggal)}</td><td>${U.esc(r.donatur)}</td><td>${U.esc(r.caraBayar)}</td><td class="num">${U.rupiah(r.masukCash + r.masukTF)}</td></tr>`).join('')
      : '<tr><td class="empty">Belum ada transaksi.</td></tr>';
  }

  function renderTable() {
    const q = $('#q').value.trim().toLowerCase();
    const m = $('#fMetode').value;
    const all = U.withSaldo(rows).map((r, i) => Object.assign(r, { no: i + 1 }));
    const list = all
      .filter(r => !q || (r.donatur + ' ' + (r.keterangan || '')).toLowerCase().includes(q))
      .filter(r => !m || (m === 'tf' ? r.masukTF > 0 : m === 'cash' ? r.masukCash > 0 : (r.keluarCash + r.keluarTF) > 0));
    if (!list.length) {
      $('#tbody').innerHTML = '<tr><td colspan="11" class="empty">Belum ada data.</td></tr>'; $('#tfoot').innerHTML = ''; return;
    }
    $('#tbody').innerHTML = list.map(r => `
      <tr>
        <td>${r.no}</td><td class="nowrap">${U.tgl(r.tanggal)}</td><td>${U.esc(r.donatur)}</td>
        <td>${U.esc(r.caraBayar)}</td><td>${U.esc(r.bankPenerima)}</td>
        <td class="num">${r.masukCash ? U.angka(r.masukCash) : ''}</td>
        <td class="num">${r.masukTF ? U.angka(r.masukTF) : ''}</td>
        <td class="num">${(r.keluarCash + r.keluarTF) ? U.angka(r.keluarCash + r.keluarTF) : ''}</td>
        <td class="num">${U.angka(r.saldo)}</td>
        <td>${U.esc(r.keterangan)}</td>
        <td class="no-print nowrap">
          <button class="btn ghost sm" data-edit="${r.id}">Ubah</button>
          <button class="btn danger sm" data-del="${r.id}">Hapus</button>
        </td>
      </tr>`).join('');
    const t = U.summary(list);
    $('#tfoot').innerHTML = `<tr><td colspan="5">JUMLAH${q || m ? ' (hasil filter)' : ''}</td><td class="num">${U.angka(t.masukCash)}</td><td class="num">${U.angka(t.masukTF)}</td><td class="num">${U.angka(t.totalKeluar)}</td><td class="num">${U.angka(t.saldo)}</td><td colspan="2"></td></tr>`;
  }

  $('#q').addEventListener('input', renderTable);
  $('#fMetode').addEventListener('change', renderTable);
  $('#btnPrint').addEventListener('click', () => window.print());
  $('#btnCsv').addEventListener('click', () => U.download(`donatur-kanopi-annuur-${U.hariIni()}.csv`, U.toCSV(rows)));
  $('#tbody').addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.edit) openForm(+b.dataset.edit);
    if (b.dataset.del) del(+b.dataset.del);
  });

  /* ---------- tabs ---------- */
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    ['ringkasan', 'data', 'setting'].forEach(t => show('#tab-' + t, t === b.dataset.tab));
  }));

  /* ---------- form tambah / ubah ---------- */
  const dlg = $('#dlg');
  function openForm(id) {
    editId = id || null; $('#formErr').textContent = '';
    const r = id ? rows.find(x => x.id === id) : null;
    $('#dlgTitle').textContent = r ? 'Ubah Transaksi' : 'Tambah Transaksi';
    const keluar = r ? (r.keluarCash + r.keluarTF) > 0 && (r.masukCash + r.masukTF) === 0 : false;
    $('#fTanggal').value = r ? r.tanggal : U.hariIni();
    $('#fJenis').value = keluar ? 'keluar' : 'masuk';
    $('#fDonatur').value = r ? r.donatur : '';
    const isCash = r ? (keluar ? r.keluarCash > 0 : r.masukCash > 0) : false;
    $('#fMetodeBayar').value = isCash ? 'cash' : 'tf';
    $('#fNominal').value = r ? (keluar ? r.keluarCash + r.keluarTF : r.masukCash + r.masukTF) : '';
    $('#fCara').value = r ? r.caraBayar : '';
    $('#fBank').value = r ? r.bankPenerima : 'BSI An Nuur';
    $('#fKet').value = r ? (r.keterangan || '') : '';
    dlg.showModal();
  }
  $('#btnAdd').addEventListener('click', () => openForm());
  $('#btnCancel').addEventListener('click', () => dlg.close());
  $('#fMetodeBayar').addEventListener('change', e => {
    if (e.target.value === 'cash' && !$('#fCara').value) $('#fCara').value = 'Cash';
  });

  $('#form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const nominal = Math.round(+$('#fNominal').value || 0);
    const keluar = $('#fJenis').value === 'keluar';
    const cash = $('#fMetodeBayar').value === 'cash';
    const p = {
      tanggal: $('#fTanggal').value, donatur: $('#fDonatur').value,
      caraBayar: $('#fCara').value, bankPenerima: $('#fBank').value, keterangan: $('#fKet').value,
      masukCash: !keluar && cash ? nominal : 0, masukTF: !keluar && !cash ? nominal : 0,
      keluarCash: keluar && cash ? nominal : 0, keluarTF: keluar && !cash ? nominal : 0
    };
    if (editId) p.id = editId;
    const btn = $('#btnSave'); btn.disabled = true; $('#formErr').textContent = '';
    try {
      await (editId ? Api.update(token, p) : Api.create(token, p));
      dlg.close(); U.toast(editId ? 'Transaksi diperbarui' : 'Transaksi ditambahkan');
      await load();
    } catch (e) {
      if (e.code === 401) { dlg.close(); logoutLocal(); $('#loginErr').textContent = e.message; }
      else $('#formErr').textContent = e.message;
    } finally { btn.disabled = false; }
  });

  function del(id) {
    const r = rows.find(x => x.id === id); if (!r) return;
    if (!confirm(`Hapus transaksi "${r.donatur}" (${U.tgl(r.tanggal)}, ${U.rupiah(r.masukCash + r.masukTF + r.keluarCash + r.keluarTF)})?`)) return;
    guard(async () => { await Api.remove(token, id); U.toast('Transaksi dihapus'); await load(); });
  }

  /* ---------- pengaturan ---------- */
  function fillConfig() {
    $('#cJudul').value = cfg.judul || ''; $('#cSub').value = cfg.subjudul || '';
    $('#cCut').value = cfg.cutOff || ''; $('#cTarget').value = cfg.target || 0;
    $('#cNama').value = cfg.tampilNama || 'penuh';
    $('#cRek').value = cfg.infoRekening || ''; $('#cKontak').value = cfg.kontak || '';
  }
  $('#cfgForm').addEventListener('submit', ev => {
    ev.preventDefault();
    guard(async () => {
      cfg = await Api.saveConfig(token, {
        judul: $('#cJudul').value, subjudul: $('#cSub').value, cutOff: $('#cCut').value,
        target: +$('#cTarget').value || 0, tampilNama: $('#cNama').value,
        infoRekening: $('#cRek').value, kontak: $('#cKontak').value
      });
      fillConfig(); U.toast('Pengaturan disimpan');
    });
  });

  /* ---------- boot ---------- */
  (async function boot() {
    if (!token) return;
    try { await load(); enter(); }
    catch (e) { logoutLocal(); }
  })();
})();
