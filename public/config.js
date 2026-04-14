// ============================================
// CEREBRUM SMP — KONFIGURASI
// ============================================

// ===== GOOGLE SHEETS =====
const SHEET_ID = "199AW9SehEXcE8aOanmm5jMe77igMNLr7g3ELisGfgJU";
const SHEET_NAMES = {
  lessons: "Lessons",
  steps: "Steps",
};

// ===== FIREBASE =====
// Cara setup:
// 1. Buka https://console.firebase.google.com
// 2. Buat project baru (atau gunakan yang sudah ada)
// 3. Aktifkan Authentication → Sign-in method → Google
// 4. Aktifkan Firestore Database (mode production)
// 5. Copy config dari Project Settings → Your apps → Web app
// 6. Pastikan domain kamu ditambahkan di Authentication → Settings → Authorized domains
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA4JbVbG6U7XNW07AbxhTc0qhwb2N-n6NI",
  authDomain: "cerebrum-smp.firebaseapp.com",
  projectId: "cerebrum-smp",
  storageBucket: "cerebrum-smp.firebasestorage.app",
  messagingSenderId: "1000302633412",
  appId: "1:1000302633412:web:87e426e5a46c52664c0491",
  measurementId: "G-X8R05VGESL"
};

// ===== SAWERIA (DONASI / PREMIUM) =====
// Ganti 'YOUR_USERNAME' dengan username Saweria kamu
// Contoh: kalau link Saweria-mu https://saweria.co/cerebrumsmp,
// maka username = "cerebrumsmp"
const SAWERIA_CONFIG = {
  username: "aliftowew",
  // Harga minimal donasi untuk dapat premium (dalam Rupiah)
  premiumAmount: 49000,
  // Pesan yang ditampilkan sebagai panduan ke user
  instructionMessage: "Donasi minimal Rp 49.000 dan tulis EMAIL kamu di pesan Saweria untuk aktivasi Premium otomatis."
};
