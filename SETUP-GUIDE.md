# Cerebrum SMP — Setup Guide

Project ini punya 3 komponen utama:
1. **Frontend** (HTML/JS statis) — deploy di Vercel
2. **Firebase** — Auth + Firestore (database user)
3. **Cloud Functions** — webhook Saweria untuk auto-aktivasi premium

---

## 1. Setup Firebase

### 1.1. Buat Project
- Buka https://console.firebase.google.com → **Add project** → nama: `cerebrum-smp`
- Google Analytics: boleh skip

### 1.2. Aktifkan Google Auth
- **Authentication** → **Sign-in method** → **Google** → Enable
- Support email: email kamu → **Save**
- **Settings** → **Authorized domains** → tambahkan domain Vercel kamu

### 1.3. Aktifkan Firestore
- **Firestore Database** → **Create database** → Production mode
- Region: `asia-southeast1` (Jakarta)

### 1.4. Deploy Firestore Rules
- **Firestore** → tab **Rules** → paste isi `firestore.rules` → **Publish**

### 1.5. Ambil Firebase Config
- **Project settings** → **Your apps** → klik ikon `</>` Web
- Register app → copy `firebaseConfig`
- Paste ke `config.js` bagian `FIREBASE_CONFIG`

---

## 2. Setup Saweria

### 2.1. Daftar & Setup Profile
- Daftar di https://saweria.co
- Lengkapi profile: username, avatar, bio
- Setup rekening pencairan

### 2.2. Ambil Stream Key (PENTING!)
- Dashboard Saweria → **Integrasi** → **Donation Widget / Stream Key**
- Copy Stream Key (format UUID) — JANGAN share ke siapapun

### 2.3. Update `config.js`
```javascript
const SAWERIA_CONFIG = {
  username: "cerebrumsmp", // ganti dengan username kamu
  premiumAmount: 29000,
  instructionMessage: "..."
};
```

---

## 3. Setup Cloud Functions (untuk webhook Saweria)

### 3.1. Upgrade Firebase ke Blaze Plan
- Cloud Functions **wajib** Blaze plan
- Buka https://console.firebase.google.com/project/_/usage/details
- Klik **Upgrade** → pilih **Blaze (Pay as you go)**
- **JANGAN KHAWATIR**: Ada free tier generous (2 juta request/bulan gratis). Untuk traffic kamu, tetap Rp 0.
- Set budget alert: Rp 10.000/bulan untuk jaga-jaga

### 3.2. Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 3.3. Install Dependencies Cloud Function
```bash
cd functions
npm install
cd ..
```

### 3.4. Set Secret (Stream Key Saweria)
```bash
firebase functions:secrets:set SAWERIA_STREAM_KEY
# Paste Stream Key kamu saat diminta
```

Set juga ADMIN_SECRET (untuk endpoint manual activation):
```bash
firebase functions:secrets:set ADMIN_SECRET
# Paste random string (simpan baik-baik)
```

### 3.5. Deploy Cloud Functions
```bash
firebase deploy --only functions
```

Setelah deploy, kamu akan dapat URL seperti:
```
https://saweriawebhook-xxxxx-uc.a.run.app
```

### 3.6. Pasang URL Webhook di Saweria
- Dashboard Saweria → **Integrasi** → **Webhook URL**
- Paste URL `saweriaWebhook` dari hasil deploy
- **Save**

### 3.7. Deploy Firestore Rules (sekalian)
```bash
firebase deploy --only firestore:rules
```

---

## 4. Deploy Frontend ke Vercel

```bash
git add .
git commit -m "Saweria integration"
git push
```

Vercel auto-deploy. Lalu:
- Tambahkan domain Vercel ke **Firebase Auth → Authorized domains**

---

## 5. Testing Alur Premium

### Skenario Normal:
1. User login ke Cerebrum → jadi free user (2 kunci/hari)
2. User klik **"Dukung Cerebrum"** → popup muncul
3. Di popup, email user ditampilkan (misal `alif@gmail.com`)
4. User klik **"Buka Saweria"** → tab baru ke `saweria.co/cerebrumsmp`
5. User donasi Rp 29.000, **wajib tulis email di pesan** (misal: "alif@gmail.com")
6. Saweria kirim webhook ke Cloud Function
7. Cloud Function cek: signature valid? amount ≥ Rp 29.000? email match user?
8. Jika semua ok → update Firestore `premium: true`, `keys: 999`
9. Frontend polling setiap 10 detik → detect perubahan → aktifkan premium
10. User dapat notifikasi: "🎉 Premium aktif!"

### Kalau Webhook Gagal / User Lupa Tulis Email:
- Donasi akan masuk ke collection `unmatched_donations` di Firestore
- Kamu (admin) bisa aktivasi manual via:
  - Firebase Console → Firestore → edit manual
  - Atau panggil endpoint `activatePremiumManual`

### Aktivasi Manual via cURL:
```bash
curl -X POST https://activatepremiummanual-xxx-uc.a.run.app \
  -H "Content-Type: application/json" \
  -d '{"email":"alif@gmail.com","adminSecret":"YOUR_ADMIN_SECRET"}'
```

---

## 6. Monitor Donasi & Report

Di Firebase Console → Firestore Database:

| Collection | Isinya |
|------------|--------|
| `users` | Data semua user + status premium |
| `reports` | Laporan soal yang salah dari siswa |
| `transactions` | Record donasi yang sudah diproses |
| `donations` | Donasi kecil (< Rp 29.000, tidak dapat premium) |
| `unmatched_donations` | Donasi yang gagal di-match ke user (manual review) |
| `donation_intents` | Log user yang klik "Buka Saweria" (untuk tracing) |

---

## 7. Troubleshooting

**Problem:** Webhook Saweria tidak masuk
- Cek Firebase Functions logs: `firebase functions:log`
- Pastikan Stream Key di-set dengan benar
- Test webhook dulu di Saweria Dashboard → **Integrasi** → **Test Webhook**

**Problem:** Signature invalid
- Stream Key salah di-set. Re-set dengan: `firebase functions:secrets:set SAWERIA_STREAM_KEY`
- Deploy ulang: `firebase deploy --only functions`

**Problem:** User tidak jadi premium padahal sudah bayar
- Cek collection `unmatched_donations` — mungkin email tidak match
- Aktivasi manual via endpoint `activatePremiumManual`

**Problem:** Premium aktif tapi UI masih free
- User belum refresh. Polling otomatis berjalan 10 detik sekali saat popup terbuka.
- Atau suruh user klik tombol "Cek status" di popup

---

## 8. Biaya

| Service | Free Tier | Estimasi untuk Cerebrum |
|---------|-----------|------------------------|
| Firebase Auth | 10k login/bulan gratis | Rp 0 |
| Firestore | 50k read + 20k write /hari gratis | Rp 0 |
| Cloud Functions (Blaze) | 2M invocation/bulan gratis | Rp 0 (untuk webhook, paling cuma puluhan per hari) |
| Saweria | Fee 5% per donasi | Rp 1.450 per Rp 29.000 |
| Vercel | Hobby plan gratis | Rp 0 |

**Total estimasi**: Rp 0/bulan sampai traffic besar.
