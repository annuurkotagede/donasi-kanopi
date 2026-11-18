# Sistem Informasi Donatur Kanopi — Islamic Centre Masjid An-Nuur Kotagede

Portal transparansi donatur + dashboard admin.

- **Frontend**: HTML, CSS, JS murni (tanpa build) — di-host di **GitHub Pages**
- **Backend**: **Google Apps Script** (Web App / REST sederhana)
- **Database**: **Google Sheet** (sheet `Donasi` dan `Config`)

```
kanopi-annuur/
├── index.html          Portal publik (read-only)
├── admin.html          Dashboard admin (login)
├── css/style.css
├── js/  config.js · common.js · api.js · charts.js · public.js · admin.js · demo.js
├── assets/logo.svg
├── backend/  Code.gs · appsscript.json     <- ditempel ke Apps Script
└── data/donatur-seed.csv                   Data awal dari foto (cut off 16/11/2026)
```

## Coba dulu tanpa backend (Mode Demo)
Biarkan `API_URL` kosong di `js/config.js`, buka `index.html` (atau jalankan `python3 -m http.server`).
Admin demo: password `admin123`. Data demo hanya tersimpan di browser.

## A. Siapkan Google Sheet + Apps Script
1. Buat Google Sheet baru, misalnya **DB Donatur Kanopi An-Nuur**.
2. Menu **Extensions > Apps Script**. Hapus isi `Code.gs`, tempel isi `backend/Code.gs`.
3. (Opsional) **Project Settings > Show "appsscript.json"** lalu samakan dengan `backend/appsscript.json`.
4. Pilih fungsi **`setup`** lalu **Run** dan izinkan akses. Sheet `Donasi` dan `Config` terbentuk, berisi 9 data dari foto.
5. **Project Settings > Script Properties > Add**: `ADMIN_PASSWORD` = password admin Anda (panjang, jangan dibagikan).
6. **Deploy > New deployment > Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Salin URL berakhiran `/exec`.
7. Setiap mengubah `Code.gs`, buat **New version** pada deployment (Manage deployments > Edit).

## B. Hubungkan frontend
Edit `js/config.js`:
```js
API_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
```

## C. Hosting di GitHub Pages
```bash
git init && git add . && git commit -m "Portal donatur kanopi An-Nuur"
git branch -M main
git remote add origin https://github.com/<user>/kanopi-annuur.git
git push -u origin main
```
Di GitHub: **Settings > Pages > Deploy from a branch > main / (root)**.
Portal: `https://<user>.github.io/kanopi-annuur/`, admin: `.../admin.html`.

## Skema Sheet `Donasi`
| Kolom | Isi |
|---|---|
| ID | nomor unik otomatis |
| Tanggal | `yyyy-mm-dd` (teks) |
| Donatur | nama donatur / uraian |
| Cara Bayar | mis. `TF.Mandiri`, `TF.BSI`, `Cash` |
| Bank/Penerima | mis. `BSI An Nuur` / nama penerima cash |
| Masuk Cash / Masuk TF | nominal dana masuk |
| Keluar Cash / Keluar TF | nominal pengeluaran |
| Keterangan | catatan internal (jam transfer, dll). **Tidak tampil di portal publik** |
| Dibuat / Diubah | stempel waktu |

Kolom **Saldo Cash / Saldo TF** pada tabel asli dihitung otomatis (saldo berjalan), jadi tidak disimpan.
Anda tetap boleh mengedit langsung di Sheet; tanggal `dd/mm/yyyy` ikut terbaca.

## Fitur
- Portal: total terkumpul, cash vs transfer, pengeluaran, saldo, progres target, grafik per tanggal, tabel donatur (cari/filter/cetak).
- Admin: login, ringkasan + grafik, tambah/ubah/hapus transaksi (masuk & keluar), unduh CSV, cetak laporan, pengaturan judul, cut off, target, rekening, kontak.
- Privasi: nama donatur di portal bisa **lengkap / disingkat / "Hamba Allah"** (Admin > Pengaturan). Penyamaran dilakukan di server, bukan hanya di tampilan.

## Keamanan (singkat)
- Password admin ada di Script Properties, tidak pernah di kode frontend/GitHub.
- Token sesi 6 jam, disimpan di CacheService; 5 kali salah password mengunci login 10 menit.
- Operasi tulis memakai `LockService`. Semua teks di-escape di frontend.
- Sheet jangan dibagikan publik: portal hanya membaca lewat Web App yang menyaring kolom.
- Batasan: Apps Script bukan sistem berskala besar; cukup untuk ratusan sampai ribuan baris.
