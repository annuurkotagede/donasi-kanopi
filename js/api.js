/* Klien API: Google Apps Script Web App (atau Demo bila API_URL kosong) */
(function (w) {
  const cfg = w.APP_CONFIG || {};
  const demo = !cfg.API_URL;

  async function post(action, payload, token) {
    if (demo) return w.Demo.handle(action, payload, token);
    const res = await fetch(cfg.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // hindari preflight CORS
      body: JSON.stringify({ action, token, payload })
    });
    return unwrap(res);
  }

  async function unwrap(res) {
    let j;
    try { j = await res.json(); } catch (e) { throw new Error('Respons server tidak valid. Periksa API_URL & deploy Web App.'); }
    if (!j.ok) { const e = new Error(j.error === 'UNAUTHORIZED' ? 'Sesi berakhir, silakan login ulang.' : (j.error || 'Terjadi kesalahan')); e.code = j.code; throw e; }
    return j.data;
  }

  w.Api = {
    isDemo: demo,
    publik: async () => {
      if (demo) return w.Demo.handle('publik');
      return unwrap(await fetch(cfg.API_URL + '?action=publik'));
    },
    login: password => post('login', { password }),
    logout: t => post('logout', {}, t),
    list: t => post('admin_list', {}, t),
    create: (t, d) => post('create', d, t),
    update: (t, d) => post('update', d, t),
    remove: (t, id) => post('delete', { id }, t),
    saveConfig: (t, d) => post('config_save', d, t)
  };
})(window);
