# 🕵️ Pasal Noir — Detektif Konstitusi

[![Check](https://github.com/pumatiri/pasal-noir/actions/workflows/check.yml/badge.svg)](https://github.com/pumatiri/pasal-noir/actions/workflows/check.yml)
![Platform](https://img.shields.io/badge/platform-Google%20Apps%20Script-4285F4)
![License](https://img.shields.io/badge/license-MIT-green)

**Pecahkan kasus, temukan pasalnya.** Game edukasi PKN untuk siswa SMP berbasis web. Pemain menjadi *Detektif Konstitusi* yang menyelidiki kasus pelanggaran hak dan kewajiban warga negara di lingkungan sekolah, lalu mencocokkannya dengan pasal UUD 1945 dan nilai Pancasila yang tepat.

Berjalan sepenuhnya di **Google Apps Script + Google Sheets**. Tidak perlu server, hosting, atau biaya.

> Ganti `USERNAME` pada badge di atas dengan nama akun GitHub Anda setelah repositori dibuat.

## ✨ Fitur

- 6 kasus siap main: 2 Mudah, 2 Sedang, 2 Sulit (32 soal, 32 petunjuk)
- Alur kasus: laporan kejadian → papan bukti (gratis & berbayar) → soal → analisis pasal → hasil
- Pangkat, XP, bintang, papan peringkat per kelas, riwayat profil
- Login dan register (avatar, kode kelas opsional), ganti password
- **Panel admin**: ringkasan, soal yang paling sering salah, kelola siswa, aktif/draft kasus, hasil + unduh CSV, pengumuman
- Mode **terang/gelap**, dialog kustom, layar penuh, efek suara, animasi, responsif untuk ponsel
- Kasus baru cukup ditambah lewat Google Sheet, tanpa mengubah kode

### Keamanan
- Kunci jawaban tidak dikirim ke browser sebelum soal dijawab, dan skor dihitung di server
- Password disimpan sebagai hash SHA-256 + salt, sesi memakai token acak (6 jam)
- 5 kali salah login membuat akun terkunci 5 menit

## 📁 Struktur repositori

```
pasal-noir/
├── src/
│   ├── Code.gs          # Backend Web App (auth, kasus, skor, admin)
│   ├── Setup.gs         # setup(): membuat sheet, admin, dan 6 kasus contoh
│   ├── Index.html       # Seluruh antarmuka (HTML + Tailwind CDN + JS)
│   └── appsscript.json  # Manifest Apps Script
├── docs/PANDUAN.md      # Struktur kolom Sheet, daftar kasus, catatan
├── scripts/check.js     # Pemeriksaan sintaks & validasi data contoh
├── .github/workflows/   # CI sederhana (npm test)
├── .clasp.json.example  # Contoh konfigurasi clasp
└── package.json
```

## 🚀 Cara memasang

### Opsi A — Salin manual (paling mudah)
1. Buat **Google Sheet** kosong, lalu buka **Extensions → Apps Script**.
2. Salin isi `src/Code.gs` ke `Code.gs`. Buat file script **`Setup.gs`** dan salin isi `src/Setup.gs`.
3. Buat file **HTML** bernama persis **`Index`** dan salin isi `src/Index.html`.
4. (Opsional) Buka *Project Settings → Show "appsscript.json"* dan samakan dengan `src/appsscript.json`.
5. Pilih fungsi **`setup`** lalu **Run** dan beri izin.
6. **Deploy → New deployment → Web app**. Isi *Execute as: Me* dan *Who has access: Anyone*.
7. Buka URL Web App. Login admin pertama: **`admin` / `admin123`**. **Segera ganti password.**

### Opsi B — Memakai [clasp](https://github.com/google/clasp)
```bash
npm install
npx clasp login
# Buat Google Sheet, buka Extensions → Apps Script, salin Script ID dari Project Settings
cp .clasp.json.example .clasp.json     # lalu isi scriptId
npm run push
```
Jalankan `setup` sekali dari editor Apps Script, lalu **Deploy → New deployment → Web app**.
Pembaruan berikutnya: `npm run push`, lalu buat **New version** pada deployment yang sama.

## 🧩 Menambah atau mengubah kasus
Edit langsung di Google Sheet (sheet `Kasus`, `Petunjuk`, `Pertanyaan`) dengan `CaseID` yang sama. Penjelasan lengkap tiap kolom ada di [docs/PANDUAN.md](docs/PANDUAN.md).

Sudah pernah menjalankan `setup()` dari versi lama? Jalankan **`tambahKasusContoh`** untuk menambahkan kasus contoh yang belum ada tanpa menyentuh data lama.

## 🧪 Pengembangan
```bash
npm test      # periksa sintaks dan validasi data contoh (tanpa dependensi)
```

## ⚠️ Catatan penting
- Ganti password admin bawaan (`admin123`) sebelum dipakai siswa.
- Bunyi pasal pada kasus contoh sebaiknya diverifikasi guru PKN sebelum dipakai di kelas.
- Layar penuh bisa diblokir di dalam bingkai Apps Script. Buka URL Web App di tab sendiri atau tekan F11.
- Jangan commit `.clasp.json` (sudah masuk `.gitignore`). Jika Anda mengisi `SPREADSHEET_ID` di `Code.gs`, jangan publikasikan ID Sheet yang berisi data siswa.

## 📄 Lisensi
[MIT](LICENSE)
