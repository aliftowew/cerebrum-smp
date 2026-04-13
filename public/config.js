// ============================================
// CEREBRUM SMP — KONFIGURASI
// ============================================
// Ganti SHEET_ID dengan ID Google Sheet kamu.
//
// Cara mendapatkan ID:
// 1. Buka Google Sheet kamu
// 2. Lihat URL-nya: https://docs.google.com/spreadsheets/d/XXXXX/edit
// 3. Copy bagian XXXXX — itu adalah SHEET_ID
//
// Pastikan Google Sheet sudah di-publish:
// File → Share → Publish to web → Publish (pilih "Entire Document" dan "CSV")
// ============================================

const SHEET_ID = "199AW9SehEXcE8aOanmm5jMe77igMNLr7g3ELisGfgJU";

const SHEET_NAMES = {
  lessons: "Lessons",   // Nama sheet yang berisi daftar lesson
  steps: "Steps",       // Nama sheet yang berisi isi setiap lesson
};
