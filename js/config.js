/**
 * Konfigurasi frontend.
 * Isi API_URL dengan URL Web App Apps Script (berakhiran /exec) setelah deploy.
 * Jika dikosongkan, aplikasi berjalan dalam MODE DEMO (data disimpan di browser,
 * password admin demo: admin123) sehingga bisa dicoba tanpa backend.
 */
window.APP_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwkzCqQ96DsBXtHnA7k86uJc1h-1Ht5727_f963UG-9Mn0PzLq1E_osJJ2htpkY4Z4d_A/exec",
  NAMA_MASJID: "Masjid An-Nuur Kotagede",
  AUTO_REFRESH_MS: 0 // contoh 60000 = muat ulang data portal tiap 1 menit
};
