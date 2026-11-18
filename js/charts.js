/* Grafik (Chart.js via CDN). Aman jika Chart.js gagal dimuat. */
(function (w) {
  const inst = {};
  const GREEN = '#0f7a4f', GOLD = '#d9a62e';

  function make(id, cfg) {
    const el = document.getElementById(id);
    if (!el || typeof Chart === 'undefined') return;
    if (inst[id]) inst[id].destroy();
    inst[id] = new Chart(el, cfg);
  }

  w.Charts = {
    render(rows, ids) {
      const U = w.Util;
      const h = U.harian(rows);
      make(ids.harian, {
        type: 'bar',
        data: {
          labels: h.map(x => U.tgl(x.tanggal).slice(0, 5)),
          datasets: [
            { label: 'Transfer', data: h.map(x => x.tf), backgroundColor: GREEN, borderRadius: 4 },
            { label: 'Cash', data: h.map(x => x.cash), backgroundColor: GOLD, borderRadius: 4 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: v => U.angka(v) } } },
          plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${U.rupiah(c.parsed.y)}` } } }
        }
      });
      const s = U.summary(rows);
      make(ids.metode, {
        type: 'doughnut',
        data: { labels: ['Transfer', 'Cash'], datasets: [{ data: [s.masukTF, s.masukCash], backgroundColor: [GREEN, GOLD], borderWidth: 0 }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '62%',
          plugins: { tooltip: { callbacks: { label: c => `${c.label}: ${U.rupiah(c.parsed)}` } } }
        }
      });
    }
  };
})(window);
